import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import BuildPreviewModal from '../components/BuildPreviewModal'
import { compareBuildData, createBuildReview } from '../utils/buildReviewLogic'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'

function IssueGroup({ title, eyebrow, tone, items, onNavigate }) {
  return <section className={`panel review-issue-panel ${tone}`}>
    <div className="section-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><strong className="review-count">{items.length}</strong></div>
    <div className="review-issue-list">{items.map(item => <article key={item.code}>
      <div><b>{item.message}</b>{item.detail && <p>{item.detail}</p>}<small>{item.section}</small></div>
      <button type="button" className="btn secondary compact" onClick={() => onNavigate(item.route)}>Go to section</button>
    </article>)}</div>
  </section>
}

function compatibilityTitle(status) {
  if (status === 'current') return 'Current with bundled catalog'
  if (status === 'blocked') return 'Catalog references need repair'
  return 'Patch review recommended'
}

export default function BuildReviewPage() {
  const { editor, catalog, appSettings } = useApp()
  const dialog = useAppDialog()
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [compareLeft, setCompareLeft] = useState('')
  const [compareRight, setCompareRight] = useState('draft')
  const [comparison, setComparison] = useState(null)
  const [comparisonBusy, setComparisonBusy] = useState(false)
  const data = editor.draft?.data || {}
  const review = useMemo(() => createBuildReview(data, catalog, editor.validation?.errors || []), [data, catalog, editor.validation])
  const getRevision = editor.getRevision
  const validateDraft = editor.validateDraft

  useEffect(() => {
    if (!editor.draft || editor.validation) return undefined
    const timer = setTimeout(() => validateDraft().catch(() => {}), 150)
    return () => clearTimeout(timer)
  }, [editor.draft, editor.validation, validateDraft])

  useEffect(() => {
    if (!compareLeft && editor.revisions.length) setCompareLeft(String(editor.revisions[0].revision_number))
  }, [compareLeft, editor.revisions])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!compareLeft || !compareRight) { setComparison(null); return }
      setComparisonBusy(true)
      try {
        const getData = async selection => selection === 'draft' ? data : (await getRevision(Number(selection)))?.data
        const [left, right] = await Promise.all([getData(compareLeft), getData(compareRight)])
        if (!cancelled) setComparison(left && right ? compareBuildData(left, right) : null)
      } catch (error) {
        if (!cancelled) setNotice(`Revision comparison failed: ${error.message}`)
      } finally { if (!cancelled) setComparisonBusy(false) }
    }
    load()
    return () => { cancelled = true }
  }, [compareLeft, compareRight, data, getRevision])

  if (!editor.draft) return <BuildEditorEmptyState title="Review & Save" description="Open or create a draft before reviewing it." />

  const validate = async () => {
    const result = await editor.validateDraft()
    setNotice(result.valid ? 'Schema and runtime validation passed. Review warnings and suggestions before saving.' : `${result.errors.length} blocking validation error${result.errors.length === 1 ? '' : 's'} found.`)
  }
  const save = async () => {
    setBusy(true); setNotice('')
    try {
      const result = await editor.saveBuild(note)
      setNote('')
      setNotice(result.file_sync?.ok === false ? `Saved revision ${result.revision_number} inside ATTB. JSON sync pending: ${result.file_sync.error}` : `Saved revision ${result.revision_number} and synced ${result.file_sync?.path || 'the user build JSON file'}.`)
    } catch (error) { setNotice(error.message) }
    finally { setBusy(false) }
  }
  const restore = async revision => {
    const approved = await dialog.confirm({ title: `Restore revision ${revision.revision_number}?`, message: 'The selected revision will be loaded into the recovery draft. The saved revision itself will not be changed.', confirmLabel: 'Restore to Draft' })
    if (!approved) return
    await editor.restoreRevision(revision.revision_number)
    setNotice(`Revision ${revision.revision_number} loaded into the draft. Save Build to create a new revision from it.`)
  }
  const reset = async () => {
    const approved = await dialog.confirm({ title: 'Discard recovery changes?', message: 'The recovery draft will be replaced with the most recently saved build revision.', confirmLabel: 'Discard Changes', danger: true })
    if (!approved) return
    await editor.resetDraft()
    setNotice('Recovery draft reset to the latest saved build.')
  }
  const markReviewed = async () => {
    if (!catalog.game_version) return
    const approved = await dialog.confirm({ title: `Mark reviewed for ${catalog.game_version}?`, message: 'ATTB will update the build game version and verified date. Use this only after you have reviewed the patch-sensitive parts listed on this page.', confirmLabel: 'Mark Reviewed' })
    if (!approved) return
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    editor.patchDraft({ game_version: catalog.game_version, verified_date: localDate })
    setNotice(`Build marked for ${catalog.game_version}. Run validation and save a revision when the review is complete.`)
  }

  const revisionOptions = [{ value: 'draft', label: 'Current recovery draft' }, ...editor.revisions.map(revision => ({ value: String(revision.revision_number), label: `Revision ${revision.revision_number} · ${revision.game_version || 'No game version'}` }))]

  return <div className="page build-review-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Review &amp; Save</h1><p>Find blocking errors, likely mistakes, quality improvements, patch compatibility, and revision changes before creating the next permanent version.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}

    <section className="panel review-status-panel"><div><span className="eyebrow">Build health</span><h2>{editor.validation ? (review.errors.length ? 'Needs attention' : 'Validation passed') : 'Ready for review'}</h2><p>{editor.validation ? `${review.errors.length} error${review.errors.length === 1 ? '' : 's'}, ${review.warnings.length} warning${review.warnings.length === 1 ? '' : 's'}, and ${review.suggestions.length} suggestion${review.suggestions.length === 1 ? '' : 's'}.` : 'Run validation to check the complete Schema 4 object. ATTB also reviews quality and patch-sensitive details below.'}</p></div><div className="button-row"><button className="btn secondary" onClick={validate}>Validate Build</button><button className="btn secondary" onClick={() => setPreviewOpen(true)}>Preview Build</button><button className="btn ghost" disabled={!editor.draft.dirty} onClick={reset}>Discard Recovery Changes</button></div></section>

    <div className="review-summary-grid"><article className="error"><small>Errors</small><b>{review.errors.length}</b><span>Block Save Build</span></article><article className="warning"><small>Warnings</small><b>{review.warnings.length}</b><span>Likely mistakes or stale data</span></article><article className="suggestion"><small>Suggestions</small><b>{review.suggestions.length}</b><span>Quality improvements</span></article></div>

    {review.errors.length > 0 && <IssueGroup title="Blocking errors" eyebrow="Must fix" tone="error" items={review.errors} onNavigate={navigate} />}
    {review.warnings.length > 0 && <IssueGroup title="Warnings" eyebrow="Review carefully" tone="warning" items={review.warnings} onNavigate={navigate} />}
    {review.suggestions.length > 0 && <IssueGroup title="Quality suggestions" eyebrow="Optional improvements" tone="suggestion" items={review.suggestions} onNavigate={navigate} />}
    {!review.errors.length && !review.warnings.length && !review.suggestions.length && <div className="review-clean-state"><span aria-hidden="true">✓</span><div><b>No review issues found</b><p>The summary above is enough for this pass. Continue with patch compatibility or save a revision.</p></div></div>}

    <section className={`panel compatibility-panel ${review.compatibility.status}`}>
      <div className="section-head"><div><span className="eyebrow">Game-update compatibility</span><h2>{compatibilityTitle(review.compatibility.status)}</h2><p>ATTB compares the build metadata and stable catalog references with the exact ESO catalog bundled in this app.</p></div><span className="compatibility-badge">{review.compatibility.status}</span></div>
      <div className="compatibility-grid"><article><small>Build version</small><b>{review.compatibility.buildVersion || 'Not set'}</b></article><article><small>Bundled catalog</small><b>{review.compatibility.catalogVersion || 'Unknown'}</b></article><article><small>Skill references checked</small><b>{review.compatibility.checkedSkillReferences}</b></article><article><small>Skill lines checked</small><b>{review.compatibility.checkedSkillLines}</b></article><article><small>Missing skills</small><b>{review.compatibility.missingSkills.length}</b></article><article><small>Missing lines</small><b>{review.compatibility.missingLines.length}</b></article></div>
      {appSettings.build_editor_compatibility_warnings !== 'false' && review.compatibility.status !== 'current' && <div className="compatibility-note">Review Class Configuration, Skills &amp; Passives, Equipment, Champion Points, Companions, and patch-sensitive notes. ATTB can verify IDs and structure, but it cannot decide whether balance changes make the build strategically current.</div>}
      <div className="button-row"><button className="btn primary" disabled={!catalog.game_version || review.compatibility.missingSkills.length > 0 || review.compatibility.missingLines.length > 0} onClick={markReviewed}>Mark Reviewed for {catalog.game_version || 'Current Update'}</button><button className="btn secondary" onClick={() => navigate('/build-editor/skills')}>Review Skills</button><button className="btn secondary" onClick={() => navigate('/build-editor/equipment')}>Review Equipment</button><button className="btn secondary" onClick={() => navigate('/build-editor/champion-points')}>Review CP</button></div>
    </section>

    <section className="panel revision-compare-panel"><div className="section-head"><div><span className="eyebrow">Revision comparison</span><h2>What changed?</h2><p>Compare any saved revision with another revision or the current recovery draft.</p></div>{comparison && <strong>{comparison.total} change{comparison.total === 1 ? '' : 's'}</strong>}</div>
      {editor.revisions.length ? <><div className="revision-compare-controls"><label><span>Earlier version</span><select value={compareLeft} onChange={event => setCompareLeft(event.target.value)}>{revisionOptions.map(option => <option key={`left-${option.value}`} value={option.value}>{option.label}</option>)}</select></label><span aria-hidden="true">→</span><label><span>Later version</span><select value={compareRight} onChange={event => setCompareRight(event.target.value)}>{revisionOptions.map(option => <option key={`right-${option.value}`} value={option.value}>{option.label}</option>)}</select></label></div>
        {comparisonBusy ? <div className="quiet-box">Comparing revisions…</div> : comparison?.total ? <><div className="revision-group-summary">{Object.entries(comparison.groups).map(([group, count]) => <span key={group}><b>{count}</b>{group.replaceAll('_', ' ')}</span>)}</div><div className="revision-diff-list">{comparison.changes.slice(0, 120).map((change, index) => <article key={`${change.path}-${index}`}><span className={change.kind}>{change.kind}</span><div><b className="mono">{change.path}</b><p><del>{change.before}</del><ins>{change.after}</ins></p></div></article>)}</div>{comparison.total > 120 && <p className="muted">Showing the first 120 changes.</p>}</> : <div className="quiet-box">These two versions match.</div>}</> : <div className="quiet-box">Save the first permanent revision to enable comparison.</div>}
    </section>

    <section className="panel"><div className="section-head"><div><span className="eyebrow">Permanent history</span><h2>Save Build</h2><p>Autosave protects work in progress. This action validates the draft, creates an immutable revision, and updates the JSON mirror.</p></div><small>{editor.draft.dirty ? 'Unsaved revision changes' : 'No changes since last save'}</small></div>
      <label><span>Revision note</span><textarea rows="3" value={note} onChange={event => setNote(event.target.value)} placeholder="Example: Reviewed for Update 51, changed early ultimate, and revised gear alternatives." /></label>
      <div className="button-row save-build-row"><button className="btn primary" disabled={busy || (!editor.draft.dirty && editor.revisions.length > 0)} onClick={save}>{busy ? 'Saving…' : 'Save Build'}</button><span>Errors block saving. Warnings and suggestions remain visible but do not prevent a deliberate revision.</span></div>
    </section>

    <section className="panel"><div className="section-head"><div><span className="eyebrow">Revision history</span><h2>Saved versions</h2></div><small>{editor.revisions.length} revision{editor.revisions.length === 1 ? '' : 's'}</small></div>
      <div className="revision-list">{editor.revisions.map(revision => <article key={revision.id}><div><b>Revision {revision.revision_number}: {revision.name}</b><small>{revision.game_version || 'No game version'} · {revision.created_at}</small>{revision.note && <p>{revision.note}</p>}</div><div className="button-row"><button className="btn secondary compact" onClick={() => { setCompareLeft(String(revision.revision_number)); setCompareRight('draft'); document.querySelector('.revision-compare-panel')?.scrollIntoView({ behavior: 'smooth' }) }}>Compare to Draft</button><button className="btn secondary compact" onClick={() => restore(revision)}>Restore to Draft</button></div></article>)}{!editor.revisions.length && <div className="quiet-box">No permanent revision exists yet. Your recovery draft is safe, but use Save Build when the starting point is ready.</div>}</div>
    </section>
    {previewOpen && <BuildPreviewModal data={data} catalog={catalog} onClose={() => setPreviewOpen(false)} />}
  </div>
}
