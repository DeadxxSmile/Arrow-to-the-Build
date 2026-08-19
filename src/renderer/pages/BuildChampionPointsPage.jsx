import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import NumberStepper from '../components/NumberStepper'
import { slugifyEditorId } from '../utils/buildEditorSkillLogic'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'

const TREES = ['warfare', 'fitness', 'craft']
const LABELS = { warfare: 'Warfare', fitness: 'Fitness', craft: 'Craft' }
const COLORS = { warfare: 'blue', fitness: 'red', craft: 'green' }

function starCountLabel(count) {
  return `${count} ${count === 1 ? 'star' : 'stars'}`
}

function uniqueId(plan, seed) {
  const used = new Set([...(plan?.core || []), ...(plan?.flex || []).flatMap(group => group.nodes || [])].map(node => node?.id).filter(Boolean))
  const base = slugifyEditorId(seed || 'champion-star')
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function uniqueGroupId(groups, seed) {
  const used = new Set((groups || []).map(group => group?.id))
  const base = slugifyEditorId(seed || 'recommended-branch')
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function blankPlan(tree) {
  return { label: LABELS[tree], color: COLORS[tree], core: [], flex: [], final_slots: [], minimum_points: 0, notes: [] }
}

function blankNode(plan, name = 'New Champion Star') {
  return { id: uniqueId(plan, name), name, max_points: 50, slottable: false, jump_points: [10, 20, 30, 40, 50], note: '' }
}

function blankGroup(plan) {
  const id = uniqueGroupId(plan.flex, 'recommended-branch')
  return { id, label: 'Recommended Branch', purpose: '', optional: false, note: '', nodes: [blankNode(plan, 'New Branch Star')] }
}

function move(rows, index, direction) {
  const next = [...(rows || [])]
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function parseJumps(value, max) {
  return [...new Set(String(value || '').split(',').map(value => Number(value.trim())).filter(value => Number.isInteger(value) && value > 0 && value <= max))].sort((a, b) => a - b)
}

function NodeEditor({ node, index, count, onPatch, onMove, onDuplicate, onDelete, canDelete = true }) {
  return <article className="cp-node-editor-row">
    <div className="cp-node-order">{index + 1}</div>
    <div className="cp-node-fields">
      <div className="form-grid five">
        <label><span>Star name</span><input value={node.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label>
        <label><span>Permanent ID</span><input className="mono" value={node.id || ''} readOnly /></label>
        <label><span>Maximum points</span><NumberStepper value={Number(node.max_points) || 1} min={1} max={1200} onChange={value => onPatch({ max_points: value, jump_points: (node.jump_points || []).filter(point => point <= value) })} label={`${node.name} maximum points`} /></label>
        <label><span>Stage thresholds</span><input value={(node.jump_points || []).join(', ')} onChange={event => onPatch({ jump_points: parseJumps(event.target.value, Number(node.max_points) || 1) })} placeholder="10, 20, 30, 40, 50" /></label>
        <label className="cp-slottable-check"><span>Champion Bar</span><span className="checkbox-line"><input type="checkbox" checked={node.slottable === true} onChange={event => onPatch({ slottable: event.target.checked })} /> Slottable star</span></label>
        <label className="form-span-five"><span>Author note</span><input value={node.note || ''} onChange={event => onPatch({ note: event.target.value || undefined })} placeholder="What this star contributes and when to prioritize it." /></label>
      </div>
    </div>
    <div className="cp-node-actions"><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate</button><button className="btn compact danger" disabled={!canDelete} onClick={onDelete}>Delete</button></div>
  </article>
}

function GroupEditor({ plan, group, index, count, onPatch, onMove, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(true)
  const nodes = group.nodes || []
  const patchNodes = next => onPatch({ nodes: next })
  return <article className={`cp-flex-group-editor ${group.optional ? 'optional' : ''}`}>
    <button type="button" className="cp-flex-summary" onClick={() => setOpen(value => !value)}><div><span>{group.optional ? 'Optional branch' : 'Recommended branch'}</span><h3>{group.label || group.id}</h3><p>{nodes.length} star{nodes.length === 1 ? '' : 's'} · {nodes.reduce((sum, node) => sum + (Number(node.max_points) || 0), 0)} points</p></div><b>{open ? '−' : '+'}</b></button>
    {open && <div className="cp-flex-body">
      <div className="equipment-inline-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate Branch</button></div><button className="btn compact danger" onClick={onDelete}>Delete Branch</button></div>
      <div className="form-grid four">
        <label><span>Branch label</span><input value={group.label || ''} onChange={event => onPatch({ label: event.target.value })} /></label>
        <label><span>Permanent branch ID</span><input className="mono" value={group.id || ''} readOnly /></label>
        <label><span>Purpose</span><input value={group.purpose || ''} onChange={event => onPatch({ purpose: event.target.value || undefined })} placeholder="damage, sustain, defense…" /></label>
        <label className="cp-optional-check"><span>Allocation behavior</span><span className="checkbox-line"><input type="checkbox" checked={group.optional === true} onChange={event => onPatch({ optional: event.target.checked })} /> Optional alternative</span></label>
        <label className="form-span-four"><span>Branch note</span><input value={group.note || ''} onChange={event => onPatch({ note: event.target.value || undefined })} /></label>
      </div>
      <div className="section-head compact-head"><div><span className="eyebrow">Branch route</span><h4>Stars in spending order</h4></div><button className="btn compact primary" onClick={() => patchNodes([...nodes, blankNode({ ...plan, core: [...(plan.core || []), ...nodes] })])}>+ Add Star</button></div>
      <div className="cp-node-editor-list">{nodes.map((node, nodeIndex) => <NodeEditor key={node.id} node={node} index={nodeIndex} count={nodes.length} onPatch={patch => patchNodes(nodes.map((row, rowIndex) => rowIndex === nodeIndex ? { ...row, ...patch } : row))} onMove={direction => patchNodes(move(nodes, nodeIndex, direction))} onDuplicate={() => { const next = [...nodes]; const copy = { ...structuredClone(node), id: uniqueId({ ...plan, core: [...(plan.core || []), ...nodes] }, `${node.id}-copy`), name: `${node.name} Copy` }; next.splice(nodeIndex + 1, 0, copy); patchNodes(next) }} onDelete={() => patchNodes(nodes.filter((_, rowIndex) => rowIndex !== nodeIndex))} canDelete={nodes.length > 1} />)}</div>
    </div>}
  </article>
}

export default function BuildChampionPointsPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const [tree, setTree] = useState('warfare')
  const draft = editor.draft
  if (!draft) return <BuildEditorEmptyState title="Champion Points" description="Open or create a draft before editing this section." />
  const data = draft.data
  const imported = data.extensions?.attb?.imported_character_state || null
  const plan = data.cp_plans?.[tree] || blankPlan(tree)
  const core = plan.core || []
  const groups = plan.flex || []
  const nodes = useMemo(() => [...core, ...groups.flatMap(group => group.nodes || [])], [core, groups])
  const slottableNodes = nodes.filter(node => node.slottable === true)
  const capacity = nodes.reduce((sum, node) => sum + (Number(node.max_points) || 0), 0)
  const coreCapacity = core.reduce((sum, node) => sum + (Number(node.max_points) || 0), 0)
  const updatePlan = updater => editor.updateDraft(current => {
    const currentPlan = current.cp_plans?.[tree] || blankPlan(tree)
    const nextPlan = typeof updater === 'function' ? updater(currentPlan) : { ...currentPlan, ...updater }
    const allNodes = [...(nextPlan.core || []), ...(nextPlan.flex || []).flatMap(group => group.nodes || [])]
    const validSlottableIds = new Set(allNodes.filter(node => node?.slottable === true).map(node => node.id))
    return { ...current, cp_plans: { ...(current.cp_plans || {}), [tree]: { ...nextPlan, final_slots: (nextPlan.final_slots || []).filter(id => validSlottableIds.has(id)).slice(0, 4) } } }
  })
  const setFinalSlot = (index, id) => updatePlan(current => {
    const padded = [...(current.final_slots || []), '', '', '', ''].slice(0, 4)
    if (id) for (let row = 0; row < padded.length; row += 1) if (row !== index && padded[row] === id) padded[row] = ''
    padded[index] = id
    return { ...current, final_slots: padded.filter(Boolean) }
  })
  const deleteNode = async (where, groupIndex, nodeIndex, node) => {
    const approved = await dialog.confirm({ title: `Delete ${node.name || node.id}?`, message: 'The star will also be removed from the recommended Champion Bar if it is currently slotted.', confirmLabel: 'Delete Star', danger: true })
    if (!approved) return
    updatePlan(current => {
      if (where === 'core') return { ...current, core: (current.core || []).filter((_, index) => index !== nodeIndex), final_slots: (current.final_slots || []).filter(id => id !== node.id) }
      return { ...current, flex: (current.flex || []).map((group, index) => index === groupIndex ? { ...group, nodes: (group.nodes || []).filter((_, index) => index !== nodeIndex) } : group), final_slots: (current.final_slots || []).filter(id => id !== node.id) }
    })
  }

  return <div className="page build-editor-form-page build-cp-editor-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Champion Points</h1><p>Author the required path, recommended branches, optional alternatives, and final four slottables for all three constellations. ATTB will later turn a character’s available points into the exact route defined here.</p></div>
    {imported && <section className="panel imported-cp-reference"><div><span className="eyebrow">CURRENT at import</span><h2>{imported.character_name} Champion Points</h2><p>{imported.mode === 'adapt' ? 'These are the character totals from ESO. The editable constellation plan below remains the TARGET from the selected build.' : 'These totals and any detailed stars available in the snapshot seeded this new draft.'}</p></div><div className="imported-cp-totals"><span className="craft"><small>Craft</small><b>{imported.champion_totals?.craft ?? 0}</b></span><span className="warfare"><small>Warfare</small><b>{imported.champion_totals?.warfare ?? 0}</b></span><span className="fitness"><small>Fitness</small><b>{imported.champion_totals?.fitness ?? 0}</b></span></div></section>}

    <section className="panel cp-editor-overview"><div className="cp-editor-tree-tabs">{TREES.map(key => <button key={key} className={`cp-tree-tab ${key} ${tree === key ? 'active' : ''}`} onClick={() => setTree(key)}><span>{LABELS[key]}</span><b>{starCountLabel([...(data.cp_plans?.[key]?.core || []), ...(data.cp_plans?.[key]?.flex || []).flatMap(group => group.nodes || [])].length)}</b></button>)}</div><div className="cp-editor-totals"><span><small>Required path</small><b>{coreCapacity}</b></span><span><small>Documented total</small><b>{capacity}</b></span><span><small>Champion Bar</small><b>{plan.final_slots?.length || 0}/4</b></span></div></section>

    <section className="panel cp-plan-settings"><div className="section-head"><div><span className="eyebrow">{LABELS[tree]} plan</span><h2>Constellation identity</h2></div></div><div className="form-grid four">
      <label><span>Display label</span><input value={plan.label || ''} onChange={event => updatePlan({ label: event.target.value })} /></label>
      <label><span>Color key</span><input value={plan.color || ''} onChange={event => updatePlan({ color: event.target.value })} /></label>
      <label><span>Minimum recommended points</span><NumberStepper value={Number(plan.minimum_points) || 0} min={0} max={1200} onChange={value => updatePlan({ minimum_points: value })} label={`${LABELS[tree]} minimum points`} /></label>
      <label><span>Plan notes, one per line</span><textarea rows="2" value={(plan.notes || []).join('\n')} onChange={event => updatePlan({ notes: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) })} /></label>
    </div></section>

    <section className="panel cp-core-editor"><div className="section-head"><div><span className="eyebrow">Required connection path</span><h2>Spend here first</h2><p>Core stars are filled in this exact order before the normal recommended branches.</p></div><button className="btn primary" onClick={() => updatePlan(current => ({ ...current, core: [...(current.core || []), blankNode(current)] }))}>+ Add Core Star</button></div>
      <div className="cp-node-editor-list">{core.map((node, index) => <NodeEditor key={node.id} node={node} index={index} count={core.length} onPatch={patch => updatePlan(current => ({ ...current, core: (current.core || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))} onMove={direction => updatePlan(current => ({ ...current, core: move(current.core || [], index, direction) }))} onDuplicate={() => updatePlan(current => { const next = [...(current.core || [])]; next.splice(index + 1, 0, { ...structuredClone(node), id: uniqueId(current, `${node.id}-copy`), name: `${node.name} Copy` }); return { ...current, core: next } })} onDelete={() => deleteNode('core', null, index, node)} />)}{!core.length && <div className="quiet-box">No required path is defined. This is valid, but most plans use core nodes to document connecting stars.</div>}</div>
    </section>

    <section className="panel cp-flex-editor"><div className="section-head"><div><span className="eyebrow">Branches</span><h2>Recommended routes and optional alternatives</h2><p>Recommended groups are auto-spent in order. Optional groups stay visible as situational choices.</p></div><button className="btn primary" onClick={() => updatePlan(current => ({ ...current, flex: [...(current.flex || []), blankGroup(current)] }))}>+ Add Branch</button></div>
      <div className="cp-flex-group-list">{groups.map((group, index) => <GroupEditor key={group.id} plan={plan} group={group} index={index} count={groups.length} onPatch={patch => updatePlan(current => ({ ...current, flex: (current.flex || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))} onMove={direction => updatePlan(current => ({ ...current, flex: move(current.flex || [], index, direction) }))} onDuplicate={() => updatePlan(current => { const next = [...(current.flex || [])]; const copy = structuredClone(group); copy.id = uniqueGroupId(next, `${group.id}-copy`); copy.label = `${group.label} Copy`; copy.nodes = (copy.nodes || []).map((node, nodeIndex) => ({ ...node, id: uniqueId(current, `${copy.id}-${node.name || 'star'}-${nodeIndex + 1}`) })); next.splice(index + 1, 0, copy); return { ...current, flex: next } })} onDelete={async () => { const approved = await dialog.confirm({ title: `Delete ${group.label || group.id}?`, message: 'Every Champion Point star in this branch will be removed.', confirmLabel: 'Delete Branch', danger: true }); if (approved) updatePlan(current => ({ ...current, flex: (current.flex || []).filter((_, rowIndex) => rowIndex !== index), final_slots: (current.final_slots || []).filter(id => !(group.nodes || []).some(node => node.id === id)) })) }} />)}{!groups.length && <div className="quiet-box">No recommended or optional branches are defined yet.</div>}</div>
    </section>

    <section className="panel cp-final-bar-editor"><div className="section-head"><div><span className="eyebrow">Recommended Champion Bar</span><h2>Final four slottables</h2><p>Only stars explicitly marked as slottable can be placed here.</p></div></div><div className="cp-final-slot-grid">{[0, 1, 2, 3].map(index => <label key={index} className="cp-final-slot"><span>{index + 1}</span><select value={plan.final_slots?.[index] || ''} onChange={event => setFinalSlot(index, event.target.value)}><option value="">Open slot</option>{slottableNodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>)}</div>{!slottableNodes.length && <div className="notice-banner warn-banner">Mark at least one star as slottable before building the Champion Bar.</div>}</section>
  </div>
}
