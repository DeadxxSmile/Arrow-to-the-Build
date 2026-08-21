import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberStepper from './NumberStepper'
import CPConstellationMap, { CPMapButton } from './CPConstellationMap'
import { allocateCp, planSections } from '../utils/buildLogic'
import { getCpStar } from '../utils/cpCatalog.mjs'

const TREE_LABELS = { craft: 'Craft', warfare: 'Warfare', fitness: 'Fitness' }

function nodeState(entry, nextId) {
  const shown = entry.actualPoints ?? entry.points
  if (shown >= entry.node.target_points) return 'full'
  if (entry.node.id === nextId) return 'next'
  if (shown > 0) return 'partial'
  return 'future'
}

function PathNode({ entry, nextId, optional = false, last = false, onOpenMap }) {
  const { node } = entry
  const points = entry.actualPoints ?? entry.points
  const state = nodeState(entry, nextId)
  const firstTarget = Number(node.first_pass_points || node.target_points || node.max_points || 0)
  const finalTarget = Number(node.target_points || node.max_points || 0)
  const firstPassOnly = firstTarget < finalTarget

  return <div className={`cp-path-step ${state} ${optional ? 'optional' : ''}`}>
    <article className="cp-path-node">
      <CPMapButton focusId={node.id} onOpen={onOpenMap} />
      <div className="cp-path-node-head">
        <div><span className="cp-node-kind">{entry.prerequisite ? 'Required route' : node.slottable ? 'Slottable' : 'Passive'}</span><h3>{node.name}</h3></div>
        <strong>{points}/{node.max_points}</strong>
      </div>
      <div className="meter"><i style={{ width: `${node.max_points ? Math.min(100, points / node.max_points * 100) : 0}%` }} /></div>
      {node.id === nextId && <div className="cp-spend-next">Spend here next</div>}
      {firstPassOnly && <small>First pass: {firstTarget}/{node.max_points} · Later target: {finalTarget}/{node.max_points}</small>}
      {!firstPassOnly && finalTarget < node.max_points && <small>Build target: {finalTarget}/{node.max_points}</small>}
      {entry.requiredFor && <small>Needed to reach {getCpStar(entry.requiredFor)?.name || entry.requiredFor}</small>}
      {node.note && <p>{node.note}</p>}
    </article>
    {!last && <div className="cp-path-connector" aria-hidden="true"><i /></div>}
  </div>
}

function DoThisNext({ allocation }) {
  const next = allocation.next
  if (!next) return <section className="cp-do-next complete">
    <div><span className="eyebrow">Live routing</span><h2>First-pass route complete</h2><p>The documented priorities are covered. Use optional branches or spend remaining points freely.</p></div>
  </section>
  const requiredFor = next.requiredFor ? getCpStar(next.requiredFor)?.name || next.requiredFor : null
  const source = next.observed ? 'Your synced ESO allocation' : 'Your entered constellation budget'
  return <section className="cp-do-next">
    <div className="cp-do-next-badge">NEXT</div>
    <div><span className="eyebrow">{next.phase === 'later' ? 'Later upgrade' : 'Unlock-aware route'}</span><h2>{next.node.name}</h2><p>{source} says this is the next useful spend{requiredFor ? ` required to reach ${requiredFor}` : ''}.</p></div>
    <div className="cp-do-next-action"><small>Spend now</small><b>+{next.add}</b><span>Reach {next.target}/{next.node.max_points}</span></div>
  </section>
}

function RecommendedBar({ plan }) {
  const slots = (plan?.final_slots || []).map(id => getCpStar(id) || { id, name: id }).filter(Boolean)
  return <section className="cp-champion-bar">
    <div><span className="eyebrow">Recommended Champion Bar</span><h2>Final four slottables</h2></div>
    <div className="cp-slot-row">{[0, 1, 2, 3].map(index => {
      const node = slots[index]
      return <div className={`cp-slot ${node ? '' : 'empty'}`} key={node?.id || index}><span>{index + 1}</span><b>{node?.name || 'Open slot'}</b></div>
    })}</div>
    <small>Passive stars are always active. Only true slottables belong on the Champion Bar.</small>
  </section>
}

function LaterUpgrades({ entries, nextId, onOpenMap }) {
  if (!entries.length) return null
  return <section className="cp-path-section later">
    <div className="cp-path-section-head"><div><span className="eyebrow">After the first-pass route</span><h2>Come back and finish these later</h2><p>These stars were intentionally left at an unlock milestone so useful targets could be reached sooner.</p></div></div>
    <div className="cp-linear-path">{entries.map((entry, index) => <PathNode key={entry.node.id} entry={entry} nextId={nextId} onOpenMap={onOpenMap} last={index === entries.length - 1} />)}</div>
  </section>
}

function CPMapWorkspace({ tree, label, focusId, allocation, onClose }) {
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])

  const optionalGroup = focusId ? allocation.groups.find(group => group.optional && group.entries.some(row => row.node?.id === focusId)) : null
  const route = optionalGroup?.entries || allocation.route || []
  const observedPoints = allocation.observed?.points || new Map()
  const liveStars = allocation.observed?.liveStars || []
  const star = focusId ? getCpStar(focusId) : null
  const entry = focusId ? allocation.allocations.find(row => row.node?.id === focusId) : null
  const points = entry ? (entry.actualPoints ?? entry.points ?? 0) : (focusId ? observedPoints.get(focusId) || 0 : null)
  const firstTarget = entry ? Number(entry.node?.first_pass_points || entry.node?.target_points || entry.node?.max_points || 0) : null
  const finalTarget = entry ? Number(entry.node?.target_points || entry.node?.max_points || 0) : null
  const requiredFor = entry?.requiredFor ? getCpStar(entry.requiredFor)?.name || entry.requiredFor : null
  const kind = entry ? (entry.prerequisite ? 'Required route' : entry.node?.slottable ? 'Slottable' : 'Passive') : 'Constellation overview'
  const isNext = focusId && allocation.next?.node?.id === focusId

  return <section className={`cp-map-workspace ${allocation.observed?.discipline ? 'live' : 'fallback'}`} role="dialog" aria-modal="true" aria-label={`${label} constellation map`}>
    <header className="cp-map-workspace-header">
      <div className="cp-map-workspace-title">
        <span className="eyebrow">{label} constellation</span>
        <div className="cp-map-workspace-heading-row">
          <h1>{star?.name || `${label} Constellation`}</h1>
          {isNext && <span className="cp-map-workspace-next">Do this next</span>}
        </div>
        <p>{star ? 'Locate this Champion Point star in ESO. Only the route needed to reach the selected star is highlighted; later build targets stay dim. Hover any node for its name, use the mouse wheel to zoom, and drag to pan. Multi-star ESO clusters stay collapsed to their portal.' : 'Full constellation view using the latest ESO geometry available from the synced addon snapshot. Hover any node for its name, use the mouse wheel to zoom, and drag to pan. Multi-star ESO clusters stay collapsed to their portal.'}</p>
      </div>
      <button type="button" className="btn secondary cp-map-workspace-close" onClick={onClose} aria-label="Close constellation map">× Close Map</button>
    </header>
    <div className="cp-map-workspace-meta">
      <div><small>Type</small><b>{kind}</b></div>
      <div><small>Invested now</small><b>{points === null ? `${allocation.total} earned` : `${points}/${star?.max_points || entry?.node?.max_points || '?'}`}</b></div>
      <div><small>Build target</small><b>{entry ? `${firstTarget}/${star?.max_points || entry.node?.max_points || '?'}${finalTarget > firstTarget ? ` first · ${finalTarget}/${star?.max_points || entry.node?.max_points || '?'} final` : ''}` : `${allocation.routeSpent}/${allocation.routeCapacity} route`}</b></div>
      <div><small>Purpose</small><b>{requiredFor ? `Reach ${requiredFor}` : isNext ? `Spend +${allocation.next.add} now` : star ? 'Build route locator' : 'Entire constellation'}</b></div>
    </div>
    <div className="cp-map-workspace-body">
      <CPConstellationMap tree={tree} route={route} focusId={focusId} nextId={isNext ? focusId : null} observedPoints={observedPoints} liveStars={liveStars} />
    </div>
  </section>
}

export default function CPCard({ tree, plan, total, onChange, detailed = false, disabled = false, observedChampion = null }) {
  const [mapFocusId, setMapFocusId] = useState(undefined)
  const { core, flex } = planSections(plan)
  const label = plan?.label || TREE_LABELS[tree] || tree
  if (!core.length && !flex.length) return <article className={`cp-card ${tree}`}><div className="cp-title"><div><span className="eyebrow">{label}</span><h3>{total} points</h3></div></div><p className="warn-text">This build file has no Champion Point strategy for {label}.</p></article>

  const allocation = allocateCp(plan, total, { tree, observedChampion })
  const nextId = allocation.next?.node?.id || null
  const route = allocation.route
  const hasObserved = !!allocation.observed?.discipline
  const openMap = focusId => setMapFocusId(focusId ?? nextId ?? null)
  const closeMap = () => setMapFocusId(undefined)

  if (!detailed) return <article className={`cp-overview-card ${plan.color || tree}`}>
    <header><div><span className="eyebrow">{label}</span><h2>{allocation.total} points</h2></div>{onChange && <NumberStepper value={allocation.total} min={0} max={1200} onChange={onChange} label={`${label} Champion Points`} disabled={disabled} />}</header>
    <div className="cp-overview-meter"><i style={{ width: `${allocation.firstPassCapacity ? Math.min(100, allocation.firstPassSpent / allocation.firstPassCapacity * 100) : 100}%` }} /></div>
    <div className="cp-overview-stats"><div><small>First-pass route</small><b>{allocation.firstPassSpent}/{allocation.firstPassCapacity}</b></div><div><small>Full build route</small><b>{allocation.routeSpent}/{allocation.routeCapacity}</b></div><div><small>{hasObserved ? 'Unassigned now' : 'Free after route'}</small><b>{allocation.unassigned}</b></div></div>
    <div className={`cp-next-summary ${allocation.next ? '' : 'complete'}`}><small>{allocation.next ? 'Do this next' : 'Documented route complete'}</small><b>{allocation.next ? `${allocation.next.node.name} · +${allocation.next.add} to ${allocation.next.target}` : 'Use optional branches or spend freely'}</b>{allocation.next && <span>{allocation.next.requiredFor ? `This opens the path toward ${getCpStar(allocation.next.requiredFor)?.name || allocation.next.requiredFor}.` : allocation.next.phase === 'later' ? 'Return upgrade after the first-pass route.' : 'Next build priority.'}</span>}</div>
    <div className="cp-mini-slots">{(plan.final_slots || []).slice(0, 4).map(id => <span key={id}>{getCpStar(id)?.name || id}</span>)}</div>
    <Link className="btn secondary" to={`/champion-points/${tree}`}>Open {label} plan</Link>
  </article>

  const routeCapacity = allocation.routeCapacity || 0
  return <article className={`cp-plan-page ${plan.color || tree}`}>
    {mapFocusId !== undefined && <CPMapWorkspace tree={tree} label={label} focusId={mapFocusId} allocation={allocation} onClose={closeMap} />}
    <header className="cp-plan-header">
      <div><span className="eyebrow">{label} constellation</span><h1>{allocation.total} earned points</h1><p>ATTB now follows ESO's constellation path: spend only enough on connectors to unlock the next useful star, then return for later upgrades.</p><button type="button" className="btn compact secondary cp-full-map-toggle" onClick={() => openMap(nextId)}>⌖ Constellation Map</button></div>
      {onChange && <div className="cp-plan-editor"><small>Total earned in this tree</small><NumberStepper value={allocation.total} min={0} max={1200} onChange={onChange} label={`${label} Champion Points`} disabled={disabled} /></div>}
    </header>

    {allocation.overCap > 0 && <div className="notice-banner warn-banner">A constellation holds at most 1,200 points. {allocation.overCap} entered point{allocation.overCap === 1 ? '' : 's'} cannot be shown.</div>}

    <section className="cp-plan-summary"><div><small>First-pass route</small><b>{allocation.firstPassSpent}/{allocation.firstPassCapacity}</b></div><div><small>Full documented route</small><b>{allocation.routeSpent}/{routeCapacity}</b></div><div><small>Unassigned</small><b>{allocation.unassigned}</b></div><div><small>Next spend</small><b>{allocation.next ? `${allocation.next.node.name} +${allocation.next.add}` : 'Route complete'}</b></div></section>

    {!!allocation.unresolvedPaths?.length && !allocation.observed?.discipline && <div className="notice-banner warn-banner cp-route-warning"><b>Offline route needs a live graph check.</b> {allocation.unresolvedPaths.map(row => row.node?.name || row.id).join(', ')} uses a constellation path that is not fully verified in the bundled fallback. Sync addon 1.1.3+ to let ATTB read ESO's exact links before following that target.</div>}
    <DoThisNext allocation={allocation} />

    {!!route.length && <section className="cp-path-section required">
      <div className="cp-path-section-head"><div><span className="eyebrow">Unlock-aware first pass</span><h2>Reach the useful stars first</h2><p>Required connector stars are inserted automatically from the canonical Champion Point catalog.</p></div><strong>{allocation.firstPassCapacity} pts</strong></div>
      <div className="cp-linear-path">{route.map((entry, index) => <PathNode key={entry.node.id} entry={entry} nextId={nextId} onOpenMap={openMap} last={index === route.length - 1} />)}</div>
    </section>}

    <LaterUpgrades entries={allocation.laterUpgrades} nextId={nextId} onOpenMap={openMap} />

    <section className="cp-branch-section"><div className="section-head"><div><span className="eyebrow">Situational alternatives</span><h2>Optional branches</h2></div><p>These remain visible but ATTB never silently spends your points into them.</p></div><div className="cp-branch-grid">{allocation.groups.filter(group => group.optional).map(group => <section className="cp-branch optional" key={group.group.id}><header><div><span>Optional branch</span><h3>{group.group.label}</h3></div><strong>{group.capacity}</strong></header><p>{group.group.note || group.group.purpose}</p><div className="cp-linear-path compact">{group.entries.map((entry, index) => <PathNode key={`${group.group.id}:${entry.node.id}`} entry={entry} nextId={null} onOpenMap={openMap} optional last={index === group.entries.length - 1} />)}</div></section>)}</div></section>

    {allocation.unassigned > 0 && <div className="cp-free-banner"><b>{allocation.unassigned}</b><span>{hasObserved && !allocation.firstPassComplete ? `unassigned point${allocation.unassigned === 1 ? '' : 's'} are currently available in ESO. Follow the route above beginning with ${allocation.next?.node?.name || 'the next recommended star'}.` : `point${allocation.unassigned === 1 ? '' : 's'} remain after the documented route. Use an optional branch above or spend them freely.`}</span></div>}
    <RecommendedBar plan={plan} />
  </article>
}
