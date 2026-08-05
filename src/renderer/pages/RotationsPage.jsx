import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import { currentPhase } from '../utils/buildLogic'

function HotbarSlot({ slot, index, character }) {
  const owned = slot.catalog_skill_id ? Number(character.skill_allocations?.[slot.catalog_skill_id] || 0) > 0 : false
  const unavailable = slot.locked || slot.placeholder
  return <div className={`hotbar-slot ${owned ? 'owned' : ''} ${unavailable ? 'locked' : ''} ${slot.temporary ? 'temporary' : ''}`} title={slot.note || slot.name}>
    <span className="hotbar-key">{index + 1}</span><SkillIcon skillId={slot.catalog_skill_id} name={slot.name} image={slot.image} />
    <b>{slot.name}</b>{slot.temporary && <em>temporary</em>}{unavailable && <em>{slot.locked || 'not yet available'}</em>}
  </div>
}

function UltimateSlot({ ultimate, character }) {
  if (!ultimate) return <div className="hotbar-slot ultimate empty"><span className="hotbar-key">R</span><SkillIcon name="Ultimate" /><b>Ultimate not set</b></div>
  const owned = ultimate.catalog_skill_id ? Number(character.skill_allocations?.[ultimate.catalog_skill_id] || 0) > 0 : false
  return <div className={`hotbar-slot ultimate ${owned ? 'owned' : ''}`} title={ultimate.note || ultimate.name}><span className="hotbar-key">R</span><SkillIcon skillId={ultimate.catalog_skill_id} name={ultimate.name} image={ultimate.image} /><b>{ultimate.name}</b>{ultimate.temporary && <em>temporary</em>}</div>
}

function Hotbar({ title, bar, character }) {
  const slots = bar?.slots || []
  return <section className={`eso-hotbar ${bar?.locked ? 'disabled' : ''}`}>
    <header><div><span>{title}</span><b>{bar?.weapon || 'Weapon not specified'}</b></div>{bar?.locked && <em>{bar.locked}</em>}</header>
    <div className="hotbar-track">{Array.from({ length: 5 }, (_, index) => <HotbarSlot key={index} slot={slots[index] || { name: 'Open slot', placeholder: true }} index={index} character={character} />)}<UltimateSlot ultimate={bar?.ultimate} character={character} /></div>
  </section>
}

function RotationStep({ step, index }) {
  const data = typeof step === 'string' ? { name: step } : step
  return <div className="rotation-step"><span className="rotation-number">{index + 1}</span><SkillIcon skillId={data.catalog_skill_id} name={data.name} image={data.image} size="small" /><div><b>{data.name}</b>{data.note && <small>{data.note}</small>}</div></div>
}

function RotationBlock({ rotation = {} }) {
  const type = rotation.type || 'sequence'
  const steps = rotation.steps || []
  return <section className="rotation-block">
    <div className="rotation-block-head"><div><span className="eyebrow">{type === 'priority' ? 'Priority system' : 'Damage rotation'}</span><h3>{rotation.title || (type === 'priority' ? 'What to do next' : 'Main sequence')}</h3></div>{rotation.summary && <p>{rotation.summary}</p>}</div>
    {rotation.opener?.length > 0 && <div className="rotation-subsection"><b>Opening</b><div className="rotation-flow">{rotation.opener.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div></div>}
    <div className={`rotation-flow ${type}`}>{steps.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div>
    {rotation.execute?.length > 0 && <div className="rotation-subsection execute"><b>Execute changes</b><div className="rotation-flow">{rotation.execute.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div></div>}
    {rotation.notes?.length > 0 && <ul className="rotation-notes">{rotation.notes.map(note => <li key={note}>{note}</li>)}</ul>}
  </section>
}

export default function RotationsPage() {
  const { character, build } = useApp()
  if (!character || !build) return <EmptyState />
  const current = currentPhase(build, character.level)
  const phases = build.phases || []
  return <div className="page">
    <div className="page-title"><span className="eyebrow">Bars by progression band</span><h1>Skill bars &amp; rotations</h1><p>The current phase opens automatically. Hotbars mirror the five ability slots plus ultimate, followed by the sequence or priority system used in combat.</p></div>
    {!phases.length && <div className="quiet-box">This build file does not define progression phases.</div>}
    <div className="rotation-stages">{phases.map(phase => <details className={`rotation-stage rotation-stage-v3 ${phase.id === current?.id ? 'current' : ''}`} key={phase.id} open={phase.id === current?.id}>
      <summary className="rotation-head"><div><span className="eyebrow">{phase.label}</span><h2>{phase.overview}</h2></div>{phase.id === current?.id && <span className="current-pill">current</span>}</summary>
      <div className="rotation-stage-content"><div className="hotbar-stack"><Hotbar title="Front bar" bar={phase.front_bar} character={character} /><Hotbar title="Back bar" bar={phase.back_bar} character={character} /></div><RotationBlock rotation={phase.rotation} /></div>
    </details>)}</div>
  </div>
}
