import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import CachedImage from '../components/CachedImage'
import CPCard from '../components/CPCard'
import NumberStepper from '../components/NumberStepper'
import { CP_ACCOUNT_MAX, currentPhase, recommendedUnlocks } from '../utils/buildLogic'
import { skillPointUsage } from '../utils/catalogLogic'

const REASON = {
  locked: item => `Needs skill-line rank ${item.required_rank}`,
  blocked: () => 'Needs an earlier purchase first'
}

export default function StatusPage() {
  const { character, build, skillLines, updateCharacter, setSkillRank, toggleUnlock, esoPlus } = useApp()
  if (!character || !build) return <EmptyState />

  const phase = currentPhase(build, character.level)
  const recs = recommendedUnlocks(build, character)
  const available = recs.filter(x => x.state === 'available' || x.state === 'train').slice(0, 5)
  const upcoming = recs.filter(x => x.state === 'locked' || x.state === 'blocked').slice(0, 6)
  const variant = build.active_variant
  const skillUsage = skillPointUsage(character, build)
  const usageGroups = Object.entries(skillUsage.groups).sort((a, b) => b[1] - a[1])
  const lineName = id => skillLines.find(l => l.id === id)?.name || id
  const cpPlans = build.cp_plans || {}
  const cpTotal = character.cp_craft + character.cp_warfare + character.cp_fitness

  return <div className="page">
    <section className="hero-panel" style={{ '--hero-accent': build.theme?.accent || '#69e891' }}>
      <div className="hero-copy">
        <span className="eyebrow">{[build.defaults?.class, build.defaults?.race, build.defaults?.alliance].filter(Boolean).join(' · ')}</span>
        <h1>{character.name}</h1><p>{build.summary}</p>
        <div className="badge-row">{[build.defaults?.mundus, build.defaults?.front_weapon, build.defaults?.back_weapon].filter(Boolean).map(x => <span key={x}>{x}</span>)}{variant && <span title={variant.summary || ''}>{variant.name}{variant.changes?.length ? '' : ' (base)'}</span>}{esoPlus && <span className="plus">ESO Plus</span>}</div>
      </div>
      <CachedImage src={build.images?.hero} alt={build.name} className="hero-image" />
    </section>

    <section className="panel status-profile-full">
      <div className="section-head"><div><span className="eyebrow">Live profile</span><h2>Current levels &amp; Skill Points used</h2></div><p>ATTB no longer tries to guess how many Skill Points the character should have. It simply counts the points recorded as purchased across every tracked skill line.</p></div>
      <div className="status-core-grid skill-usage-cards">
        <div className="status-step-card"><small>Overall character level</small><NumberStepper value={character.level} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" /></div>
        <div className="status-step-card metric"><small>Total Skill Points used</small><b className="skill-point-number">{skillUsage.total}</b><em>Base abilities, morphs, ultimates, and passive ranks selected in ATTB</em></div>
        <div className="status-step-card metric"><small>Build-related points</small><b className="skill-point-number">{skillUsage.buildRelated}</b><em>Selections connected to this build&rsquo;s ordered progression</em></div>
        <div className="status-step-card metric"><small>Personal / extra points</small><b className="skill-point-number">{skillUsage.personal}</b><em>Crafting, guild, world, alternate morphs, and other non-build selections</em></div>
      </div>
      <div className="skill-usage-breakdown">
        <div className="skill-usage-title"><b>Used-point breakdown</b><span>Updates automatically as skill ranks and selections change</span></div>
        {usageGroups.length ? <div className="skill-usage-groups">{usageGroups.map(([group, points]) => <div key={group}><span>{group}</span><b>{points}</b></div>)}</div> : <div className="quiet-box">No Skill Points recorded yet. Select abilities, morphs, and passive ranks on the Skills &amp; Passives pages.</div>}
      </div>
      {phase && <div className="phase-banner"><small>Current progression band</small><strong>{phase.label}</strong><p>{phase.overview}</p></div>}
      <div className="line-ranks status-line-ranks">{skillLines.map(line => <label key={line.id}><span><b>{line.name}</b><small>{line.group}{line.tracked_only ? ' · personal tracking' : ''}</small></span><NumberStepper value={character.skill_ranks[line.id] ?? 0} min={0} max={line.max || 50} onChange={rank => setSkillRank(line.id, rank)} label={`${line.name} rank`} /></label>)}</div>
    </section>

    <section className="panel status-next-panel">
      <div className="section-head"><div><span className="eyebrow">Dynamic queue</span><h2>What to take next</h2></div><small>Top five based on entered line ranks and selected build items</small></div>
      <div className="recommend-list">{available.length ? available.map(item => <label className={`recommend ${item.state}`} key={item.id}>
        <input type="checkbox" checked={false} onChange={() => toggleUnlock(item.id, true)} aria-label={`Mark ${item.name} as purchased`} />
        <div>
          <div className="rec-title"><b>{item.name}</b><span className={`mini-tag ${item.status}`}>{item.status}</span></div>
          <p>{item.section} · {lineName(item.line)} · Rank {item.required_rank}</p>
          <small>{item.kind === 'Morph' ? 'Train the base ability to Rank IV, then choose this morph. ' : ''}{item.notes}</small>
        </div>
      </label>) : <div className="quiet-box">No immediately available recommendations. Update line ranks or mark purchased items on Skills &amp; Passives.</div>}</div>
      <h3 className="subhead">Unlocking soon</h3>
      {upcoming.length ? <div className="upcoming-list">{upcoming.map(item => <div key={item.id}><b>{item.name}</b><span>{lineName(item.line)} · {(REASON[item.state] || (() => ''))(item)}</span></div>)}</div> : <div className="quiet-box">Nothing else is waiting on a rank or prerequisite.</div>}
    </section>

    {character.level >= 50 && <section className="section-block">
      <div className="section-head">
        <div><span className="eyebrow">Automatic allocation</span><h2>Champion Points</h2></div>
        <p>Each constellation follows the required path, then the build's recommended flex route. Optional branches are shown as alternatives instead of being auto-spent. A full build variant can replace the CP plan entirely. Enter the points you actually have in each tree; a single constellation holds up to 1,200. Slottables still need dragging into the in-game slots.</p>
      </div>
      <div className="cp-account-total"><small>Entered across all three constellations</small><b>{cpTotal}</b><span>of {CP_ACCOUNT_MAX.toLocaleString()} account maximum</span></div>
      <div className="cp-grid">
        <CPCard tree="craft" plan={cpPlans.craft} total={character.cp_craft} />
        <CPCard tree="warfare" plan={cpPlans.warfare} total={character.cp_warfare} />
        <CPCard tree="fitness" plan={cpPlans.fitness} total={character.cp_fitness} />
      </div>
    </section>}
  </div>
}
