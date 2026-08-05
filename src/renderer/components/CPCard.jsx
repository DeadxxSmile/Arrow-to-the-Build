import React from 'react'
import { allocateCp, planSections } from '../utils/buildLogic'

function Node({ entry }) {
  const { node, points, stage, full } = entry
  return <div className={`cp-node ${full ? 'full' : ''}`}>
    <div><b>{node.name}</b>{node.slottable && <span className="mini-tag slot">slot</span>}</div>
    <span>{points}/{node.max_points}</span>
    <div className="meter"><i style={{ width: `${node.max_points ? points / node.max_points * 100 : 0}%` }} /></div>
    {stage > 0 && <small>Stage reached: {stage}</small>}
    {node.note && <small className="cp-note">{node.note}</small>}
  </div>
}

export default function CPCard({ tree, plan, total }) {
  const { core, flex } = planSections(plan)
  if (!core.length && !flex.length) {
    return <article className={`cp-card ${tree}`}>
      <div className="cp-title"><div><span className="eyebrow">{plan?.label || tree}</span><h3>{total} points</h3></div></div>
      <p className="warn-text">This build file has no CP path for {tree}.</p>
    </article>
  }

  const a = allocateCp(plan, total)
  const nodeName = id => [...core, ...flex.flatMap(g => g.nodes)].find(n => n.id === id)?.name

  return <article className={`cp-card ${plan.color || tree} ${a.coreComplete ? 'core-done' : ''}`}>
    <div className="cp-title">
      <div><span className="eyebrow">{plan.label}</span><h3>{a.total} points</h3></div>
      <span className={`cp-remaining ${a.coreComplete ? 'good' : ''}`}>
        {a.coreComplete ? '✓ Core plan complete' : `Core path: ${a.corePoints}/${a.coreCapacity}`}
      </span>
    </div>

    {a.overCap > 0 && <p className="warn-text">A constellation holds at most 1,200 points, so {a.overCap} of the entered total is not shown.</p>}

    {!!core.length && <div className="cp-section">
      <div className="cp-section-head"><b>Required path</b><span>{a.corePoints}/{a.coreCapacity}</span></div>
      <div className="cp-node-list">{a.core.map(entry => <Node key={entry.node.id} entry={entry} />)}</div>
      {!a.coreComplete && <small className="cp-hint">{a.coreRemaining} more point{a.coreRemaining === 1 ? '' : 's'} opens the rest of this plan.</small>}
    </div>}

    {a.coreComplete && <div className="cp-flex-summary">
      <b>{a.flexPoints}</b><span>flexible point{a.flexPoints === 1 ? '' : 's'} past the required path</span>
    </div>}

    {a.groups.map(group => <div className={`cp-section ${group.optional ? 'optional' : ''}`} key={group.group.id}>
      <div className="cp-section-head"><b>{group.group.label}</b><em>{group.group.purpose}</em><span>{group.optional ? `alternative · ${group.capacity}` : `${group.points}/${group.capacity}`}</span></div>
      {group.optional && <small className="cp-hint">Optional branch: use this instead of another flex route, or let a full build variant promote it into the recommended order.</small>}
      {group.group.note && <small className="cp-hint">{group.group.note}</small>}
      <div className="cp-node-list">{group.entries.map(entry => <Node key={entry.node.id} entry={entry} />)}</div>
    </div>)}

    {a.unassigned > 0 && <p className="cp-free">
      <b>{a.unassigned}</b> flexible point{a.unassigned === 1 ? '' : 's'} remain after the recommended route. Use an optional branch above, spend them freely, or let another build variant provide a different CP plan.
    </p>}

    <div className="cp-footer"><b>Recommended bar:</b> {(plan.final_slots || []).map(nodeName).filter(Boolean).join(' · ') || 'Not specified'}</div>
  </article>
}
