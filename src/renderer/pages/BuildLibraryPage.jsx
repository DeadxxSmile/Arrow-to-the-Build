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

export default function BuildLibraryPage() {
  const { builds, reloadBuilds, appSettings, editor } = useApp()
  const navigate = useNavigate()
  const dialog = useAppDialog()
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const counts = useMemo(() => ({
    bundled: builds.filter(build => build.is_bundled).length,
    userOwned: builds.filter(build => !build.is_bundled).length,
    drafts: builds.filter(build => build.has_draft).length
  }), [builds])

  const run = async (id, task) => {
    setBusyId(id)
    setNotice('')
    try { await task() }
    catch (error) { setNotice(error.message || 'That build action failed.') }
    finally { setBusyId('') }
  }

  const openBuild = build => run(build.id, async () => {
    await editor.openDraft(build.id)
    navigate('/build-editor/overview')
  })

  const fork = async build => {
    const isBundled = Boolean(build.is_bundled)
    const suggested = `${build.name}${isBundled ? ' Fork' : ' Copy'}`
    const name = await dialog.prompt({
      eyebrow: isBundled ? 'Protected bundled build' : 'Editable build',
      title: isBundled ? 'Fork this build' : 'Duplicate this build',
      message: isBundled
        ? 'ATTB will create a new editable copy. The bundled original remains protected and unchanged.'
        : 'ATTB will create a separate editable copy with its own permanent ID, draft, and revision history.',
      label: isBundled ? 'Fork name' : 'Copy name',
      defaultValue: suggested,
      confirmLabel: isBundled ? 'Create Fork' : 'Duplicate Build',
      required: true,
      requiredMessage: 'Enter a name for the editable copy.',
      maxLength: 120
    })
    if (name === null) return
    run(build.id, async () => {
      await editor.forkBuild(build.id, name)
      navigate('/build-editor/overview')
    })
  }

  const remove = async build => {
    const approved = await dialog.confirm({
      eyebrow: 'Delete editable build',
      title: `Delete ${build.name}?`,
      message: 'Saved revisions and the recovery draft for this build will also be removed. This cannot be undone.',
      confirmLabel: 'Delete Build',
      danger: true
    })
    if (!approved) return
    run(build.id, async () => {
      if (editor.draft?.build_id === build.id) await editor.closeDraft()
      const result = await window.api.builds.delete(build.id)
      await reloadBuilds()
      setNotice(result.file_cleanup?.preserved ? `${build.name} deleted from ATTB. Its JSON file was preserved: ${result.file_cleanup.reason}` : `${build.name} deleted.`)
    })
  }

  return <div className="page build-library-page">
    <div className="page-title"><span className="eyebrow">Build Editor</span><h1>Build Library</h1><p>Bundled ATTB builds are protected. Fork one to customize it, or edit any imported and user-created build directly.</p></div>

    <section className="panel editor-foundation-banner">
      <div><span className="eyebrow">Local build workspace</span><h2>Create safely, keep every version</h2><p>Editable builds use recovery drafts, autosave, undo and redo, immutable revisions, protected forking, and readable JSON mirrors.</p></div>
      <div className="button-row"><button type="button" className="btn primary" onClick={() => navigate('/build-editor/new')}>Create New Build</button>{editor.draft && <button type="button" className="btn secondary" onClick={() => navigate('/build-editor/overview')}>Resume {editor.draft.data.name}</button>}</div>
    </section>

    {notice && <div className="notice-banner" role="status">{notice}</div>}

    <div className="library-summary"><div><small>Bundled builds</small><b>{counts.bundled}</b></div><div><small>Editable builds</small><b>{counts.userOwned}</b></div><div><small>Recovery drafts</small><b>{counts.drafts}</b></div></div>

    <div className="build-library-grid">{builds.map(build => <article className="panel build-library-card" key={build.id}>
      <div className="build-library-card-head"><span className={`build-kind ${build.is_bundled ? 'bundled' : 'editable'}`}>{kindLabel(build)}</span><span>Schema {build.schema_version}</span></div>
      <div><h2>{build.name}</h2><p>{build.description || `${build.class_name || 'ESO'} build stored in ATTB.`}</p></div>
      <div className="build-card-badges">{build.has_draft && <span className="draft-badge">Recovery draft</span>}{build.last_saved_revision > 0 && <span>Revision {build.last_saved_revision}</span>}{build.last_saved_revision > 0 && <span title={build.build_file_sync_error || build.build_file_path || ''}>{build.build_file_sync_error ? 'JSON sync pending' : build.build_file_path ? 'JSON synced' : 'JSON pending'}</span>}{build.forked_from_build_id && <span title={build.forked_from_build_id}>Forked</span>}</div>
      <dl><dt>Class</dt><dd>{build.class_name || 'Not specified'}</dd><dt>Author</dt><dd>{build.author || appSettings.build_editor_default_author || 'NPC'}</dd><dt>Game version</dt><dd>{build.game_version || 'Not specified'}</dd><dt>Build ID</dt><dd className="mono">{build.id}</dd></dl>
      <div className="button-row">
        {build.is_bundled
          ? <button type="button" className="btn primary" disabled={busyId === build.id} onClick={() => fork(build)}>Fork Build</button>
          : <button type="button" className="btn primary" disabled={busyId === build.id} onClick={() => openBuild(build)}>{build.has_draft ? 'Resume Editing' : 'Edit Build'}</button>}
        <button type="button" className="btn secondary" disabled={busyId === build.id} onClick={() => run(build.id, () => window.api.builds.exportById(build.id))}>Export JSON</button>
        {!build.is_bundled && <button type="button" className="btn ghost" disabled={busyId === build.id} onClick={() => fork(build)}>Duplicate</button>}
        {!build.is_bundled && <button type="button" className="btn ghost danger-text" disabled={busyId === build.id} onClick={() => remove(build)}>Delete</button>}
      </div>
    </article>)}{!builds.length && <section className="panel quiet-box">No builds are currently stored. Import a Schema 4 file or restore the bundled library.</section>}</div>
  </div>
}
