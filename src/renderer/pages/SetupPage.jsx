import { useApp } from '../App'
import { displayVariantName } from '../utils/variantLogic'
import EmptyState from './EmptyState'
import InfoPopover from '../components/InfoPopover'
import CachedImage from '../components/CachedImage'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'

const ATTRIBUTE_LABEL = { magicka: 'Magicka', health: 'Health', stamina: 'Stamina' }

function HelpCopy({ info }) {
  if (!info) return <>No additional guidance is included in this build file.</>
  if (typeof info === 'string') return <>{info}</>
  return <>{info.summary && <p>{info.summary}</p>}{info.recommended && <p><b>Build recommendation:</b> {info.recommended}</p>}{info.alternatives?.length > 0 && <p><b>Strong alternatives:</b> {info.alternatives.join(', ')}</p>}{info.locations?.length > 0 && <p><b>Where to find it:</b> {info.locations.join('; ')}</p>}{info.notes?.length > 0 && <ul>{info.notes.map(note => <li key={note}>{note}</li>)}</ul>}</>
}

function SpecRow({ label, value, help }) {
  if (value === null || value === undefined || value === '') return null
  return <div className="character-spec-row">
    <span>{label}</span>
    <b>{value}</b>
    <span className="character-spec-help">{help ? <InfoPopover title={label}><HelpCopy info={help} /></InfoPopover> : null}</span>
  </div>
}


function compactWeapon(value) {
  return String(value || '').replace(/\s+at\s+Level\s+\d+\s*$/i, '').trim()
}

function classDirection(build, className) {
  const cfg = build?.class_configuration || {}
  const active = Array.isArray(cfg.active_class_lines) ? cfg.active_class_lines : []
  const foreign = active.filter(line => line?.source_class && line.source_class !== className)
  if (!foreign.length) return `Pure ${className || 'class'}`
  const names = [...new Set(foreign.map(line => line.source_class).filter(Boolean))]
  return names.length ? `${className} + ${names.join(' / ')}` : 'Subclassed'
}

function SyncedSnapshot({ character }) {
  if (!character?.addon_sync?.linked) return null
  const identity = character.addon_sync.observed?.identity || {}
  const power = identity.attributes || {}
  const totalCp = Number(identity.championPointsEarned || identity.championPoints || (character.cp_craft + character.cp_warfare + character.cp_fitness) || 0)
  const snapshotFacts = [
    ['Level', character.level],
    ['Champion Points', totalCp.toLocaleString()],
    ['Skill Points Available', character.actual_unspent_skill_points || 0],
    ['Attribute Points Available', character.actual_unspent_attribute_points || 0]
  ]
  const powers = ATTRIBUTE_KEYS.map(key => {
    const item = power[key]?.power
    const value = Number(item?.effectiveMaximum ?? item?.maximum)
    return Number.isFinite(value) && value > 0 ? [ATTRIBUTE_LABEL[key], value.toLocaleString()] : null
  }).filter(Boolean)

  return <section className="panel basic-snapshot-panel">
    <div className="section-head"><div><span className="eyebrow">Latest ESO snapshot</span><h2>Character at a glance</h2><p>Observed values from the linked character. Build targets stay separate.</p></div><div className="snapshot-identity"><b>{character.addon_sync.account_name}</b><span>{character.addon_sync.world_name}</span></div></div>
    <div className="snapshot-fact-strip">{snapshotFacts.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
    {(identity.zone?.name || powers.length > 0) && <div className="snapshot-secondary-row">
      {identity.zone?.name && <span><small>Last known zone</small><b>{identity.zone.name}</b></span>}
      {powers.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}
      <span><small>Snapshot</small><b>{character.addon_sync.captured_at ? new Date(character.addon_sync.captured_at * 1000).toLocaleString() : 'Waiting for ESO'}</b></span>
    </div>}
  </section>
}

export default function SetupPage() {
  const { character, build, esoPlus } = useApp()
  if (!character || !build) return <EmptyState />

  const defaults = build.defaults || {}
  const help = build.setup_help || {}
  const attributes = attributeSummary(character, build)
  const variant = build.active_variant
  const heroSource = character.portrait_ref || build.images?.hero
  const infoGroups = [
    {
      title: 'Identity & role',
      rows: [
        ['Class', defaults.class, help.class],
        ['Race', character.race || 'Not set', help.race],
        ['Alliance', character.alliance || 'Not set', help.alliance],
        ['Mundus', defaults.mundus, help.mundus]
      ]
    },
    {
      title: 'Combat setup',
      rows: [
        ['Main weapon', compactWeapon(defaults.front_weapon), help.front_weapon],
        ['Back weapon', compactWeapon(defaults.back_weapon), help.back_weapon],
        ['Leveling armor', defaults.leveling_armor, help.leveling_armor],
        ['Endgame armor', defaults.endgame_armor, help.endgame_armor]
      ]
    },
    {
      title: 'Attributes',
      rows: [
        ['Magicka', attributes.target.magicka, { summary: 'Recommended Level 50 attribute-point target. Current points are recorded under Current Levels.' }],
        ['Health', attributes.target.health, { summary: 'Recommended Level 50 attribute-point target. Current points are recorded under Current Levels.' }],
        ['Stamina', attributes.target.stamina, { summary: 'Recommended Level 50 attribute-point target. Current points are recorded under Current Levels.' }],
        ['Subclass', classDirection(build, defaults.class), { summary: 'Shows whether the build keeps all three native class lines or uses foreign subclass lines.' }]
      ]
    }
  ]

  return <div className="page basic-info-page">
    <section className="hero-panel character-hero" style={{ '--build-accent': build.theme?.accent || 'var(--color-accent-primary)' }}>
      <div className="hero-copy">
        <span className="eyebrow">{[defaults.class, character.race || defaults.race, character.alliance || defaults.alliance].filter(Boolean).join(' · ')}</span>
        <h1>{character.name}</h1>
        <p>{build.summary}</p>
        <div className="badge-row">{[defaults.mundus, defaults.front_weapon, defaults.back_weapon].filter(Boolean).map(value => <span key={value}>{value}</span>)}{variant && <span title={variant.summary || ''}>{displayVariantName(variant)}</span>}{esoPlus && <span className="plus">ESO Plus</span>}</div>
      </div>
      <CachedImage src={heroSource} alt={character.portrait_ref ? `${character.name} screenshot` : build.name} className={`hero-image character-hero-image ${character.portrait_ref ? 'user-screenshot' : 'build-artwork'}`} fallback="none" />
    </section>

    <div className="page-title setup-title"><span className="eyebrow">Character foundation</span><h1>Basic info</h1><p>Your build identity, combat direction, and core character information at a glance.</p></div>

    <section className="character-profile-sheet" aria-label="Character and build profile">
      <div className="character-spec-grid">{infoGroups.map(group => <section className="character-spec-group" key={group.title}><h2>{group.title}</h2><div>{group.rows.map(([label, value, info]) => <SpecRow key={label} label={label} value={value} help={info} />)}</div></section>)}</div>
    </section>

    <SyncedSnapshot character={character} />

    {(build.concepts || []).length > 0 && <section className="panel build-concepts-ledger">
      <div className="section-head"><div><span className="eyebrow">Build concepts</span><h2>Why the setup works</h2><p>Short explanations for the ideas the rest of the build assumes you understand.</p></div></div>
      <div className="concept-ledger">{build.concepts.map(concept => <div key={concept.title}><h3>{concept.title}</h3><p>{concept.text}</p></div>)}</div>
    </section>}

    {String(build.notes || '').trim() && <section className="panel build-notes-display"><div className="section-head"><div><span className="eyebrow">Author notes</span><h2>Build notes</h2></div></div><div className="build-notes-copy">{build.notes}</div></section>}
  </div>
}
