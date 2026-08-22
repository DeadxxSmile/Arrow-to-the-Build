import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import NumberStepper from '../components/NumberStepper'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'
import CPConstellationMap from '../components/CPConstellationMap'
import { cpStarsForTree, getCpStar, resolveCpNode } from '../utils/cpCatalog.mjs'
import { expandCpPlan } from '../utils/buildLogic.mjs'
import { slugifyEditorId } from '../utils/buildEditorSkillLogic'

const TREES = ['warfare', 'fitness', 'craft']
const LABELS = { warfare: 'Warfare', fitness: 'Fitness', craft: 'Craft' }
const COLORS = { warfare: 'blue', fitness: 'red', craft: 'green' }

function uniqueGroupId(groups, seed) {
  const used = new Set((groups || []).map(group => group?.id))
  const base = slugifyEditorId(seed || 'recommended-branch')
  let id = base, suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function blankPlan(tree) { return { label: LABELS[tree], color: COLORS[tree], core: [], flex: [], final_slots: [], minimum_points: 0, notes: [] } }
function usedIds(plan) { return new Set([...(plan?.core || []), ...(plan?.flex || []).flatMap(group => group.nodes || [])].map(node => node?.id).filter(Boolean)) }
function firstAvailableNode(tree, plan, extraUsed = new Set()) {
  const used = usedIds(plan)
  for (const id of extraUsed) used.add(id)
  const star = cpStarsForTree(tree).find(row => !used.has(row.id)) || cpStarsForTree(tree)[0]
  return star ? { id: star.id, first_pass_points: star.max_points, target_points: star.max_points } : null
}
function blankGroup(tree, plan) {
  const node = firstAvailableNode(tree, plan)
  return { id: uniqueGroupId(plan.flex, 'recommended-branch'), label: 'Recommended Branch', purpose: '', optional: false, note: '', nodes: node ? [node] : [] }
}
function move(rows, index, direction) {
  const next = [...(rows || [])], target = index + direction
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function PointTargetControl({ canonical, value, min = 1, onChange, label }) {
  const stages = canonical?.jump_points_verified === true && Array.isArray(canonical?.jump_points) ? canonical.jump_points.map(Number).filter(points => points >= min) : []
  if (stages.length) return <select value={value} onChange={event => onChange(Number(event.target.value))} aria-label={label}>{stages.map(points => <option key={points} value={points}>{points}</option>)}</select>
  return <NumberStepper value={value} min={min} max={canonical?.max_points || Math.max(min, value)} onChange={onChange} label={label} />
}

function NodeEditor({ tree, plan, node, index, count, onPatch, onMove, onDelete }) {
  const canonical = resolveCpNode(node, tree)
  const options = cpStarsForTree(tree)
  const used = usedIds(plan)
  return <article className="cp-node-editor-row catalog-backed">
    <div className="cp-node-order">{index + 1}</div>
    <div className="cp-node-fields">
      <div className="form-grid four">
        <label><span>Champion star</span><select value={node.id || ''} onChange={event => {
          const star = getCpStar(event.target.value)
          if (!star) return
          onPatch({ id: star.id, first_pass_points: star.max_points, target_points: star.max_points })
        }}>{options.map(star => <option key={star.id} value={star.id} disabled={used.has(star.id) && star.id !== node.id}>{star.name}</option>)}</select></label>
        <label><span>First-pass points</span><PointTargetControl canonical={canonical} value={canonical?.first_pass_points || 1} min={1} onChange={value => onPatch({ first_pass_points: value, target_points: Math.max(value, Number(node.target_points || canonical?.target_points || value)) })} label={`${canonical?.name || node.id} first-pass points`} /></label>
        <label><span>Eventual target</span><PointTargetControl canonical={canonical} value={canonical?.target_points || canonical?.max_points || 1} min={canonical?.first_pass_points || 1} onChange={value => onPatch({ target_points: value })} label={`${canonical?.name || node.id} target points`} /></label>
        <label><span>ESO facts</span><div className="cp-canonical-facts"><b>{canonical?.max_points || '?'} max</b><span>{canonical?.slottable ? 'Slottable' : 'Passive'}</span><span>{canonical?.jump_points_verified === true ? (canonical?.jump_points?.length ? `Stages ${canonical.jump_points.join(' / ')}` : 'Continuous') : 'Stages: live ESO verifies'}</span></div></label>
        <label className="form-span-four"><span>Author note</span><input value={node.note || ''} onChange={event => onPatch({ note: event.target.value || undefined })} placeholder="Why this build wants the star or when to swap it." /></label>
      </div>
      {canonical?.path_verified === true && !!canonical?.prerequisite_path?.length && <div className="cp-editor-route-hint"><b>Automatic prerequisite route:</b> {canonical.prerequisite_path.map(id => getCpStar(id)?.name || id).join(' → ')} → {canonical.name}</div>}
      {canonical?.path_verified !== true && <div className="cp-editor-route-hint warning"><b>Catalog path not fully verified.</b> The canonical Update 50 map placement is still exact; this warning applies only to prerequisite routing for this target.</div>}
    </div>
    <div className="cp-node-actions"><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓</button><button className="btn compact danger" onClick={onDelete}>Delete</button></div>
  </article>
}

function GroupEditor({ tree, plan, group, index, count, onPatch, onMove, onDelete }) {
  const [open, setOpen] = useState(true)
  const nodes = group.nodes || []
  const patchNodes = next => onPatch({ nodes: next })
  return <article className={`cp-flex-group-editor ${group.optional ? 'optional' : ''}`}>
    <button type="button" className="cp-flex-summary" onClick={() => setOpen(value => !value)}><div><span>{group.optional ? 'Optional branch' : 'Recommended branch'}</span><h3>{group.label || group.id}</h3><p>{nodes.length} authored target{nodes.length === 1 ? '' : 's'} · prerequisites inserted automatically</p></div><b>{open ? '−' : '+'}</b></button>
    {open && <div className="cp-flex-body">
      <div className="equipment-inline-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button></div><button className="btn compact danger" onClick={onDelete}>Delete Branch</button></div>
      <div className="form-grid four"><label><span>Branch label</span><input value={group.label || ''} onChange={event => onPatch({ label: event.target.value })} /></label><label><span>Permanent branch ID</span><input className="mono" value={group.id || ''} readOnly /></label><label><span>Purpose</span><input value={group.purpose || ''} onChange={event => onPatch({ purpose: event.target.value || undefined })} placeholder="damage, sustain, defense…" /></label><label className="cp-optional-check"><span>Allocation behavior</span><span className="checkbox-line"><input type="checkbox" checked={group.optional === true} onChange={event => onPatch({ optional: event.target.checked })} /> Optional alternative</span></label><label className="form-span-four"><span>Branch note</span><input value={group.note || ''} onChange={event => onPatch({ note: event.target.value || undefined })} /></label></div>
      <div className="section-head compact-head"><div><span className="eyebrow">Build targets</span><h4>Priority order</h4></div><button className="btn compact primary" onClick={() => { const next = firstAvailableNode(tree, { ...plan, core: [...(plan.core || []), ...nodes] }); if (next) patchNodes([...nodes, next]) }}>+ Add Target</button></div>
      <div className="cp-node-editor-list">{nodes.map((node, nodeIndex) => <NodeEditor key={`${node.id}:${nodeIndex}`} tree={tree} plan={plan} node={node} index={nodeIndex} count={nodes.length} onPatch={patch => patchNodes(nodes.map((row, rowIndex) => rowIndex === nodeIndex ? { ...row, ...patch } : row))} onMove={direction => patchNodes(move(nodes, nodeIndex, direction))} onDelete={() => patchNodes(nodes.filter((_, rowIndex) => rowIndex !== nodeIndex))} />)}</div>
    </div>}
  </article>
}

export default function BuildChampionPointsPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const [tree, setTree] = useState('warfare')
  const [showMap, setShowMap] = useState(true)
  const draft = editor.draft
  if (!draft) return <BuildEditorEmptyState title="Champion Points" description="Open or create a draft before editing this section." />
  const data = draft.data
  const imported = data.extensions?.attb?.imported_character_state || null
  const plan = data.cp_plans?.[tree] || blankPlan(tree)
  const core = plan.core || [], groups = plan.flex || []
  const nodes = useMemo(() => [...core, ...groups.flatMap(group => group.nodes || [])], [core, groups])
  const resolvedNodes = nodes.map(node => resolveCpNode(node, tree)).filter(Boolean)
  const slottableNodes = resolvedNodes.filter(node => node.slottable)
  const expanded = expandCpPlan(plan, tree)
  const firstPassCapacity = expanded.route.reduce((sum, row) => sum + Number(row.first_pass_points || 0), 0)
  const fullCapacity = expanded.route.reduce((sum, row) => sum + Number(row.authored ? row.target_points : row.first_pass_points), 0)

  const updatePlan = updater => editor.updateDraft(current => {
    const currentPlan = current.cp_plans?.[tree] || blankPlan(tree)
    const nextPlan = typeof updater === 'function' ? updater(currentPlan) : { ...currentPlan, ...updater }
    const currentNodes = [...(nextPlan.core || []), ...(nextPlan.flex || []).flatMap(group => group.nodes || [])]
    const validIds = new Set(currentNodes.map(node => node?.id).filter(Boolean))
    const validSlottables = new Set(currentNodes.filter(node => getCpStar(node?.id)?.slottable).map(node => node.id))
    return { ...current, cp_plans: { ...(current.cp_plans || {}), [tree]: { ...nextPlan, final_slots: (nextPlan.final_slots || []).filter(id => validIds.has(id) && validSlottables.has(id)).slice(0, 4) } } }
  })

  const setFinalSlot = (index, id) => updatePlan(current => {
    const padded = [...(current.final_slots || []), '', '', '', ''].slice(0, 4)
    if (id) for (let row = 0; row < padded.length; row += 1) if (row !== index && padded[row] === id) padded[row] = ''
    padded[index] = id
    return { ...current, final_slots: padded.filter(Boolean) }
  })

  const confirmDelete = async (title, message, action) => {
    const approved = await dialog.confirm({ title, message, confirmLabel: 'Delete', danger: true })
    if (approved) action()
  }

  return <div className="page build-editor-form-page build-cp-editor-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Champion Points</h1><p>Choose build priorities; ATTB owns the ESO facts. Maximums, stages, slottable status, and prerequisite routing come from the canonical Update 50 Champion Point catalog.</p></div>
    {imported && <section className="panel imported-cp-reference"><div><span className="eyebrow">CURRENT at import</span><h2>{imported.character_name} Champion Points</h2><p>Imported totals are reference state; the editable constellation plan below remains the TARGET strategy.</p></div><div className="imported-cp-totals"><span className="craft"><small>Craft</small><b>{imported.champion_totals?.craft ?? 0}</b></span><span className="warfare"><small>Warfare</small><b>{imported.champion_totals?.warfare ?? 0}</b></span><span className="fitness"><small>Fitness</small><b>{imported.champion_totals?.fitness ?? 0}</b></span></div></section>}

    <section className="panel cp-editor-overview"><div className="cp-editor-tree-tabs">{TREES.map(key => <button key={key} className={`cp-tree-tab ${key} ${tree === key ? 'active' : ''}`} onClick={() => setTree(key)}><span>{LABELS[key]}</span><b>{[...(data.cp_plans?.[key]?.core || []), ...(data.cp_plans?.[key]?.flex || []).flatMap(group => group.nodes || [])].length} targets</b></button>)}</div><div className="cp-editor-totals"><span><small>First-pass route</small><b>{firstPassCapacity}</b></span><span><small>Full documented route</small><b>{fullCapacity}</b></span><span><small>Champion Bar</small><b>{plan.final_slots?.length || 0}/4</b></span><button className="btn compact secondary" onClick={() => setShowMap(value => !value)}>⌖ {showMap ? 'Hide Map' : 'Show Map'}</button></div></section>

    {showMap && <section className="panel cp-editor-map"><div className="section-head"><div><span className="eyebrow">Catalog-backed locator</span><h2>{LABELS[tree]} constellation</h2><p>This editor preview uses the same canonical Update 50 ESO constellation geometry bundled with ATTB and shown in Character Tracker. Addon sync is not required for map placement. Multi-star clusters are intentionally shown as one portal node rather than an inner mini-map.</p></div></div>{!!expanded.unresolvedPaths?.length && <div className="notice-banner warn-banner">{expanded.unresolvedPaths.length} target{expanded.unresolvedPaths.length === 1 ? '' : 's'} have prerequisite routes that are not yet fully verified in the canonical Champion Point catalog.</div>}<CPConstellationMap tree={tree} route={expanded.route} /></section>}

    <section className="panel cp-plan-settings"><div className="section-head"><div><span className="eyebrow">{LABELS[tree]} plan</span><h2>Constellation identity</h2></div></div><div className="form-grid four"><label><span>Display label</span><input value={plan.label || ''} onChange={event => updatePlan({ label: event.target.value })} /></label><label><span>Color key</span><input value={plan.color || ''} onChange={event => updatePlan({ color: event.target.value })} /></label><label><span>Minimum recommended points</span><NumberStepper value={Number(plan.minimum_points) || 0} min={0} max={1200} onChange={value => updatePlan({ minimum_points: value })} label={`${LABELS[tree]} minimum points`} /></label><label><span>Plan notes, one per line</span><textarea rows="2" value={(plan.notes || []).join('\n')} onChange={event => updatePlan({ notes: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) })} /></label></div></section>

    <section className="panel cp-core-editor"><div className="section-head"><div><span className="eyebrow">Primary priorities</span><h2>First build targets</h2><p>You author priorities, not the connecting graph. ATTB automatically inserts any required nodes between them.</p></div><button className="btn primary" onClick={() => updatePlan(current => { const next = firstAvailableNode(tree, current); return next ? { ...current, core: [...(current.core || []), next] } : current })}>+ Add Priority</button></div><div className="cp-node-editor-list">{core.map((node, index) => <NodeEditor key={`${node.id}:${index}`} tree={tree} plan={plan} node={node} index={index} count={core.length} onPatch={patch => updatePlan(current => ({ ...current, core: (current.core || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))} onMove={direction => updatePlan(current => ({ ...current, core: move(current.core || [], index, direction) }))} onDelete={() => confirmDelete(`Delete ${getCpStar(node.id)?.name || node.id}?`, 'The target will also be removed from the recommended Champion Bar if currently slotted.', () => updatePlan(current => ({ ...current, core: (current.core || []).filter((_, rowIndex) => rowIndex !== index), final_slots: (current.final_slots || []).filter(id => id !== node.id) })))} />)}{!core.length && <div className="quiet-box">No primary targets yet. Add the first star the build should work toward; prerequisites will be inferred from the catalog.</div>}</div></section>

    <section className="panel cp-flex-editor"><div className="section-head"><div><span className="eyebrow">Branches</span><h2>Recommended routes and optional alternatives</h2><p>Recommended groups join the normal first-pass route. Optional groups stay visible as situational swaps and are never auto-spent.</p></div><button className="btn primary" onClick={() => updatePlan(current => ({ ...current, flex: [...(current.flex || []), blankGroup(tree, current)] }))}>+ Add Branch</button></div><div className="cp-flex-group-list">{groups.map((group, index) => <GroupEditor key={group.id} tree={tree} plan={plan} group={group} index={index} count={groups.length} onPatch={patch => updatePlan(current => ({ ...current, flex: (current.flex || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))} onMove={direction => updatePlan(current => ({ ...current, flex: move(current.flex || [], index, direction) }))} onDelete={() => confirmDelete(`Delete ${group.label || group.id}?`, 'Every build target in this branch will be removed.', () => updatePlan(current => ({ ...current, flex: (current.flex || []).filter((_, rowIndex) => rowIndex !== index), final_slots: (current.final_slots || []).filter(id => !(group.nodes || []).some(node => node.id === id)) })))} />)}{!groups.length && <div className="quiet-box">No recommended or optional branches are defined yet.</div>}</div></section>

    <section className="panel cp-final-bar-editor"><div className="section-head"><div><span className="eyebrow">Recommended Champion Bar</span><h2>Final four slottables</h2><p>The catalog controls which stars are actually slottable; passive stars cannot be selected here.</p></div></div><div className="cp-final-slot-grid">{[0, 1, 2, 3].map(index => <label key={index} className="cp-final-slot"><span>{index + 1}</span><select value={plan.final_slots?.[index] || ''} onChange={event => setFinalSlot(index, event.target.value)}><option value="">Open slot</option>{slottableNodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>)}</div>{!slottableNodes.length && <div className="notice-banner warn-banner">Add a slottable build target before building the Champion Bar.</div>}</section>
  </div>
}
