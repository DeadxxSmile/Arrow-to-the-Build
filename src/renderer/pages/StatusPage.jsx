import { useEffect, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import NumberStepper from '../components/NumberStepper'
import AttributesEditor from '../components/AttributesEditor'
import SyncOverrideBar from '../components/SyncOverrideBar'
import DisclosureSection, { DisclosureToolbar } from '../components/DisclosureSection'
import OverrideResetButton from '../components/OverrideResetButton'

const CP_FIELDS = [
  ['craft', 'Craft CP', 'cp_craft'],
  ['warfare', 'Warfare CP', 'cp_warfare'],
  ['fitness', 'Fitness CP', 'cp_fitness']
]

function MetricEditor({ label, hint, value, min, max, onChange, disabled, fieldPath }) {
  return <div className="progression-metric">
    <div><small>{label}</small><b>{value}</b><span>{hint}</span></div>
    <div className="synced-control"><NumberStepper value={value} min={min} max={max} onChange={onChange} label={label} disabled={disabled} /><OverrideResetButton fieldPath={fieldPath} compact /></div>
  </div>
}

export default function StatusPage() {
  const { character, build, skillGroups, updateCharacter, setSkillRank, appSettings } = useApp()
  const [openRanks, setOpenRanks] = useState(() => new Set(['Class']))

  useEffect(() => {
    if (!character) return
    setOpenRanks(current => current.size ? current : new Set(skillGroups[0]?.[0] ? [skillGroups[0][0]] : []))
  }, [character?.id, skillGroups])

  if (!character || !build) return <EmptyState />
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'

  const toggleSet = (setter, key) => setter(current => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  const rankGroupNames = skillGroups.map(([group]) => group)

  return <div className="page current-levels-page v3-current-levels-page">
    <div className="page-title"><span className="eyebrow">Current character state</span><h1>Current levels</h1><p>Record or review the character numbers that drive ATTB recommendations. Synced characters stay protected until you deliberately turn on overrides.</p></div>
    <SyncOverrideBar title="ESO progression is linked" description="The values on this page come from the latest ESO snapshot. Use the switch to temporarily test local changes without disconnecting the character." />

    <section className="panel progression-overview-panel">
      <div className="section-head"><div><span className="eyebrow">Progression overview</span><h2>Core totals</h2><p>The numbers you are most likely to update after a play session, together instead of split across separate tables.</p></div></div>
      <div className="progression-metric-grid">
        <MetricEditor label="Character level" hint={character.addon_sync?.linked ? `ESO: ${character.addon_sync.live?.level ?? character.level}` : 'Overall level'} value={character.level} min={1} max={50} onChange={level => updateCharacter({ level })} disabled={syncedLocked} fieldPath="level" />
        <MetricEditor label="Available Skill Points" hint="Unspent right now" value={character.actual_unspent_skill_points || 0} min={0} max={10000} onChange={actual_unspent_skill_points => updateCharacter({ actual_unspent_skill_points })} disabled={syncedLocked} fieldPath="actual_unspent_skill_points" />
        <MetricEditor label="Available Attribute Points" hint="Unspent right now" value={character.actual_unspent_attribute_points || 0} min={0} max={64} onChange={actual_unspent_attribute_points => updateCharacter({ actual_unspent_attribute_points })} disabled={syncedLocked} fieldPath="actual_unspent_attribute_points" />
        {CP_FIELDS.map(([tree, label, field]) => <MetricEditor key={field} label={label} hint={`${tree[0].toUpperCase() + tree.slice(1)} constellation`} value={character[field] || 0} min={0} max={1200} onChange={value => updateCharacter({ [field]: value })} disabled={syncedLocked} fieldPath={field} />)}
      </div>
    </section>

    <AttributesEditor character={character} build={build} onChange={attributes => updateCharacter({ attributes })} allowOverrides={!syncedLocked} />

    <section className="panel progression-disclosure-panel">
      <div className="section-head"><div><span className="eyebrow">Skill-line progression</span><h2>Current line ranks</h2><p>Open only the categories you need. Ability purchases and morph choices remain under Skills &amp; Passives.</p></div><DisclosureToolbar onExpandAll={() => setOpenRanks(new Set(rankGroupNames))} onCollapseAll={() => setOpenRanks(new Set())} expandDisabled={openRanks.size === rankGroupNames.length} collapseDisabled={!openRanks.size} /></div>
      <div className="progression-disclosures">{skillGroups.map(([group, lines]) => <DisclosureSection key={group} title={group} meta={`${lines.length} line${lines.length === 1 ? '' : 's'}`} open={openRanks.has(group)} onToggle={() => toggleSet(setOpenRanks, group)}>
        <div className="numeric-row-list v3-numeric-row-list">{lines.map(line => <div className="numeric-row" key={line.id}><span><b>{line.name}</b><small>{line.tracked_only ? 'Personal tracking' : 'Build-related line'}{character.addon_sync?.linked ? ` · ESO ${character.addon_sync.live?.skill_ranks?.[line.id] ?? character.skill_ranks[line.id] ?? 0}/${line.max || 50}` : ''}</small></span><div className="synced-control"><NumberStepper value={character.skill_ranks[line.id] ?? 0} min={0} max={line.max || 50} onChange={rank => setSkillRank(line.id, rank)} label={`${line.name} rank`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`skill_ranks.${line.id}`} compact /></div></div>)}</div>
      </DisclosureSection>)}</div>
    </section>

  </div>
}
