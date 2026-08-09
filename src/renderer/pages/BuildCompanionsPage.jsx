import { useMemo, useState } from 'react'
import { useApp } from '../App'
import companionCatalog from '../../../resources/data/eso-companions.json'
import { presetToBuildCompanion } from '../utils/companionLogic'

const ROLE_OPTIONS = ['tank', 'healer', 'damage', 'support', 'hybrid']
const splitLines = value => String(value || '').split(/\r?\n/).map(row => row.trim()).filter(Boolean)
const joinLines = value => (Array.isArray(value) ? value : []).join('\n')
const slug = value => String(value || 'companion-setup').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'companion_setup'
function uniqueId(rows, seed) { const used = new Set(rows.map(row => row.id)); const base = slug(seed); let id = base; let n = 2; while (used.has(id)) id = `${base}_${n++}`; return id }

function emptyPage() {
  return <div className="page"><div className="page-title"><span className="eyebrow">Current build</span><h1>Companions</h1><p>Open or create a draft before editing this section.</p></div><section className="panel quiet-box">No editable build is currently open.</section></div>
}

function CompanionSetupEditor({ entry, index, count, onPatch, onDelete, onDuplicate }) {
  return <article className="panel companion-editor-card">
    <header><div><span className="eyebrow">Build companion setup {index + 1}</span><h2>{entry.name || 'Unnamed Companion Setup'}</h2></div><div className="button-row"><button type="button" className="btn ghost compact" onClick={onDuplicate}>Duplicate</button><button type="button" className="btn danger compact" onClick={onDelete}>Delete</button></div></header>
    <div className="form-grid three companion-editor-fields">
      <label><span>Companion</span><select value={entry.companion_id || ''} onChange={event => onPatch({ companion_id: event.target.value, companion_name: companionCatalog.companions.find(row => row.id === event.target.value)?.name || '' })}><option value="">Choose companion</option>{companionCatalog.companions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label><span>Role</span><select value={entry.role || 'hybrid'} onChange={event => onPatch({ role: event.target.value })}>{ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
      <label><span>Permanent setup ID</span><input className="mono" value={entry.id || ''} onChange={event => onPatch({ id: slug(event.target.value) })} /></label>
      <label className="form-span-two"><span>Display name</span><input value={entry.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label>
      <label><span>Preset source ID</span><input className="mono" value={entry.preset_id || ''} onChange={event => onPatch({ preset_id: event.target.value })} placeholder="Optional" /></label>
      <label className="form-span-three"><span>Summary</span><textarea rows="2" value={entry.summary || ''} onChange={event => onPatch({ summary: event.target.value })} /></label>
      <label><span>Weapon</span><input value={entry.weapon || ''} onChange={event => onPatch({ weapon: event.target.value })} /></label>
      <label><span>Armor weight</span><input value={entry.armor_weight || ''} onChange={event => onPatch({ armor_weight: event.target.value })} /></label>
      <label><span>Ultimate</span><input value={entry.ultimate || ''} onChange={event => onPatch({ ultimate: event.target.value })} /></label>
      <label><span>Weapon trait</span><input value={entry.weapon_trait || ''} onChange={event => onPatch({ weapon_trait: event.target.value })} /></label>
      <label><span>Armor trait</span><input value={entry.armor_trait || ''} onChange={event => onPatch({ armor_trait: event.target.value })} /></label>
      <label><span>Jewelry trait</span><input value={entry.jewelry_trait || ''} onChange={event => onPatch({ jewelry_trait: event.target.value })} /></label>
      <label className="form-span-three"><span>Skill priority - one skill per line, top to bottom</span><textarea rows="6" value={joinLines(entry.skills)} onChange={event => onPatch({ skills: splitLines(event.target.value) })} /></label>
      <label className="form-span-three"><span>Equipment notes - one line each</span><textarea rows="3" value={joinLines(entry.equipment)} onChange={event => onPatch({ equipment: splitLines(event.target.value) })} /></label>
      <label className="form-span-three"><span>Build notes - one line each</span><textarea rows="3" value={joinLines(entry.notes)} onChange={event => onPatch({ notes: splitLines(event.target.value) })} /></label>
      <label className="form-span-three"><span>Source URL</span><input value={entry.source_url || ''} onChange={event => onPatch({ source_url: event.target.value })} placeholder="Optional research/build source" /></label>
    </div>
    <small className="setting-footnote">Companion skill names stay plain text by design. They do not belong in the player skill catalog or player Unlock Plan.</small>
  </article>
}

export default function BuildCompanionsPage() {
  const { editor } = useApp()
  const [filter, setFilter] = useState('all')
  const draft = editor.draft
  const visible = useMemo(() => companionCatalog.companions.filter(companion => filter === 'all' || companion.strengths.includes(filter)), [filter])
  if (!draft) return emptyPage()
  const data = draft.data
  const entries = Array.isArray(data.companions) ? data.companions : []
  const update = updater => editor.updateDraft(updater)
  const patchEntry = (index, patch) => update(current => ({ ...current, companions: (current.companions || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))
  const addPreset = (companion, preset) => update(current => {
    const rows = [...(current.companions || [])]
    const next = presetToBuildCompanion(companion, preset)
    const existing = rows.findIndex(row => row.id === next.id)
    if (existing >= 0) rows[existing] = next
    else rows.push(next)
    return { ...current, companions: rows }
  })
  const addCustom = () => update(current => {
    const rows = current.companions || []
    const first = companionCatalog.companions[0]
    const id = uniqueId(rows, `${first.id}_custom`)
    return { ...current, companions: [...rows, { id, companion_id: first.id, companion_name: first.name, name: `${first.short_name} - Custom`, role: 'hybrid', summary: '', weapon: '', armor_weight: '', weapon_trait: '', armor_trait: '', jewelry_trait: '', skills: [], ultimate: '', equipment: [], notes: [] }] }
  })

  return <div className="page build-editor-form-page build-companions-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Companions</h1><p>Add a companion target to the player build, start from one of ATTB's sixteen current presets, or author a custom setup. Companion skills stay separate from player skill lines, Skill Points, morphs, and Unlock Plan references.</p></div>

    <section className="panel companion-editor-intro"><div><span className="eyebrow">ESO companion model</span><h2>One bar, priority order, separate gear</h2><p>Companions use cooldown-based priority from slot 1 through slot 5. Their skills unlock automatically, have no morphs, and their gear has companion-only traits with no player-style item sets or enchantments.</p></div><div className="schema-badges"><span>Schema 4 compatible</span><span>{entries.length} build setup{entries.length === 1 ? '' : 's'}</span></div></section>

    <section className="section-block"><div className="section-head"><div><span className="eyebrow">Preset library</span><h2>Two strong identities per companion</h2><p>These are editable starting points researched for the current companion roster. Adding a preset copies ordinary data into this build; it does not create a hidden dependency on ATTB's preset library.</p></div><button type="button" className="btn secondary" onClick={addCustom}>+ Custom Companion Setup</button></div>
      <div className="companion-filter-row">{['all', 'tank', 'healer', 'damage', 'support'].map(role => <button type="button" key={role} className={filter === role ? 'active' : ''} onClick={() => setFilter(role)}>{role === 'all' ? 'All companions' : role}</button>)}</div>
      <div className="companion-preset-library">{visible.map(companion => <article className="panel companion-preset-library-card" key={companion.id}><header><div><small>{companion.race} · {companion.class}</small><h3>{companion.name}</h3></div><span>{companion.strengths.join(' · ')}</span></header>{companion.builds.map(preset => { const included = entries.some(entry => entry.id === preset.id); return <div className="preset-library-row" key={preset.id}><div><b>{preset.name}</b><small>{preset.role} · {preset.weapon} · {preset.armor_weight}</small><p>{preset.summary}</p></div><button type="button" className={included ? 'btn ghost compact' : 'btn secondary compact'} onClick={() => addPreset(companion, preset)}>{included ? 'Reset to preset' : '+ Add to Build'}</button></div> })}</article>)}</div>
    </section>

    <section className="section-block"><div className="section-head"><div><span className="eyebrow">JSON authoring</span><h2>Build companion setups</h2><p>These rows are stored in the root <code>companions</code> array and travel with export/import, loadouts, variants, revisions, and character builds.</p></div><button type="button" className="btn primary" onClick={addCustom}>+ Add Custom</button></div>
      <div className="companion-editor-list">{entries.length ? entries.map((entry, index) => <CompanionSetupEditor key={`${entry.id}-${index}`} entry={entry} index={index} count={entries.length} onPatch={patch => patchEntry(index, patch)} onDuplicate={() => update(current => { const rows = [...(current.companions || [])]; const copy = structuredClone(entry); copy.id = uniqueId(rows, `${entry.id}_copy`); copy.name = `${entry.name} Copy`; rows.splice(index + 1, 0, copy); return { ...current, companions: rows } })} onDelete={() => update(current => ({ ...current, companions: (current.companions || []).filter((_, rowIndex) => rowIndex !== index) }))} />) : <div className="panel quiet-box">No companion setup is part of this build yet. Add a researched preset above or author a custom setup.</div>}</div>
    </section>
  </div>
}
