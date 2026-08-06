import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import NumberStepper from '../components/NumberStepper'
import AttributesEditor from '../components/AttributesEditor'
import { applyAllocationChange } from '../utils/buildLogic'
import { effectiveAllocation } from '../utils/catalogLogic'

const CP_FIELDS = [
  ['craft', 'Craft CP', 'cp_craft'],
  ['warfare', 'Warfare CP', 'cp_warfare'],
  ['fitness', 'Fitness CP', 'cp_fitness']
]

export default function StatusPage() {
  const { character, build, skillGroups, updateCharacter, setSkillRank, setSkillTracking } = useApp()
  if (!character || !build) return <EmptyState />

  const multiRankPassives = skillGroups.map(([group, lines]) => [group, lines.map(line => ({
    line,
    passives: (line.skills || []).filter(skill => skill.type === 'Passive' && Number(skill.max_points || 1) > 1)
  })).filter(entry => entry.passives.length)]).filter(([, lines]) => lines.length)

  const updatePassive = (line, skill, points) => {
    const { allocations, completed } = applyAllocationChange(build, character, line.id, skill, points, line.skills || [])
    return setSkillTracking(allocations, completed)
  }

  return <div className="page current-levels-page">
    <div className="page-title"><span className="eyebrow">Live numeric progress</span><h1>Current levels</h1><p>Record the numbers this character actually has right now. Build recommendations stay on Basic Setup, Skills &amp; Passives, and Champion Points.</p></div>

    <section className="panel current-core-panel">
      <div className="section-head"><div><span className="eyebrow">Character progression</span><h2>Level and Champion Points</h2></div><p>Champion Points are character-specific in ATTB for now and remain available to enter even when this character is below Level 50.</p></div>
      <div className="current-number-grid">
        <article className="current-number-card level"><small>Overall character level</small><NumberStepper value={character.level} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" /></article>
        {CP_FIELDS.map(([tree, label, field]) => <article className={`current-number-card ${tree}`} key={field}><small>{label}</small><NumberStepper value={character[field] || 0} min={0} max={1200} onChange={value => updateCharacter({ [field]: value })} label={label} /></article>)}
      </div>
    </section>

    <AttributesEditor character={character} build={build} onChange={attributes => updateCharacter({ attributes })} />

    <section className="panel numeric-tracking-panel">
      <div className="section-head"><div><span className="eyebrow">Skill-line progression</span><h2>Current line ranks</h2></div><p>Use this page for fast numeric entry. Ability purchases and morph choices remain under Skills &amp; Passives.</p></div>
      <div className="numeric-groups">{skillGroups.map(([group, lines]) => <section className="numeric-group" key={group}><header><h3>{group}</h3><span>{lines.length} line{lines.length === 1 ? '' : 's'}</span></header><div className="numeric-row-list">{lines.map(line => <label className="numeric-row" key={line.id}><span><b>{line.name}</b><small>{line.tracked_only ? 'Personal tracking' : 'Build-related line'}</small></span><NumberStepper value={character.skill_ranks[line.id] ?? 0} min={0} max={line.max || 50} onChange={rank => setSkillRank(line.id, rank)} label={`${line.name} rank`} /></label>)}</div></section>)}</div>
    </section>

    <section className="panel numeric-tracking-panel">
      <div className="section-head"><div><span className="eyebrow">Passive progression</span><h2>Multi-rank passive levels</h2></div><p>Only passives with more than one purchasable rank appear here. One-rank purchases, active skills, morphs, and ultimates stay on their full skill-line pages.</p></div>
      {multiRankPassives.length ? <div className="numeric-groups passive-groups">{multiRankPassives.map(([group, lines]) => <section className="numeric-group" key={group}><header><h3>{group}</h3><span>{lines.reduce((sum, entry) => sum + entry.passives.length, 0)} passives</span></header><div className="numeric-row-list">{lines.flatMap(({ line, passives }) => passives.map(skill => <label className="numeric-row" key={skill.id}><span><b>{skill.name}</b><small>{line.name} · {skill.max_points} ranks</small></span><NumberStepper value={effectiveAllocation(character, build, line.id, skill)} min={0} max={skill.max_points || 1} onChange={points => updatePassive(line, skill, points)} label={`${skill.name} passive rank`} /></label>))}</div></section>)}</div> : <div className="quiet-box">No multi-rank passives are available in the tracked skill lines.</div>}
    </section>
  </div>
}
