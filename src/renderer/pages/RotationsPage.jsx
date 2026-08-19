import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import DisclosureSection, { DisclosureToolbar } from '../components/DisclosureSection'
import { currentPhase } from '../utils/buildLogic'
import { catalogSkillIdForName } from '../utils/catalogLogic'

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

function ObservedHotbarSlot({ slot, index }) {
  const empty = !slot || slot.name === 'Empty' || !Number(slot.abilityId || 0)
  const name = empty ? 'Empty' : slot.name
  const skillId = !empty ? catalogSkillIdForName(name) : null
  return <div className={`hotbar-slot observed-current ${empty ? 'empty' : ''}`} title={name}><span className="hotbar-key">{index + 1}</span><SkillIcon skillId={skillId} name={name} /><b>{name}</b></div>
}

function ObservedUltimateSlot({ slot }) {
  const empty = !slot || slot.name === 'Empty' || !Number(slot.abilityId || 0)
  const name = empty ? 'Ultimate not set' : slot.name
  const skillId = !empty ? catalogSkillIdForName(name) : null
  return <div className={`hotbar-slot ultimate observed-current ${empty ? 'empty' : ''}`} title={name}><span className="hotbar-key">R</span><SkillIcon skillId={skillId} name={name} /><b>{name}</b></div>
}

function ObservedHotbar({ bar, barIndex }) {
  const rows = bar?.slots || []
  const regular = Array.from({ length: 5 }, (_, index) => rows.find(slot => Number(slot.position) === index + 1 && !slot.isUltimate))
  const ultimate = rows.find(slot => slot.isUltimate || Number(slot.position) === 6)
  const label = bar?.label || (barIndex ? 'Backup' : 'Primary')
  return <section className="eso-hotbar observed-hotbar">
    <header><div><span>{label}</span><b>{barIndex ? 'Back bar' : 'Front bar'}</b></div><em>ESO snapshot</em></header>
    <div className="hotbar-track">{regular.map((slot, index) => <ObservedHotbarSlot key={index} slot={slot} index={index} />)}<ObservedUltimateSlot slot={ultimate} /></div>
  </section>
}

function manualBarChoices(skillLines = []) {
  const choices = []
  for (const line of skillLines) {
    const byId = new Map((line.skills || []).map(skill => [skill.id, skill]))
    for (const skill of line.skills || []) {
      if (skill.type === 'Passive') continue
      const base = skill.base_id ? byId.get(skill.base_id) : null
      const ultimate = skill.type === 'Ultimate' || (skill.type === 'Morph' && base?.type === 'Ultimate')
      choices.push({ id: skill.id, name: skill.name, line: line.name, ultimate })
    }
  }
  return choices.sort((a, b) => a.line.localeCompare(b.line) || a.name.localeCompare(b.name))
}

function ManualHotbarSlot({ value, index, choices, onChange, ultimate = false }) {
  const selected = choices.find(choice => choice.id === value)
  const filtered = choices.filter(choice => choice.ultimate === ultimate)
  return <div className={`hotbar-slot manual-current-slot ${ultimate ? 'ultimate' : ''}`}>
    <span className="hotbar-key">{ultimate ? 'R' : index + 1}</span>
    <SkillIcon skillId={selected?.id} name={selected?.name || (ultimate ? 'Ultimate' : 'Open slot')} />
    <select value={value || ''} onChange={event => onChange(event.target.value)} aria-label={`${ultimate ? 'Ultimate' : `Slot ${index + 1}`} current ability`}>
      <option value="">{ultimate ? 'No ultimate set' : 'Open slot'}</option>
      {filtered.map(choice => <option key={choice.id} value={choice.id}>{choice.name} · {choice.line}</option>)}
    </select>
  </div>
}

function ManualHotbar({ title, barKey, values, choices, onChange }) {
  return <section className="eso-hotbar manual-current-hotbar">
    <header><div><span>{barKey === 'front' ? 'Primary' : 'Backup'}</span><b>{title}</b></div><em>Manual tracking</em></header>
    <div className="hotbar-track manual-hotbar-track">
      {Array.from({ length: 5 }, (_, index) => <ManualHotbarSlot key={index} value={values[index]} index={index} choices={choices} onChange={value => onChange(index, value)} />)}
      <ManualHotbarSlot value={values[5]} index={5} choices={choices} onChange={value => onChange(5, value)} ultimate />
    </div>
  </section>
}

function CurrentActionBars({ character, skillLines, updateCharacter }) {
  const bars = character?.addon_sync?.observed?.skills?.actionBars || []
  const linked = !!character?.addon_sync?.linked
  const manual = character?.manual_action_bars || { front: ['', '', '', '', '', ''], back: ['', '', '', '', '', ''] }
  const choices = useMemo(() => manualBarChoices(skillLines), [skillLines])
  const updateManual = (barKey, index, value) => {
    const next = {
      front: [...(manual.front || ['', '', '', '', '', ''])],
      back: [...(manual.back || ['', '', '', '', '', ''])]
    }
    next[barKey][index] = value
    updateCharacter({ manual_action_bars: next })
  }

  return <section className="panel live-action-bars-panel">
    <div className="section-head"><div><span className="eyebrow">Current character setup</span><h2>Current action bars</h2><p>{linked ? 'Read from the latest ESO snapshot so you can compare what is actually slotted against the build phases below.' : 'No addon link is active for this character. Set the bars manually here so your current setup remains visible above the build plan.'}</p></div><div className="schema-badges"><span>{linked ? 'ESO snapshot' : 'Manual tracking'}</span><span>2 bars</span></div></div>
    {linked
      ? bars.length ? <div className="hotbar-stack">{bars.map((bar, barIndex) => <ObservedHotbar key={`${bar.category ?? barIndex}:${bar.label || ''}`} bar={bar} barIndex={barIndex} />)}</div> : <div className="quiet-box">The latest addon snapshot did not contain action-bar data.</div>
      : <div className="hotbar-stack"><ManualHotbar title="Front bar" barKey="front" values={manual.front || []} choices={choices} onChange={(index, value) => updateManual('front', index, value)} /><ManualHotbar title="Back bar" barKey="back" values={manual.back || []} choices={choices} onChange={(index, value) => updateManual('back', index, value)} /></div>}
  </section>
}

function RotationStep({ step, index }) {
  const data = typeof step === 'string' ? { name: step } : step
  return <div className="rotation-step"><span className="rotation-number">{index + 1}</span><SkillIcon skillId={data.catalog_skill_id} name={data.name} image={data.image} size="small" /><div><b>{data.name}</b>{data.note && <small>{data.note}</small>}</div></div>
}

function RotationBlock({ rotation = {} }) {
  const type = rotation.type || 'sequence'
  const steps = rotation.steps || []
  const priority = type === 'priority'
  return <section className="rotation-block">
    <div className="rotation-block-head"><div><span className="eyebrow">{priority ? 'Combat priority' : 'Rotation sequence'}</span><h3>{rotation.title || (priority ? 'What to press first' : 'Main sequence')}</h3></div><p>{rotation.summary || (priority ? 'When several abilities are ready at the same time, work from the top of this list downward. This is combat-use priority, not unlock order.' : 'Run the sequence in order, then refresh effects as described.')}</p></div>
    {rotation.opener?.length > 0 && <div className="rotation-subsection"><b>Opening casts</b><div className="rotation-flow">{rotation.opener.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div></div>}
    <div className={`rotation-flow ${priority ? 'priority' : 'sequence'}`}>{steps.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div>
    {rotation.execute?.length > 0 && <div className="rotation-subsection execute"><b>Execute changes</b><div className="rotation-flow">{rotation.execute.map((step, index) => <RotationStep key={`${step.name || step}-${index}`} step={step} index={index} />)}</div></div>}
    {rotation.notes?.length > 0 && <ul className="rotation-notes">{rotation.notes.map(note => <li key={note}>{note}</li>)}</ul>}
  </section>
}

export default function RotationsPage() {
  const { character, build, skillLines, updateCharacter } = useApp()
  const phases = build?.phases || []
  const current = character && build ? currentPhase(build, character.level, character.cp_craft + character.cp_warfare + character.cp_fitness, build.active_loadout?.id || character.loadout_id) : null
  const phaseIds = useMemo(() => phases.map(phase => phase.id), [phases])
  const [openPhases, setOpenPhases] = useState(() => new Set())

  useEffect(() => {
    if (current?.id) setOpenPhases(new Set([current.id]))
  }, [character?.id, build?.id, current?.id])

  if (!character || !build) return <EmptyState />
  const togglePhase = id => setOpenPhases(existing => {
    const next = new Set(existing)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  return <div className="page v3-rotations-page">
    <div className="page-title"><span className="eyebrow">Bars by progression band</span><h1>Skill bars &amp; rotations</h1><p>Your current bars stay at the top whether they come from the addon or manual tracking. Open the level range you are playing to see the build bars and how those abilities are meant to be used in combat.</p></div>
    <CurrentActionBars character={character} skillLines={skillLines} updateCharacter={updateCharacter} />
    {!phases.length ? <div className="quiet-box">This build file does not define progression phases.</div> : <section className="rotation-progression-section">
      <div className="section-head"><div><span className="eyebrow">Build progression</span><h2>Bars by level range</h2><p>The current range opens automatically. Older and later ranges stay tucked away until you need them.</p></div><DisclosureToolbar onExpandAll={() => setOpenPhases(new Set(phaseIds))} onCollapseAll={() => setOpenPhases(new Set())} expandDisabled={openPhases.size === phaseIds.length} collapseDisabled={!openPhases.size} /></div>
      <div className="v3-rotation-stages">{phases.map(phase => <DisclosureSection
        key={phase.id}
        className={`v3-rotation-stage ${phase.id === current?.id ? 'current' : ''}`}
        eyebrow={phase.id === current?.id ? 'Current build phase' : 'Build phase'}
        title={phase.label}
        meta={phase.id === current?.id ? 'Using now' : ''}
        open={openPhases.has(phase.id)}
        onToggle={() => togglePhase(phase.id)}
      >
        <div className="rotation-phase-intro"><p>{phase.overview}</p></div>
        <div className="hotbar-stack"><Hotbar title="Front bar" bar={phase.front_bar} character={character} /><Hotbar title="Back bar" bar={phase.back_bar} character={character} /></div>
        <RotationBlock rotation={phase.rotation} />
      </DisclosureSection>)}</div>
    </section>}
  </div>
}
