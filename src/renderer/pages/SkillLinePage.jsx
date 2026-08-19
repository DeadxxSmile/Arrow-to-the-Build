import { Navigate, Link, useParams } from 'react-router-dom'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import NumberStepper from '../components/NumberStepper'
import { applyAllocationChange, reclaimablePointsFor, temporaryRetirementState } from '../utils/buildLogic'
import { buildItemsForCatalogSkill, effectiveAllocation, effectiveSkillMaxPoints, itemBuildMeta } from '../utils/catalogLogic'
import OverrideResetButton from '../components/OverrideResetButton'
import SyncOverrideBar from '../components/SyncOverrideBar'

function stateFor(skill, rank, allocation, meta) {
  if (allocation > 0) return 'selected'
  const required = meta.linked.length ? Math.min(...meta.linked.map(item => Number(item.required_rank) || 0)) : Number(skill.required_rank || 0)
  if (required && rank < required) return 'locked'
  if (skill.type === 'Morph') return 'morph'
  return 'available'
}

export default function SkillLinePage() {
  const { lineId } = useParams()
  const { character, build, skillLines, setSkillRank, setSkillTracking, setTemporaryUnlockState, appSettings } = useApp()
  const dialog = useAppDialog()
  if (!character || !build) return <EmptyState />
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'
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
    if (syncedLocked) return
    const effectiveSkill = skill.type === 'Passive' ? { ...skill, max_points: effectiveSkillMaxPoints(character, skill) } : skill
    const { allocations, completed } = applyAllocationChange(build, character, line.id, effectiveSkill, nextPoints, skills)
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

  const retirementForMeta = meta => {
    const temporary = meta.linked.filter(item => item.status === 'temporary')
    if (!temporary.length || meta.linked.some(item => item.status === 'final')) return null
    const states = temporary.map(item => ({ item, state: temporaryRetirementState(item, character, build) }))
    return states.find(entry => entry.state.retired) || states[0]
  }

  const retireTemporary = async (item, owned) => {
    const kind = item.kind === 'Passive' ? 'passive' : 'skill'
    const cost = reclaimablePointsFor(item, build, character)
    const ok = await dialog.confirm({
      title: `Are you done with this temporary ${kind}?`,
      message: owned
        ? `${item.name} is recorded as owned. Retiring it changes only the ATTB plan: it will stop being recommended${cost ? ` and ${cost} Skill Point${cost === 1 ? '' : 's'} will be shown as reclaimable until you refund it in ESO` : ''}.`
        : `${item.name} will be retired for this character even if the build's normal cutoff has not been reached. This does not change your ESO character.`,
      confirmLabel: `Retire Temporary ${item.kind === 'Passive' ? 'Passive' : 'Skill'}`
    })
    if (ok) await setTemporaryUnlockState(item.id, 'retired')
  }

  const TemporaryControl = ({ meta, owned }) => {
    const entry = retirementForMeta(meta)
    if (!entry) return null
    if (entry.state.source === 'manual-active') return <button type="button" className="btn secondary compact temporary-state-button" onClick={() => setTemporaryUnlockState(entry.item.id, null)}>Follow build cutoff</button>
    if (entry.state.retired) return <button type="button" className="btn secondary compact temporary-state-button" onClick={() => setTemporaryUnlockState(entry.item.id, entry.state.source === 'manual' ? null : 'active')}>{entry.state.source === 'manual' ? 'Follow build cutoff' : 'Keep active'}</button>
    return <button type="button" className="btn secondary compact temporary-state-button" onClick={() => retireTemporary(entry.item, owned)}>Retire</button>
  }

  const SkillBadges = ({ skill }) => {
    const meta = itemBuildMeta(build, line.id, skill)
    const retired = retirementForMeta(meta)?.state?.retired
    const state = retired ? 'retired' : stateFor(skill, rank, effectiveAllocation(character, build, line.id, skill), meta)
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
        <button type="button" role="checkbox" aria-checked={!!allocation} className={`eso-skill-toggle ${allocation ? 'selected' : ''}`} onClick={() => updateAllocation(skill, allocation ? 0 : 1)} disabled={syncedLocked} aria-label={`${allocation ? 'Unselect' : 'Select'} ${skill.name}`}><span aria-hidden="true">{allocation ? '✓' : ''}</span></button>
        <div className="eso-skill-icon"><SkillIcon skillId={skill.id} name={skill.name} image={skillImage(skill)} size="line" /></div>
        <div className="eso-skill-copy">
          <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /><TemporaryControl meta={meta} owned={allocation > 0} /><OverrideResetButton fieldPath={`skill_allocations.${skill.id}`} compact /></div>
          <p>{skill.type}{required ? ` · Unlocks at line rank ${required}` : ' · Unlock timing varies by line progression'}</p>
          <small>{meta.notes}</small>
        </div>
      </div>
      {morphs.length > 0 && <div className="morph-branches">{morphs.map(morph => {
        const morphPoints = effectiveAllocation(character, build, line.id, morph)
        const morphMeta = itemBuildMeta(build, line.id, morph)
        const morphOrder = buildOrderLabel(morph)
        return <div className={`morph-choice-wrap ${morphPoints ? 'selected' : ''}`} key={morph.id}>
          <button type="button" className={`morph-choice ${morphPoints ? 'selected' : ''}`} onClick={() => updateAllocation(morph, morphPoints ? 0 : 1)} disabled={syncedLocked || (!allocation && morphPoints === 0)} aria-pressed={!!morphPoints} title={!allocation && morphPoints === 0 ? `Select ${skill.name} first` : undefined}>
            <span className="morph-icon-wrap"><SkillIcon skillId={morph.id} name={morph.name} image={skillImage(morph)} size="morph" />{morphPoints > 0 && <i aria-hidden="true">✓</i>}</span>
            <div><div><b>{morph.name}</b>{morphOrder && <em>Build #{morphOrder}</em>}</div><SkillBadges skill={morph} /><TemporaryControl meta={morphMeta} owned={morphPoints > 0} /><small>{morphMeta.notes}</small></div>
          </button>
          <OverrideResetButton fieldPath={`skill_allocations.${morph.id}`} compact />
        </div>
      })}</div>}
    </article>
  }

  const Passive = ({ skill }) => {
    const allocation = effectiveAllocation(character, build, line.id, skill)
    const meta = itemBuildMeta(build, line.id, skill)
    const order = buildOrderLabel(skill)
    const requiredRanks = skill.unlock_ranks?.length ? skill.unlock_ranks : meta.linked.map(item => item.required_rank).filter(Boolean)
    const maxPoints = effectiveSkillMaxPoints(character, skill)
    return <article className={`eso-passive-row ${allocation ? 'selected' : ''}`}>
      <div className="eso-passive-icon"><SkillIcon skillId={skill.id} name={skill.name} image={skillImage(skill)} size="passive" /></div>
      <div className="eso-skill-copy">
        <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /><TemporaryControl meta={meta} owned={allocation > 0} /></div>
        <p>{skill.currency === 'class_mastery_point' ? 'Class Mastery choice' : 'Passive'} · {maxPoints} rank{maxPoints === 1 ? '' : 's'}{requiredRanks.length ? ` · Unlocks at line rank${requiredRanks.length === 1 ? '' : 's'} ${requiredRanks.join(' / ')}` : ''}</p>
        <small>{meta.notes}</small>
      </div>
      <div className="synced-control"><NumberStepper value={allocation} min={0} max={maxPoints} onChange={value => updateAllocation(skill, value)} label={`${skill.name} points`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_allocations.${skill.id}`} compact /></div>
    </article>
  }

  const Special = ({ skill }) => {
    const allocation = effectiveAllocation(character, build, line.id, skill)
    const meta = itemBuildMeta(build, line.id, skill)
    const order = buildOrderLabel(skill)
    return <article className={`eso-passive-row ${allocation ? 'selected' : ''}`}>
      <div className="eso-passive-icon"><SkillIcon skillId={skill.id} name={skill.name} image={skillImage(skill)} size="passive" /></div>
      <div className="eso-skill-copy">
        <div className="eso-skill-heading"><h3>{skill.name}</h3>{order && <span className="unlock-order">Build #{order}</span>}<SkillBadges skill={skill} /><TemporaryControl meta={meta} owned={allocation > 0} /></div>
        <p>{skill.type} · tracking only</p><small>{meta.notes}</small>
      </div>
      <div className="synced-control"><NumberStepper value={allocation} min={0} max={1} onChange={value => updateAllocation(skill, value)} label={`${skill.name} tracked`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_allocations.${skill.id}`} compact /></div>
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
    <SyncOverrideBar compact title="ESO skill snapshot connected" description="Turn overrides on to test local ranks and purchases. Temporary build-step retirement remains available without overriding ESO ownership." />
    <section className="panel line-rank-panel">
      <div><span className="eyebrow">Current line rank</span><h2>{rank}/{line.max || 50}</h2></div>
      <div className="synced-control"><NumberStepper value={rank} min={0} max={line.max || 50} onChange={value => setSkillRank(line.id, value)} label={`${line.name} rank`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_ranks.${line.id}`} compact /></div>
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
