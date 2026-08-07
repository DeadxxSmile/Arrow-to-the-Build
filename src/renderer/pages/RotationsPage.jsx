import { useApp } from '../App'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
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
  return <div className={`hotbar-slot observed-current ${empty ? 'empty' : ''}`} title={name}>
    <span className="hotbar-key">{index + 1}</span>
    <SkillIcon skillId={skillId} name={name} />
    <b>{name}</b>
  </div>
}

function ObservedUltimateSlot({ slot }) {
  const empty = !slot || slot.name === 'Empty' || !Number(slot.abilityId || 0)
  const name = empty ? 'Ultimate not set' : slot.name
  const skillId = !empty ? catalogSkillIdForName(name) : null
  return <div className={`hotbar-slot ultimate observed-current ${empty ? 'empty' : ''}`} title={name}>
    <span className="hotbar-key">R</span>
    <SkillIcon skillId={skillId} name={name} />
    <b>{name}</b>
  </div>
}

function ObservedHotbar({ bar, barIndex }) {
  const rows = bar?.slots || []
  const regular = Array.from({ length: 5 }, (_, index) => rows.find(slot => Number(slot.position) === index + 1 && !slot.isUltimate))
  const ultimate = rows.find(slot => slot.isUltimate || Number(slot.position) === 6)
  const label = bar?.label || (barIndex ? 'Backup' : 'Primary')
  return <section className="eso-hotbar observed-hotbar">
    <header><div><span>{label}</span><b>{barIndex ? 'Back bar' : 'Front bar'}</b></div><em>ESO snapshot</em></header>
    <div className="hotbar-track">
      {regular.map((slot, index) => <ObservedHotbarSlot key={index} slot={slot} index={index} />)}
      <ObservedUltimateSlot slot={ultimate} />
    </div>
  </section>
}


function LiveActionBars({ character }) {
  const bars = character?.addon_sync?.observed?.skills?.actionBars || []
  if (!character?.addon_sync?.linked) return null
  return <details className="rotation-stage rotation-stage-card live-action-bars-stage" open>
    <summary className="rotation-head live-action-bars-summary"><div><span className="eyebrow">Observed in ESO</span><h2>Current action bars</h2><p>The addon records the abilities actually slotted in game. Compare them with the build phase below without changing the authored build.</p></div><div className="schema-badges"><span>{bars.length} bar{bars.length === 1 ? '' : 's'}</span><span>Latest snapshot</span></div></summary>
    <div className="rotation-stage-content">
      {bars.length ? <div className="hotbar-stack">{bars.map((bar, barIndex) => <ObservedHotbar key={`${bar.category ?? barIndex}:${bar.label || ''}`} bar={bar} barIndex={barIndex} />)}</div> : <div className="quiet-box">The latest addon snapshot did not contain action-bar data.</div>}
    </div>
  </details>
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
  const current = currentPhase(build, character.level, character.cp_craft + character.cp_warfare + character.cp_fitness, build.active_loadout?.id || character.loadout_id)
  const phases = build.phases || []
  return <div className="page">
    <div className="page-title"><span className="eyebrow">Bars by progression band</span><h1>Skill bars &amp; rotations</h1><p>The current phase opens automatically. Hotbars mirror the five ability slots plus ultimate, followed by the sequence or priority system used in combat.</p></div>
    <LiveActionBars character={character} />
    {!phases.length && <div className="quiet-box">This build file does not define progression phases.</div>}
    <div className="rotation-stages">{phases.map(phase => <details className={`rotation-stage rotation-stage-card ${phase.id === current?.id ? 'current' : ''}`} key={phase.id} open={phase.id === current?.id}>
      <summary className="rotation-head"><div><span className="eyebrow">{phase.label}</span><h2>{phase.overview}</h2></div>{phase.id === current?.id && <span className="current-pill">current</span>}</summary>
      <div className="rotation-stage-content"><div className="hotbar-stack"><Hotbar title="Front bar" bar={phase.front_bar} character={character} /><Hotbar title="Back bar" bar={phase.back_bar} character={character} /></div><RotationBlock rotation={phase.rotation} /></div>
    </details>)}</div>
  </div>
}
