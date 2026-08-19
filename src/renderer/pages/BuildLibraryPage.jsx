import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'

function kindLabel(build) {
  if (build.is_bundled) return 'Bundled · Read-only'
  if (build.origin_type === 'fork') return 'Fork · Editable'
  if (build.origin_type === 'created') return 'Created · Editable'
  return 'Imported · Editable'
}

function BuildCard({ build, appSettings, busyId, onOpen, onFork, onExport, onDuplicate, onDelete }) {
  const editable = !build.is_bundled
  return <article className={`panel build-library-card v3-build-library-card ${editable ? 'editable' : 'bundled'}`}>
    <div className="build-library-card-head">
      <span className={`build-kind ${build.is_bundled ? 'bundled' : 'editable'}`}>{kindLabel(build)}</span>
      <div className="build-library-card-flags">{build.has_draft && <span className="draft-badge">Recovery draft</span>}{build.last_saved_revision > 0 && <span>Rev {build.last_saved_revision}</span>}</div>
    </div>
    <div className="build-library-card-copy"><h2>{build.name}</h2><p>{build.description || `${build.class_name || 'ESO'} build stored in ATTB.`}</p></div>
    <div className="build-library-quick-facts"><span><small>Class</small><b>{build.class_name || 'Not specified'}</b></span><span><small>Game version</small><b>{build.game_version || 'Not specified'}</b></span><span><small>Verified</small><b>{build.verified_date || 'Not reviewed'}</b></span></div>
    <div className="button-row build-library-card-actions">
      {build.is_bundled ? <button type="button" className="btn primary" disabled={busyId === build.id} onClick={() => onFork(build)}>Fork Build</button> : <button type="button" className="btn primary" disabled={busyId === build.id} onClick={() => onOpen(build)}>{build.has_draft ? 'Resume Editing' : 'Edit Build'}</button>}
      <button type="button" className="btn secondary" disabled={busyId === build.id} onClick={() => onExport(build)}>Export JSON</button>
      {editable && <button type="button" className="btn ghost" disabled={busyId === build.id} onClick={() => onDuplicate(build)}>Duplicate</button>}
      {editable && <button type="button" className="btn ghost danger-text" disabled={busyId === build.id} onClick={() => onDelete(build)}>Delete</button>}
    </div>
    <details className="build-library-technical-details"><summary>Technical details</summary><dl><dt>Author</dt><dd>{build.author || appSettings.build_editor_default_author || 'NPC'}</dd><dt>Build ID</dt><dd className="mono">{build.id}</dd><dt>Schema</dt><dd>{build.schema_version}</dd><dt>JSON mirror</dt><dd title={build.build_file_sync_error || build.build_file_path || ''}>{build.build_file_sync_error ? 'Sync pending' : build.build_file_path ? 'Synced' : 'Not created yet'}</dd>{build.forked_from_build_id && <><dt>Forked from</dt><dd className="mono">{build.forked_from_build_id}</dd></>}</dl></details>
  </article>
}

export default function BuildLibraryPage() {
  const { builds, reloadBuilds, appSettings, editor } = useApp()
  const navigate = useNavigate()
  const dialog = useAppDialog()
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const editableBuilds = useMemo(() => builds.filter(build => !build.is_bundled), [builds])
  const bundledBuilds = useMemo(() => builds.filter(build => build.is_bundled), [builds])
  const counts = useMemo(() => ({ bundled: bundledBuilds.length, userOwned: editableBuilds.length, drafts: builds.filter(build => build.has_draft).length }), [builds, bundledBuilds.length, editableBuilds.length])
  const run = async (id, task) => { setBusyId(id); setNotice(''); try { await task() } catch (error) { setNotice(error.message || 'That build action failed.') } finally { setBusyId('') } }
  const openBuild = build => run(build.id, async () => { await editor.openDraft(build.id); navigate('/build-editor/overview') })
  const fork = async build => {
    const isBundled = Boolean(build.is_bundled)
    const name = await dialog.prompt({ eyebrow: isBundled ? 'Protected bundled build' : 'Editable build', title: isBundled ? 'Fork this build' : 'Duplicate this build', message: isBundled ? 'ATTB will create a new editable copy. The bundled original remains protected and unchanged.' : 'ATTB will create a separate editable copy with its own permanent ID, draft, and revision history.', label: isBundled ? 'Fork name' : 'Copy name', defaultValue: `${build.name}${isBundled ? ' Fork' : ' Copy'}`, confirmLabel: isBundled ? 'Create Fork' : 'Duplicate Build', required: true, requiredMessage: 'Enter a name for the editable copy.', maxLength: 120 })
    if (name === null) return
    run(build.id, async () => { await editor.forkBuild(build.id, name); navigate('/build-editor/overview') })
  }
  const remove = async build => {
    const approved = await dialog.confirm({ eyebrow: 'Delete editable build', title: `Delete ${build.name}?`, message: 'Saved revisions and the recovery draft for this build will also be removed. This cannot be undone.', confirmLabel: 'Delete Build', danger: true })
    if (!approved) return
    run(build.id, async () => { if (editor.draft?.build_id === build.id) await editor.closeDraft(); const result = await window.api.builds.delete(build.id); await reloadBuilds(); setNotice(result.file_cleanup?.preserved ? `${build.name} deleted from ATTB. Its JSON file was preserved: ${result.file_cleanup.reason}` : `${build.name} deleted.`) })
  }
  const exportBuild = build => run(build.id, () => window.api.builds.exportById(build.id))
  const sharedCardProps = { appSettings, busyId, onOpen: openBuild, onFork: fork, onExport: exportBuild, onDuplicate: fork, onDelete: remove }

  return <div className="page build-library-page v3-build-library-page">
    <div className="page-title"><span className="eyebrow">Build Editor</span><h1>Build Library</h1><p>Your editable work comes first. Bundled ATTB builds stay protected and act as safe starting points when you want a proven foundation.</p></div>
    <section className="panel build-library-command-panel"><div><span className="eyebrow">Build workspace</span><h2>{editor.draft ? `Continue ${editor.draft.data.name}` : 'Start your next build'}</h2><p>{editor.draft ? 'Your recovery draft is already protected. Resume it, or start a separate build without changing the saved version.' : 'Create a guided build, fork a bundled starting point, or import a community Schema 4 file.'}</p></div><div className="build-library-command-actions">{editor.draft && <button type="button" className="btn primary" onClick={() => navigate('/build-editor/overview')}>Resume Current Draft</button>}<button type="button" className={editor.draft ? 'btn secondary' : 'btn primary'} onClick={() => navigate('/build-editor/new')}>Create New Build</button><button type="button" className="btn ghost" onClick={() => navigate('/build-editor/import-export')}>Import / Export</button></div><div className="build-library-count-strip" aria-label="Build library totals"><span><b>{counts.userOwned}</b><small>Editable</small></span><span><b>{counts.drafts}</b><small>Drafts</small></span><span><b>{counts.bundled}</b><small>Bundled</small></span></div></section>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <section className="build-library-section"><div className="section-head"><div><span className="eyebrow">Your work</span><h2>Editable builds</h2><p>Created, imported, and forked builds can be edited directly and keep their own revision history.</p></div><span className="library-section-count">{editableBuilds.length}</span></div>{editableBuilds.length ? <div className="build-library-grid editable-build-grid">{editableBuilds.map(build => <BuildCard key={build.id} build={build} {...sharedCardProps} />)}</div> : <div className="panel build-library-empty"><div><b>No editable builds yet</b><p>Create one from scratch or fork a bundled build below. Nothing in the protected library will be changed.</p></div><button type="button" className="btn primary" onClick={() => navigate('/build-editor/new')}>Create Your First Build</button></div>}</section>
    <section className="build-library-section"><div className="section-head"><div><span className="eyebrow">Protected starting points</span><h2>Bundled ATTB builds</h2><p>Use these as references or fork one when you want a safe editable copy.</p></div><span className="library-section-count">{bundledBuilds.length}</span></div><div className="build-library-grid bundled-build-grid">{bundledBuilds.map(build => <BuildCard key={build.id} build={build} {...sharedCardProps} />)}{!bundledBuilds.length && <section className="panel quiet-box">The bundled build library is unavailable.</section>}</div></section>
  </div>
}
