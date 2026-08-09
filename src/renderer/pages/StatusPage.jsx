import { useApp } from '../App'
import EmptyState from './EmptyState'
import NumberStepper from '../components/NumberStepper'
import AttributesEditor from '../components/AttributesEditor'
import { applyAllocationChange } from '../utils/buildLogic'
import { effectiveAllocation, effectiveSkillMaxPoints } from '../utils/catalogLogic'
import OverrideResetButton, { overrideEntry } from '../components/OverrideResetButton'

const CP_FIELDS = [
  ['craft', 'Craft CP', 'cp_craft'],
  ['warfare', 'Warfare CP', 'cp_warfare'],
  ['fitness', 'Fitness CP', 'cp_fitness']
]

export default function StatusPage() {
  const { character, build, skillGroups, updateCharacter, setSkillRank, setSkillTracking, appSettings } = useApp()
  if (!character || !build) return <EmptyState />
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'

  const multiRankPassives = skillGroups.map(([group, lines]) => [group, lines.map(line => ({
    line,
    passives: (line.skills || []).filter(skill => skill.type === 'Passive' && effectiveSkillMaxPoints(character, skill) > 1)
  })).filter(entry => entry.passives.length)]).filter(([, lines]) => lines.length)

  const updatePassive = (line, skill, points) => {
    const effectiveSkill = { ...skill, max_points: effectiveSkillMaxPoints(character, skill) }
    const { allocations, completed } = applyAllocationChange(build, character, line.id, effectiveSkill, points, line.skills || [])
    return setSkillTracking(allocations, completed)
  }

  return <div className="page current-levels-page">
    <div className="page-title"><span className="eyebrow">Live numeric progress</span><h1>Current levels</h1><p>{character.addon_sync?.linked ? 'Values below are synced from ESO. Override mode can temporarily replace individual fields without losing the live value.' : 'Record the numbers this character actually has right now. Build recommendations stay on Basic Setup, Skills & Passives, and Champion Points.'}</p></div>
    {character.addon_sync?.linked && <div className="sync-status-banner"><span className="sync-dot" /><div><b>ESO addon connected</b><small>{character.addon_sync.world_name} · Last snapshot {character.addon_sync.captured_at ? new Date(character.addon_sync.captured_at * 1000).toLocaleString() : 'not yet written'}</small></div>{syncedLocked && <em>Overrides off</em>}</div>}

    <section className="panel current-core-panel">
      <div className="section-head"><div><span className="eyebrow">Character progression</span><h2>Level, Champion Points &amp; available points</h2></div></div>
      <div className="progression-editor">
        <div className="progression-column">
          <div className="progression-subhead"><b>Character</b><small>Level and unspent points.</small></div>
          <div className={`progression-row level ${overrideEntry(character, 'level') ? 'overridden' : ''}`}><div><b>Character Level</b><small>{character.addon_sync?.linked ? `Live ESO ${character.addon_sync.live?.level ?? character.level}` : 'Current character level'}</small></div><div className="synced-control"><NumberStepper value={character.level} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" disabled={syncedLocked} /><OverrideResetButton fieldPath="level" compact /></div></div>
          <div className={`progression-row skill-points ${overrideEntry(character, 'actual_unspent_skill_points') ? 'overridden' : ''}`}><div><b>Available Skill Points</b><small>{character.addon_sync?.linked ? `Live ESO ${character.addon_sync.live?.actual_unspent_skill_points ?? character.actual_unspent_skill_points ?? 0}` : 'Unspent skill points'}</small></div><div className="synced-control"><NumberStepper value={character.actual_unspent_skill_points || 0} min={0} max={10000} onChange={actual_unspent_skill_points => updateCharacter({ actual_unspent_skill_points })} label="Available Skill Points" disabled={syncedLocked} /><OverrideResetButton fieldPath="actual_unspent_skill_points" compact /></div></div>
          <div className={`progression-row attribute-points ${overrideEntry(character, 'actual_unspent_attribute_points') ? 'overridden' : ''}`}><div><b>Available Attribute Points</b><small>{character.addon_sync?.linked ? `Live ESO ${character.addon_sync.live?.actual_unspent_attribute_points ?? character.actual_unspent_attribute_points ?? 0}` : 'Unspent attribute points'}</small></div><div className="synced-control"><NumberStepper value={character.actual_unspent_attribute_points || 0} min={0} max={64} onChange={actual_unspent_attribute_points => updateCharacter({ actual_unspent_attribute_points })} label="Available Attribute Points" disabled={syncedLocked} /><OverrideResetButton fieldPath="actual_unspent_attribute_points" compact /></div></div>
        </div>
        <div className="progression-column cp-column">
          <div className="progression-subhead"><b>Champion Points</b><small>Tracked by constellation even before Level 50.</small></div>
          {CP_FIELDS.map(([tree, label, field]) => <div className={`progression-row ${tree} ${overrideEntry(character, field) ? 'overridden' : ''}`} key={field}><div><b>{label.replace(' CP', '')}</b><small>{character.addon_sync?.linked ? `Live ESO ${character.addon_sync.live?.[field] ?? character[field] ?? 0}` : 'Current points'}</small></div><div className="synced-control"><NumberStepper value={character[field] || 0} min={0} max={1200} onChange={value => updateCharacter({ [field]: value })} label={label} disabled={syncedLocked} /><OverrideResetButton fieldPath={field} compact /></div></div>)}
        </div>
      </div>
    </section>

    <AttributesEditor character={character} build={build} onChange={attributes => updateCharacter({ attributes })} allowOverrides={!syncedLocked} />

    <section className="panel numeric-tracking-panel">
      <div className="section-head"><div><span className="eyebrow">Skill-line progression</span><h2>Current line ranks</h2></div><p>Use this page for fast numeric entry. Ability purchases and morph choices remain under Skills &amp; Passives.</p></div>
      <div className="numeric-groups">{skillGroups.map(([group, lines]) => <section className="numeric-group" key={group}><header><h3>{group}</h3><span>{lines.length} line{lines.length === 1 ? '' : 's'}</span></header><div className="numeric-row-list">{lines.map(line => <label className="numeric-row" key={line.id}><span><b>{line.name}</b><small>{line.tracked_only ? 'Personal tracking' : 'Build-related line'}{character.addon_sync?.linked ? ` · Live ${character.addon_sync.live?.skill_ranks?.[line.id] ?? character.skill_ranks[line.id] ?? 0}` : ''}</small></span><div className="synced-control"><NumberStepper value={character.skill_ranks[line.id] ?? 0} min={0} max={line.max || 50} onChange={rank => setSkillRank(line.id, rank)} label={`${line.name} rank`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_ranks.${line.id}`} compact /></div></label>)}</div></section>)}</div>
    </section>

    <section className="panel numeric-tracking-panel">
      <div className="section-head"><div><span className="eyebrow">Passive progression</span><h2>Multi-rank passive levels</h2></div><p>Only passives with more than one purchasable rank appear here. One-rank purchases, active skills, morphs, and ultimates stay on their full skill-line pages.</p></div>
      {multiRankPassives.length ? <div className="numeric-groups passive-groups">{multiRankPassives.map(([group, lines]) => <section className="numeric-group" key={group}><header><h3>{group}</h3><span>{lines.reduce((sum, entry) => sum + entry.passives.length, 0)} passives</span></header><div className="numeric-row-list">{lines.flatMap(({ line, passives }) => passives.map(skill => {
        const maxPoints = effectiveSkillMaxPoints(character, skill)
        return <label className="numeric-row" key={skill.id}><span><b>{skill.name}</b><small>{line.name} · {maxPoints} ranks{character.addon_sync?.linked ? ` · Live ${character.addon_sync.live?.skill_allocations?.[skill.id] ?? 0}` : ''}</small></span><div className="synced-control"><NumberStepper value={effectiveAllocation(character, build, line.id, skill)} min={0} max={maxPoints} onChange={points => updatePassive(line, skill, points)} label={`${skill.name} passive rank`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_allocations.${skill.id}`} compact /></div></label>
      }))}</div></section>)}</div> : <div className="quiet-box">No multi-rank passives are available in the tracked skill lines.</div>}
    </section>
  </div>
}
