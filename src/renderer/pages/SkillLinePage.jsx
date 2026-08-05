import React from 'react'
import { Navigate, Link, useParams } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import CachedImage from '../components/CachedImage'
import NumberStepper from '../components/NumberStepper'
import { applyAllocationChange } from '../utils/buildLogic'
import { buildItemsForCatalogSkill, effectiveAllocation, itemBuildMeta } from '../utils/catalogLogic'

function stateFor(skill, rank, allocation, meta) {
  if (allocation > 0) return 'selected'
  const required = meta.linked.length ? Math.min(...meta.linked.map(item => Number(item.required_rank) || 0)) : Number(skill.required_rank || 0)
  if (required && rank < required) return 'locked'
  if (skill.type === 'Morph') return 'morph'
  return 'available'
}

export default function SkillLinePage() {
  const { lineId } = useParams()
  const { character, build, skillLines, setSkillRank, setSkillTracking } = useApp()
  if (!character || !build) return <EmptyState />
  const line = skillLines.find(item => item.id === lineId)
  if (!line) return <Navigate to="/skills" replace />

  const rank = character.skill_ranks[line.id] ?? 0
  const skills = line.skills || []
  const orderIndex = new Map([...(build.unlock_order || [])]
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
    .map((item, index) => [item.id, index + 1]))
  const spent = skills.filter(skill => skill.currency === 'skill_point')
    .reduce((sum, skill) => sum + effectiveAllocation(character, build, line.id, skill), 0)

  const updateAllocation = (skill, nextPoints) => {
    const { allocations, completed } = applyAllocationChange(build, character, line.id, skill, nextPoints, skills)
    return setSkillTracking(allocations, completed)
  }

  const ultimates = skills.filter(skill => skill.type === 'Ultimate')
  const actives = skills.filter(skill => skill.type === 'Active')
  const passives = skills.filter(skill => skill.type === 'Passive')
  const specials = skills.filter(skill => !['Ultimate', 'Active', 'Morph', 'Passive'].includes(skill.type))

  const buildOrderLabel = skill => {
    const indexes = buildItemsForCatalogSkill(build, line.id, skill).map(item => orderIndex.get(item.id)).filter(Boolean)
    return indexes.length ? indexes.join(' / ') : null
  }
  const skillImage = skill => buildItemsForCatalogSkill(build, line.id, skill).find(item => item.image)?.image

  const SkillBadges = ({ skill }) => {
    const meta = itemBuildMeta(build, line.id, skill)
    const state = stateFor(skill, rank, effectiveAllocation(character, build, line.id, skill), meta)
    return <div className="eso-badges">
      {meta.tracked ? <><span className={`mini-tag ${meta.status}`}>{meta.status}</span><span className="mini-tag phase">{meta.phase}</span></> : <span className="mini-tag tracking">tracking</span>}
      <span className={`mini-tag state ${state}`}>{state}</span>
    </div>
  }

  const BaseAbility = ({ skill }) => {
    const allocation = effectiveAllocation(character, build, line.id, skill)
    const meta = itemBuildMeta(build, line.id, skill)
    const required = meta.linked.length ? Math.min(...meta.linked.map(item => Number(item.required_rank) || 0)) : skill.required_rank
    const morphs = (skill.morph_ids || []).map(id => skills.find(item => item.id === id)).filter(Boolean)
    const order = buildOrderLabel(skill)
    return <article className={`eso-ability-card ${allocation ? 'selected' : ''}`}>
      <div className="eso-ability-main">
        <button className={`eso-skill-toggle ${allocation ? 'selected' : ''}`} onClick={() => updateAllocation(skill, allocation ? 0 : 1)} aria-pressed={!!allocation} aria-label={`${allocation ? 'Unselect' : 'Select'} ${skill.name}`}>{allocation ? '✓' : '+'}</button>
        <div className="eso-skill-icon">{skillImage(skill) ? <CachedImage src={skillImage(skill)} alt={skill.name} /> : <span aria-hidden="true">{skill.type === 'Ultimate' ? 'U' : 'A'}</span>}</div>
        <div className="eso-skill-copy">
          <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /></div>
          <p>{skill.type}{required ? ` · Unlocks at line rank ${required}` : ' · Unlock timing varies by line progression'}</p>
          <small>{meta.notes}</small>
        </div>
      </div>
      {morphs.length > 0 && <div className="morph-branches">{morphs.map(morph => {
        const morphPoints = effectiveAllocation(character, build, line.id, morph)
        const morphMeta = itemBuildMeta(build, line.id, morph)
        const morphOrder = buildOrderLabel(morph)
        return <button type="button" key={morph.id} className={`morph-choice ${morphPoints ? 'selected' : ''}`} onClick={() => updateAllocation(morph, morphPoints ? 0 : 1)} disabled={!allocation && morphPoints === 0} aria-pressed={!!morphPoints} title={!allocation && morphPoints === 0 ? `Select ${skill.name} first` : undefined}>
          <span className="branch-mark" aria-hidden="true">{morphPoints ? '◆' : '◇'}</span>
          <div><div><b>{morph.name}</b>{morphOrder && <em>Build #{morphOrder}</em>}</div><SkillBadges skill={morph} /><small>{morphMeta.notes}</small></div>
        </button>
      })}</div>}
    </article>
  }

  const Passive = ({ skill }) => {
    const allocation = effectiveAllocation(character, build, line.id, skill)
    const meta = itemBuildMeta(build, line.id, skill)
    const order = buildOrderLabel(skill)
    const requiredRanks = meta.linked.map(item => item.required_rank).filter(Boolean)
    return <article className={`eso-passive-row ${allocation ? 'selected' : ''}`}>
      <div className="eso-passive-icon" aria-hidden="true">P</div>
      <div className="eso-skill-copy">
        <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /></div>
        <p>{skill.currency === 'class_mastery_point' ? 'Class Mastery choice' : 'Passive'} · {skill.max_points || 1} rank{(skill.max_points || 1) === 1 ? '' : 's'}{requiredRanks.length ? ` · Build ranks ${requiredRanks.join(' / ')}` : ''}</p>
        <small>{meta.notes}</small>
      </div>
      <NumberStepper value={allocation} min={0} max={skill.max_points || 1} onChange={value => updateAllocation(skill, value)} label={`${skill.name} points`} />
    </article>
  }

  const Special = ({ skill }) => {
    const allocation = effectiveAllocation(character, build, line.id, skill)
    const meta = itemBuildMeta(build, line.id, skill)
    const order = buildOrderLabel(skill)
    return <article className={`eso-passive-row ${allocation ? 'selected' : ''}`}>
      <div className="eso-passive-icon" aria-hidden="true">S</div>
      <div className="eso-skill-copy">
        <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /></div>
        <p>{skill.type} · tracking only</p><small>{meta.notes}</small>
      </div>
      <NumberStepper value={allocation} min={0} max={1} onChange={value => updateAllocation(skill, value)} label={`${skill.name} tracked`} />
    </article>
  }

  const Section = ({ title, items, kind }) => <section className="eso-skill-section">
    <div className="eso-section-title"><span aria-hidden="true">{kind === 'Ultimate' ? '✦' : kind === 'Active' ? '◆' : kind === 'Special' ? '◇' : '●'}</span><h2>{title}</h2><em>{items.reduce((sum, skill) => sum + effectiveAllocation(character, build, line.id, skill), 0)} selected</em></div>
    <div className="eso-section-list">{items.length ? items.map(skill => kind === 'Passive' ? <Passive key={skill.id} skill={skill} /> : kind === 'Special' ? <Special key={skill.id} skill={skill} /> : <BaseAbility key={skill.id} skill={skill} />) : <div className="quiet-box">No {title.toLowerCase()} in this line.</div>}</div>
  </section>

  return <div className="page">
    <div className="page-title line-page-title">
      <div><span className="eyebrow">{line.group} · {line.build_relevant ? 'build and full-line tracking' : 'personal full-line tracking'}</span><h1>{line.name}</h1><p>Modeled after ESO&rsquo;s skill window: base abilities branch into two morphs, passives track individual ranks, and build badges stay visible without hiding optional purchases.</p></div>
      <Link to="/skills" className="btn secondary">← Skills overview</Link>
    </div>
    <section className="panel line-rank-panel">
      <div><span className="eyebrow">Current line rank</span><h2>{rank}/{line.max || 50}</h2></div>
      <NumberStepper value={rank} min={0} max={line.max || 50} onChange={value => setSkillRank(line.id, value)} label={`${line.name} rank`} />
      <div className="line-meter"><i style={{ width: `${Math.min(100, (rank / (line.max || 50)) * 100)}%` }} /></div>
      <span>{spent} ordinary Skill Point{spent === 1 ? '' : 's'} recorded</span>
    </section>
    {!skills.length && <div className="quiet-box">The bundled catalog has no skills recorded for this line.</div>}
    <div className="eso-skill-window">
      <Section title="Ultimate Abilities" items={ultimates} kind="Ultimate" />
      <Section title="Active Abilities" items={actives} kind="Active" />
      <Section title="Passive Abilities" items={passives} kind="Passive" />
      {specials.length > 0 && <Section title="Grimoires & Special Tracking" items={specials} kind="Special" />}
    </div>
    {line.note && <div className="catalog-note">{line.note}</div>}
  </div>
}
