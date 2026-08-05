import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import { recommendedUnlocks, unlockState } from '../utils/buildLogic'
import { effectiveAllocation } from '../utils/catalogLogic'

function SkillItem({ item, build, character, lineName, toggleUnlock, compact = false }) {
  const state = unlockState(item, character, build)
  const blocked = state === 'blocked' || state === 'locked'
  return <label className={`skill-summary-item ${state} ${compact ? 'compact' : ''}`}>
    <input type="checkbox" checked={state === 'complete'} onChange={e => toggleUnlock(item.id, e.target.checked)} aria-label={item.name} />
    <SkillIcon skillId={item.catalog_skill_id} name={item.name} image={item.image} size={compact ? 'compact' : 'list'} />
    <div>
      <div className="skill-title-line">
        <b>{item.name}</b>
        <span className={`mini-tag ${item.status}`}>{item.status}</span>
        <span className={`mini-tag state ${state}`}>{state === 'train' ? 'morph after IV' : state}</span>
      </div>
      <small>{lineName(item.line)} · {item.kind} · Rank {item.required_rank}</small>
      {!compact && <p>{item.notes}</p>}
      {item.kind === 'Morph' && <em>Train {item.morph_from || 'the base skill'} to Rank IV, then select this morph.</em>}
      {blocked && compact && <em>{state === 'locked' ? `Needs line rank ${item.required_rank}` : 'Needs an earlier purchase'}</em>}
    </div>
  </label>
}

export default function SkillsPage() {
  const { character, build, toggleUnlock, skillGroups, skillLines } = useApp()
  if (!character || !build) return <EmptyState />

  const lineName = id => skillLines.find(l => l.id === id)?.name || id
  const ordered = [...(build.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
  const recommended = recommendedUnlocks(build, character).filter(x => x.state !== 'complete').slice(0, 5)
  const finalItems = ordered.filter(x => x.status === 'final')
  const completed = new Set(character.completed || [])
  const completedFinal = finalItems.filter(x => completed.has(x.id)).length

  return <div className="page">
    <div className="page-title"><span className="eyebrow">Build-directed progression</span><h1>Skills &amp; passives</h1><p>The recommendation queue is build-specific. Every line page also contains the complete in-game line so you can record optional skills, alternate morphs, crafting passives, and anything else you actually purchased.</p></div>

    <section className="panel next-five-panel">
      <div className="section-head"><div><span className="eyebrow">Do these next</span><h2>Next five suggestions</h2></div><small>Available skills and morph-ready choices appear first</small></div>
      <div className="next-five-list">{recommended.length ? recommended.map((item, index) => <div className="numbered-skill" key={item.id}><span>{index + 1}</span><SkillItem item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} /></div>) : <div className="quiet-box">Everything currently available is checked. Raise your skill-line ranks to reveal the next unlocks.</div>}</div>
    </section>

    <section className="section-block">
      <div className="section-head"><div><span className="eyebrow">Destination overview</span><h2>Final build skills &amp; passives</h2></div><p>{completedFinal}/{finalItems.length} final-build purchases tracked. Numbered order and the full line are available from each submenu page.</p></div>
      <div className="final-skill-groups">{skillGroups.map(([group, lines]) => {
        const ids = new Set(lines.filter(x => x.build_relevant).map(x => x.id))
        const items = finalItems.filter(x => ids.has(x.line))
        if (!items.length) return null
        return <article className="panel final-group" key={group}>
          <div className="final-group-head"><h3>{group}</h3><span>{items.filter(x => completed.has(x.id)).length}/{items.length}</span></div>
          <div>{items.map(item => <SkillItem key={item.id} item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} compact />)}</div>
        </article>
      })}</div>
    </section>

    <section className="section-block">
      <div className="section-head"><div><span className="eyebrow">Browse by line</span><h2>Tracked skill lines</h2></div><p>Build lines affect suggestions. Additional catalog lines are complete personal trackers and never distort the build queue.</p></div>
      <div className="skill-line-directory">{skillGroups.flatMap(([, lines]) => lines).map(line => {
        const spent = (line.skills || []).reduce((sum, skill) => sum + effectiveAllocation(character, build, line.id, skill), 0)
        return <Link key={line.id} to={`/skills/${line.id}`} className="skill-line-card">
          <div><small>{line.group}{line.tracked_only ? ' · tracking only' : ''}</small><b>{line.name}</b><em>{spent} point{spent === 1 ? '' : 's'} recorded</em></div>
          <span>{character.skill_ranks[line.id] ?? 0}/{line.max || 50}</span>
        </Link>
      })}</div>
    </section>
  </div>
}
