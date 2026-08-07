import { useMemo } from 'react'
import { useApp } from '../App'
import ChoiceChips from '../components/ChoiceChips'
import { buildEditorGuidance } from '../utils/buildEditorGuidance'

function textValue(value) { return value == null ? '' : String(value) }
function cleanBuildNotes(value) { return String(value || '').replace(/\u0000/g, '').replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 20000) }

export default function BuildOverviewPage() {
  const { editor } = useApp()
  const draft = editor.draft
  const data = draft?.data
  const metadata = data?.metadata || {}
  const imported = data?.extensions?.attb?.imported_character_state || null
  const tags = useMemo(() => Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '', [metadata.tags])

  if (!draft) return <div className="page"><div className="page-title"><span className="eyebrow">Current build</span><h1>Overview</h1><p>Open, fork, import, or create a build before editing it.</p></div><section className="panel quiet-box">No editable build is currently open.</section></div>

  const patch = patch => editor.patchDraft(patch)
  const patchMetadata = patchValue => editor.updateDraft(current => ({ ...current, metadata: { ...(current.metadata || {}), ...patchValue } }))

  return <div className="page build-overview-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Overview</h1><p>Edit the identity and public summary for this user-owned build. Recovery autosave does not create a permanent revision until you choose Save Build.</p></div>

    {imported && <section className="panel imported-build-state"><div><span className="eyebrow">Imported character state</span><h2>{imported.mode === 'adapt' ? 'CURRENT character layered under TARGET build' : 'Draft started from CURRENT ESO state'}</h2><p>{imported.character_name} · Level {imported.level} · {imported.class_name}{imported.world_name ? ` · ${imported.world_name}` : ''}</p><small>{imported.mode === 'adapt' ? `Target preserved from ${imported.source_build_name || 'the selected build'}. Owned/catch-up/future markers show where the character sits against that target.` : 'Future recommendations were intentionally left for you to author rather than being fabricated from the snapshot.'}</small></div><div className="imported-build-state-stats"><span><small>Skill points</small><b>{imported.available_skill_points ?? 0}</b></span><span><small>Attribute points</small><b>{imported.available_attribute_points ?? 0}</b></span><span><small>Snapshot</small><b>{imported.captured_at ? new Date(imported.captured_at * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Imported'}</b></span></div></section>}

    <section className="panel draft-safety-panel"><div><span className="eyebrow">Recovery draft</span><h2>{draft.dirty ? 'Changes are protected locally' : 'Saved build and draft match'}</h2><p>The editor autosaves a crash-recovery copy. Use Save Build when this version is valid and ready to become part of revision history.</p></div><div className="draft-safety-stats"><span><small>Undo steps</small><b>{editor.history.length}</b></span><span><small>Redo steps</small><b>{editor.future.length}</b></span></div></section>

    <section className="panel"><div className="section-head"><div><span className="eyebrow">Identity</span><h2>Build identity</h2></div><small>Schema {data.schema_version}</small></div>
      <div className="form-grid three">
        <label><span>Build name</span><input value={textValue(data.name)} maxLength={120} onChange={event => patch({ name: event.target.value })} /></label>
        <label><span>Short name</span><input value={textValue(data.short_name)} maxLength={60} onChange={event => patch({ short_name: event.target.value })} /></label>
        <label><span>Author</span><input value={textValue(data.author)} maxLength={80} onChange={event => patch({ author: event.target.value })} /></label>
        <label className="form-span-three"><span>Permanent build ID</span><input className="mono" value={data.id} readOnly /><small>The ID is locked after creation so characters, forks, drafts, and revisions keep a stable reference.</small></label>
      </div>
    </section>

    <section className="panel"><div className="section-head"><div><span className="eyebrow">Description</span><h2>What this build is for</h2></div></div>
      <div className="form-grid">
        <label className="form-span-two"><span>Summary</span><textarea rows="5" value={textValue(data.summary)} onChange={event => patch({ summary: event.target.value })} placeholder="Explain the build's role, resource, content, and intended player." /></label>
        <label><span>Game version</span><input value={textValue(data.game_version)} maxLength={80} onChange={event => patch({ game_version: event.target.value })} /></label>
        <label><span>Verified date</span><input type="date" value={textValue(data.verified_date)} onChange={event => patch({ verified_date: event.target.value })} /></label>
        <label className="form-span-two"><span>Tags</span><input value={tags} onChange={event => patchMetadata({ tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="flexible-pve, beginner, two-bar" /><small>Comma-separated discovery labels. Roles, audience, and content use the structured fields below.</small></label>
      </div>
    </section>

    <section className="panel"><div className="section-head"><div><span className="eyebrow">Long-form guidance</span><h2>Build notes</h2></div><small>{textValue(data.notes).length.toLocaleString()} / 20,000</small></div>
      <label className="build-notes-editor"><span>Author notes</span><textarea rows="10" value={textValue(data.notes)} onChange={event => patch({ notes: cleanBuildNotes(event.target.value) })} placeholder="Add deeper mechanics, planned changes, farming reminders, caveats, or anything else that does not fit the structured build fields." /><small>Plain text is stored in the build JSON and travels with exports, forks, revisions, and adaptations. Quotes and line breaks are safely serialized by ATTB.</small></label>
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Discovery and audience</span><h2>Where this build belongs</h2></div><small>These labels power library filters and help players understand the intended use.</small></div>
      <div className="guided-question"><span>Roles</span><ChoiceChips name="Build roles" values={metadata.roles || []} options={Object.entries(buildEditorGuidance.roles).map(([value, row]) => ({ value, label: row.label }))} onChange={roles => patchMetadata({ roles })} /></div>
      <div className="guided-question"><span>Difficulty</span><ChoiceChips name="Difficulty" values={metadata.difficulty || []} options={buildEditorGuidance.difficulty_options} onChange={difficulty => patchMetadata({ difficulty })} /></div>
      <div className="guided-question"><span>Platforms</span><ChoiceChips name="Platforms" values={metadata.platforms || []} options={buildEditorGuidance.platform_options} onChange={platforms => patchMetadata({ platforms })} /></div>
      <div className="form-grid two"><label><span>Language</span><input value={textValue(metadata.language || 'en')} maxLength={20} onChange={event => patchMetadata({ language: event.target.value })} /></label><label><span>Playstyle labels</span><input value={(metadata.playstyles || []).join(', ')} onChange={event => patchMetadata({ playstyles: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="progression, flexible-pve" /></label></div>
    </section>
  </div>
}
