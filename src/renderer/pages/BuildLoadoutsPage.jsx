import { useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import { slugifyEditorId } from '../utils/buildEditorSkillLogic'

const OVERRIDE_SECTIONS = [
  ['summary', 'Summary'], ['defaults', 'Character setup'], ['class_configuration', 'Class configuration'],
  ['unlock_order', 'Skills & passives'], ['phases', 'Leveling plan'], ['gear_stages', 'Equipment'],
  ['cp_plans', 'Champion Points'], ['consumables', 'Consumables'], ['quickslots', 'Quickslots'],
  ['companions', 'Companions'], ['performance', 'Performance targets'], ['tips', 'Tips']
]

function uniqueId(rows, seed) {
  const used = new Set((rows || []).map(row => row?.id))
  const base = slugifyEditorId(seed || 'setup')
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function move(rows, index, direction) {
  const next = [...(rows || [])]
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function list(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
}
function lines(value) {
  return String(value || '').split('\n').map(item => item.trim()).filter(Boolean)
}

function sectionValue(data, key) {
  if (key === 'summary') return data.summary || ''
  return structuredClone(data[key] ?? (['unlock_order', 'phases', 'gear_stages', 'quickslots', 'companions', 'tips'].includes(key) ? [] : {}))
}

function captureSection(data, overrides, key) {
  return { ...(overrides || {}), [key]: sectionValue(data, key) }
}

function clearSection(overrides, key) {
  const next = { ...(overrides || {}) }
  delete next[key]
  return next
}

function OverrideCapture({ data, overrides, onChange, allowSummary = true }) {
  const active = new Set(Object.keys(overrides || {}))
  return <div className="override-capture-editor"><div className="override-section-grid">{OVERRIDE_SECTIONS.map(([key, label]) => {
    const selected = active.has(key)
    return <label key={key} className={selected ? 'active' : ''}><input type="checkbox" checked={selected} onChange={() => onChange(selected ? clearSection(overrides, key) : captureSection(data, overrides, key))} /><span>{label}</span><small>{selected ? 'Captured' : 'Uses base'}</small></label>
  })}</div>
    {active.has('summary') && allowSummary && <label className="override-summary-field"><span>Override summary</span><textarea rows="3" value={overrides.summary || ''} onChange={event => onChange({ ...(overrides || {}), summary: event.target.value })} /></label>}
    {active.has('tips') && <label className="override-summary-field"><span>Replacement tips, one per line</span><textarea rows="4" value={(Array.isArray(overrides.tips) ? overrides.tips : []).join('\n')} onChange={event => onChange({ ...(overrides || {}), tips: lines(event.target.value) })} /></label>}
    {active.size > 0 && <div className="override-capture-actions"><span>Captured sections remain independent when the base build changes.</span><button className="btn compact secondary" onClick={() => { let next = { ...(overrides || {}) }; for (const key of active) next = captureSection(data, next, key); onChange(next) }}>Refresh All from Current Base</button></div>}
  </div>
}

function LoadoutEditor({ data, loadout, index, count, isDefault, onPatch, onMove, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(index === 0)
  const overrideCount = Object.keys(loadout.overrides || {}).length
  return <article className="loadout-editor-card"><button className="loadout-editor-summary" onClick={() => setOpen(value => !value)}><div><span className="eyebrow">Loadout {index + 1}</span><h2>{loadout.name || loadout.id}</h2><p>{loadout.summary || 'No loadout summary.'}</p></div><div><span className="build-kind editable">{overrideCount} override{overrideCount === 1 ? '' : 's'}</span><b>{open ? '−' : '+'}</b></div></button>{open && <div className="loadout-editor-body">
    <div className="phase-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate Loadout</button></div><button className="btn compact danger" disabled={count <= 1} onClick={onDelete}>Delete Loadout</button></div>
    <div className="form-grid four"><label><span>Loadout name</span><input value={loadout.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label><label><span>Permanent ID</span><input className="mono" readOnly value={loadout.id || ''} /></label><label><span>Roles, comma-separated</span><input value={(Array.isArray(loadout.roles) ? loadout.roles : []).join(', ')} onChange={event => onPatch({ roles: list(event.target.value) })} /></label><label><span>Content, comma-separated</span><input value={(Array.isArray(loadout.content) ? loadout.content : []).join(', ')} onChange={event => onPatch({ content: list(event.target.value) })} /></label><label className="form-span-two"><span>Summary</span><textarea rows="2" value={loadout.summary || ''} onChange={event => onPatch({ summary: event.target.value })} /></label><label><span>Conditions, one per line</span><textarea rows="2" value={(Array.isArray(loadout.conditions) ? loadout.conditions : []).join('\n')} onChange={event => onPatch({ conditions: lines(event.target.value) })} /></label><label className="availability-toggle"><span>Availability</span><span className="checkbox-line"><input type="checkbox" disabled={isDefault} checked={loadout.available !== false} onChange={event => onPatch({ available: event.target.checked })} /> {isDefault ? 'Default loadout must remain available' : 'Available to characters'}</span></label>{loadout.available === false && <label className="form-span-four"><span>Unavailable reason</span><input value={loadout.unavailable_reason || ''} onChange={event => onPatch({ unavailable_reason: event.target.value })} /></label>}</div>
    <section className="loadout-overrides-section"><div className="section-head"><div><span className="eyebrow">Configuration differences</span><h3>Sections this loadout owns</h3><p>Capture only the sections that should diverge from the base build. Uncaptured sections continue inheriting future base-build updates.</p></div></div><OverrideCapture data={data} overrides={loadout.overrides || {}} onChange={overrides => onPatch({ overrides })} /></section>
  </div>}</article>
}

function VariantEditor({ data, variant, index, count, loadouts, onPatch, onMove, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(index === 0)
  const overrides = variant.overrides || {}
  const overrideCount = variant.overrides === null ? 0 : Object.keys(overrides).length
  return <article className="variant-editor-card"><button className="loadout-editor-summary" onClick={() => setOpen(value => !value)}><div><span className="eyebrow">Variant {index + 1}</span><h2>{variant.name || variant.id}</h2><p>{variant.summary || 'No variant summary.'}</p></div><div><span className="build-kind editable">{overrideCount} change{overrideCount === 1 ? '' : 's'}</span><b>{open ? '−' : '+'}</b></div></button>{open && <div className="loadout-editor-body">
    <div className="phase-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate Variant</button></div><button className="btn compact danger" disabled={count <= 1} onClick={onDelete}>Delete Variant</button></div>
    <div className="form-grid four"><label><span>Variant name</span><input value={variant.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label><label><span>Permanent ID</span><input className="mono" readOnly value={variant.id || ''} /></label><label className="form-span-two"><span>Summary</span><input value={variant.summary || ''} onChange={event => onPatch({ summary: event.target.value })} /></label><label className="availability-toggle"><span>Availability</span><span className="checkbox-line"><input type="checkbox" checked={variant.available !== false} onChange={event => onPatch({ available: event.target.checked })} /> Available to characters</span></label>{variant.available === false && <label className="form-span-three"><span>Unavailable reason</span><input value={variant.unavailable_reason || ''} onChange={event => onPatch({ unavailable_reason: event.target.value })} /></label>}</div>
    <fieldset className="variant-loadout-scope"><legend>Compatible loadouts</legend><div>{loadouts.map(loadout => { const selected = (Array.isArray(variant.loadout_ids) ? variant.loadout_ids : []).includes(loadout.id); return <label key={loadout.id}><input type="checkbox" checked={selected} onChange={() => onPatch({ loadout_ids: selected ? (Array.isArray(variant.loadout_ids) ? variant.loadout_ids : []).filter(id => id !== loadout.id) : [...(Array.isArray(variant.loadout_ids) ? variant.loadout_ids : []), loadout.id] })} /><span>{loadout.name}</span></label> })}</div><small>Leave all unchecked to make the variant available to every loadout.</small></fieldset>
    <section className="loadout-overrides-section"><div className="section-head"><div><span className="eyebrow">Small alternative</span><h3>Sections this variant changes</h3><p>Variants apply after the selected loadout and are best for smaller swaps such as PvP consumables, defensive bars, or no-DLC gear.</p></div></div><OverrideCapture data={data} overrides={overrides} onChange={next => onPatch({ overrides: Object.keys(next).length ? next : null })} /></section>
  </div>}</article>
}

export default function BuildLoadoutsPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const draft = editor.draft
  if (!draft) return <div className="page"><div className="page-title"><span className="eyebrow">Current build</span><h1>Loadouts &amp; Variants</h1><p>Open or create a draft before editing this section.</p></div><section className="panel quiet-box">No editable build is currently open.</section></div>
  const data = draft.data
  const loadouts = data.loadouts || []
  const variants = data.variants || []
  const update = updater => editor.updateDraft(updater)
  const patchLoadout = (index, patch) => update(current => ({ ...current, loadouts: (current.loadouts || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))
  const patchVariant = (index, patch) => update(current => ({ ...current, variants: (current.variants || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))
  const addLoadout = () => update(current => { const rows = current.loadouts || []; const id = uniqueId(rows, 'new-loadout'); return { ...current, loadouts: [...rows, { id, name: 'New Loadout', summary: 'Describe when this full configuration should be used.', roles: [], content: [], available: true, conditions: [], overrides: {} }], default_loadout_id: current.default_loadout_id || id } })
  const addVariant = () => update(current => { const rows = current.variants || []; const id = uniqueId(rows, 'new-variant'); return { ...current, variants: [...rows, { id, name: 'New Variant', summary: 'Describe the smaller alternative this variant provides.', available: true, overrides: null, loadout_ids: current.default_loadout_id ? [current.default_loadout_id] : [] }] } })

  return <div className="page build-editor-form-page build-loadouts-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Loadouts &amp; Variants</h1><p>Loadouts represent complete named configurations such as Solo, Group DPS, Boss, Tank, or One-Bar. Variants apply smaller alternatives after a loadout, such as PvP consumables, no-DLC gear, or a defensive bar swap.</p></div>
    <section className="panel loadout-model-explainer"><div><span className="eyebrow">Schema 4 selection order</span><h2>Base Build → Loadout → Variant</h2><p>Each layer inherits everything before it. Capture only the sections that differ so future base-build updates continue flowing into the alternatives.</p></div><div className="loadout-model-steps"><span><b>1</b>Base progression</span><span><b>2</b>Complete loadout</span><span><b>3</b>Small variant</span></div></section>

    <section className="panel default-loadout-panel"><div><span className="eyebrow">Character default</span><h2>Default loadout</h2><p>This is selected automatically when a player creates a character from the build.</p></div><label><span>Default setup</span><select value={data.default_loadout_id || loadouts[0]?.id || ''} onChange={event => update(current => ({ ...current, default_loadout_id: event.target.value }))}>{loadouts.map(loadout => <option key={loadout.id} value={loadout.id} disabled={loadout.available === false}>{loadout.name}{loadout.available === false ? ' (unavailable)' : ''}</option>)}</select></label></section>

    <section className="loadouts-editor-section"><div className="section-head"><div><span className="eyebrow">Complete configurations</span><h2>Loadouts</h2><p>Create reusable setups for different roles, content, bar counts, or equipment paths.</p></div><button className="btn primary" onClick={addLoadout}>+ Add Loadout</button></div><div className="loadout-editor-list">{loadouts.map((loadout, index) => <LoadoutEditor key={loadout.id} data={data} loadout={loadout} index={index} count={loadouts.length} isDefault={data.default_loadout_id === loadout.id} onPatch={patch => patchLoadout(index, patch)} onMove={direction => update(current => ({ ...current, loadouts: move(current.loadouts || [], index, direction) }))} onDuplicate={() => update(current => { const next = [...(current.loadouts || [])]; const copy = structuredClone(loadout); copy.id = uniqueId(next, `${loadout.id}-copy`); copy.name = `${loadout.name} Copy`; next.splice(index + 1, 0, copy); return { ...current, loadouts: next } })} onDelete={async () => { if (loadouts.length <= 1) return; const approved = await dialog.confirm({ title: `Delete ${loadout.name}?`, message: 'Variants scoped only to this loadout will be updated. Characters already using a saved revision are not changed until the build is saved again.', confirmLabel: 'Delete Loadout', danger: true }); if (!approved) return; update(current => { const next = (current.loadouts || []).filter((_, rowIndex) => rowIndex !== index); const nextDefault = current.default_loadout_id === loadout.id
            ? (next.find(row => row.available !== false)?.id || next[0]?.id || '')
            : current.default_loadout_id
          const variants = (current.variants || []).map(variant => {
            const priorScope = Array.isArray(variant.loadout_ids) ? variant.loadout_ids : []
            const nextScope = priorScope.filter(id => id !== loadout.id)
            if (priorScope.length && !nextScope.length) return { ...variant, loadout_ids: [], available: false, unavailable_reason: variant.unavailable_reason || `The scoped loadout ${loadout.name} was removed.` }
            return { ...variant, loadout_ids: nextScope }
          })
          const gear_stages = (current.gear_stages || []).map(stage => ({
            ...stage,
            loadout_ids: Array.isArray(stage.loadout_ids) ? stage.loadout_ids.filter(id => id !== loadout.id) : stage.loadout_ids,
            sets: (stage.sets || []).map(set => Object.assign({}, set, { loadout_ids: Array.isArray(set.loadout_ids) ? set.loadout_ids.filter(id => id !== loadout.id) : set.loadout_ids }))
          }))
          const cp_plans = Object.fromEntries(Object.entries(current.cp_plans || {}).map(([tree, plan]) => [tree, {
            ...plan,
            flex: (plan.flex || []).map(group => Object.assign({}, group, { loadout_ids: Array.isArray(group.loadout_ids) ? group.loadout_ids.filter(id => id !== loadout.id) : group.loadout_ids }))
          }]))
          return { ...current, loadouts: next, default_loadout_id: nextDefault, variants, gear_stages, cp_plans } }) }} />)}</div></section>

    <section className="variants-editor-section"><div className="section-head"><div><span className="eyebrow">Smaller alternatives</span><h2>Variants</h2><p>Use variants for focused changes that should sit on top of one or more loadouts.</p></div><button className="btn primary" onClick={addVariant}>+ Add Variant</button></div><div className="loadout-editor-list">{variants.map((variant, index) => <VariantEditor key={variant.id} data={data} variant={variant} index={index} count={variants.length} loadouts={loadouts} onPatch={patch => patchVariant(index, patch)} onMove={direction => update(current => ({ ...current, variants: move(current.variants || [], index, direction) }))} onDuplicate={() => update(current => { const next = [...(current.variants || [])]; const copy = structuredClone(variant); copy.id = uniqueId(next, `${variant.id}-copy`); copy.name = `${variant.name} Copy`; next.splice(index + 1, 0, copy); return { ...current, variants: next } })} onDelete={async () => { if (variants.length <= 1) return; const approved = await dialog.confirm({ title: `Delete ${variant.name}?`, message: 'This removes the variant and its captured overrides.', confirmLabel: 'Delete Variant', danger: true }); if (approved) update(current => ({ ...current, variants: (current.variants || []).filter((_, rowIndex) => rowIndex !== index) })) }} />)}</div></section>
  </div>
}
