import { Link } from 'react-router-dom'
import NumberStepper from './NumberStepper'
import { allocateCp, planSections } from '../utils/buildLogic'

const TREE_LABELS = { craft: 'Craft', warfare: 'Warfare', fitness: 'Fitness' }

function nodeState(entry, nextId) {
  if (entry.full) return 'full'
  if (entry.node.id === nextId) return 'next'
  if (entry.points > 0) return 'partial'
  return 'future'
}

function PathNode({ entry, nextId, optional = false, last = false }) {
  const { node, points, stage } = entry
  const state = nodeState(entry, nextId)
  return <div className={`cp-path-step ${state} ${optional ? 'optional' : ''}`}>
    <article className="cp-path-node">
      <div className="cp-path-node-head">
        <div><span className="cp-node-kind">{node.slottable ? 'Slottable' : 'Passive'}</span><h3>{node.name}</h3></div>
        <strong>{points}/{node.max_points}</strong>
      </div>
      <div className="meter"><i style={{ width: `${node.max_points ? points / node.max_points * 100 : 0}%` }} /></div>
      {node.id === nextId && <div className="cp-spend-next">Spend here next</div>}
      {stage > 0 && <small>Current milestone: {stage} points</small>}
      {node.note && <p>{node.note}</p>}
    </article>
    {!last && <div className="cp-path-connector" aria-hidden="true"><i /></div>}
  </div>
}

function RecommendedBar({ plan, allNodes }) {
  const nodeById = new Map(allNodes.map(node => [node.id, node]))
  const slots = (plan?.final_slots || []).map(id => nodeById.get(id)).filter(Boolean)
  return <section className="cp-champion-bar">
    <div><span className="eyebrow">Recommended Champion Bar</span><h2>Final four slottables</h2></div>
    <div className="cp-slot-row">{[0, 1, 2, 3].map(index => {
      const node = slots[index]
      return <div className={`cp-slot ${node ? '' : 'empty'}`} key={node?.id || index}><span>{index + 1}</span><b>{node?.name || 'Open slot'}</b></div>
    })}</div>
    <small>ATTB recommends the stars above. You still need to drag unlocked slottables into the Champion Bar in ESO.</small>
  </section>
}

export default function CPCard({ tree, plan, total, onChange, detailed = false, disabled = false }) {
  const { core, flex } = planSections(plan)
  const label = plan?.label || TREE_LABELS[tree] || tree
  const allNodes = [...core, ...flex.flatMap(group => group.nodes || [])]

  if (!core.length && !flex.length) return <article className={`cp-card ${tree}`}>
    <div className="cp-title"><div><span className="eyebrow">{label}</span><h3>{total} points</h3></div></div>
    <p className="warn-text">This build file has no Champion Point path for {label}.</p>
  </article>

  const allocation = allocateCp(plan, total)
  const nextId = allocation.next?.node?.id || null
  const nextName = allocation.next?.node?.name || null

  if (!detailed) return <article className={`cp-overview-card ${plan.color || tree}`}>
    <header>
      <div><span className="eyebrow">{label}</span><h2>{allocation.total} points</h2></div>
      {onChange && <NumberStepper value={allocation.total} min={0} max={1200} onChange={onChange} label={`${label} Champion Points`} disabled={disabled} />}
    </header>
    <div className="cp-overview-meter"><i style={{ width: `${allocation.coreCapacity ? Math.min(100, allocation.corePoints / allocation.coreCapacity * 100) : 100}%` }} /></div>
    <div className="cp-overview-stats">
      <div><small>Required path</small><b>{allocation.corePoints}/{allocation.coreCapacity}</b></div>
      <div><small>Recommended route</small><b>{allocation.total - allocation.unassigned}/{allocation.total}</b></div>
      <div><small>Free after route</small><b>{allocation.unassigned}</b></div>
    </div>
    <div className={`cp-next-summary ${nextName ? '' : 'complete'}`}><small>{nextName ? 'Spend next' : 'Documented route complete'}</small><b>{nextName || 'Use optional branches or spend freely'}</b></div>
    <div className="cp-mini-slots">{(plan.final_slots || []).slice(0, 4).map(id => <span key={id}>{allNodes.find(node => node.id === id)?.name || id}</span>)}</div>
    <Link className="btn secondary" to={`/champion-points/${tree}`}>Open {label} plan</Link>
  </article>

  return <article className={`cp-plan-page ${plan.color || tree}`}>
    <header className="cp-plan-header">
      <div><span className="eyebrow">{label} constellation</span><h1>{allocation.total} earned points</h1><p>ATTB spends through the required connecting path first, then follows the build's ordered recommended branches. Optional branches remain visible as alternatives.</p></div>
      {onChange && <div className="cp-plan-editor"><small>Total earned in this tree</small><NumberStepper value={allocation.total} min={0} max={1200} onChange={onChange} label={`${label} Champion Points`} disabled={disabled} /></div>}
    </header>

    {allocation.overCap > 0 && <div className="notice-banner warn-banner">A constellation holds at most 1,200 points. {allocation.overCap} entered point{allocation.overCap === 1 ? '' : 's'} cannot be shown.</div>}

    <section className="cp-plan-summary">
      <div><small>Required path</small><b>{allocation.corePoints}/{allocation.coreCapacity}</b></div>
      <div><small>Recommended flex</small><b>{allocation.flexPoints - allocation.unassigned}</b></div>
      <div><small>Unassigned</small><b>{allocation.unassigned}</b></div>
      <div><small>Next node</small><b>{nextName || 'Route complete'}</b></div>
    </section>

    {!!core.length && <section className="cp-path-section required">
      <div className="cp-path-section-head"><div><span className="eyebrow">Required connection path</span><h2>Open the route first</h2></div><strong>{allocation.corePoints}/{allocation.coreCapacity}</strong></div>
      <div className="cp-linear-path">{allocation.core.map((entry, index) => <PathNode key={entry.node.id} entry={entry} nextId={nextId} last={index === allocation.core.length - 1} />)}</div>
    </section>}

    <section className="cp-branch-section">
      <div className="section-head"><div><span className="eyebrow">Branches after the core</span><h2>Recommended routes and alternatives</h2></div><p>Solid branches are filled in build order. Dashed branches are optional alternatives and are never auto-spent.</p></div>
      <div className="cp-branch-grid">{allocation.groups.map(group => <section className={`cp-branch ${group.optional ? 'optional' : 'recommended'}`} key={group.group.id}>
        <header><div><span>{group.optional ? 'Optional branch' : 'Recommended branch'}</span><h3>{group.group.label}</h3></div><strong>{group.optional ? group.capacity : `${group.points}/${group.capacity}`}</strong></header>
        <p>{group.group.note || group.group.purpose}</p>
        <div className="cp-linear-path compact">{group.entries.map((entry, index) => <PathNode key={entry.node.id} entry={entry} nextId={nextId} optional={group.optional} last={index === group.entries.length - 1} />)}</div>
      </section>)}</div>
    </section>

    {allocation.unassigned > 0 && <div className="cp-free-banner"><b>{allocation.unassigned}</b><span>point{allocation.unassigned === 1 ? '' : 's'} remain after the documented route. Use an optional branch above or spend them freely.</span></div>}

    <RecommendedBar plan={plan} allNodes={allNodes} />
  </article>
}
