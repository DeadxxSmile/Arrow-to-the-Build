import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import InfoPopover from '../components/InfoPopover'
import CachedImage from '../components/CachedImage'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'

function HelpCopy({ info }) {
  if (!info) return <>No additional guidance is included in this build file.</>
  if (typeof info === 'string') return <>{info}</>
  return <>{info.summary && <p>{info.summary}</p>}{info.recommended && <p><b>Build recommendation:</b> {info.recommended}</p>}{info.alternatives?.length > 0 && <p><b>Strong alternatives:</b> {info.alternatives.join(', ')}</p>}{info.locations?.length > 0 && <p><b>Where to find it:</b> {info.locations.join('; ')}</p>}{info.notes?.length > 0 && <ul>{info.notes.map(note => <li key={note}>{note}</li>)}</ul>}</>
}

export default function SetupPage() {
  const { character, build, esoPlus } = useApp()
  if (!character || !build) return <EmptyState />
  const defaults = build.defaults || {}
  const help = build.setup_help || {}
  const attributes = attributeSummary(character, build)
  const variant = build.active_variant
  const targetProgress = attributes.targetTotal > 0 ? Math.min(100, attributes.spent / attributes.targetTotal * 100) : 100
  const buildProgressNote = attributes.matchesTarget
    ? 'Target split matched'
    : attributes.spent < attributes.targetTotal
      ? `${attributes.targetTotal - attributes.spent} point${attributes.targetTotal - attributes.spent === 1 ? '' : 's'} remaining`
      : attributes.spent === attributes.targetTotal
        ? 'Full total recorded; split differs'
        : `${attributes.spent - attributes.targetTotal} point${attributes.spent - attributes.targetTotal === 1 ? '' : 's'} over target`
  const cards = [
    { key: 'class', label: 'Class', value: defaults.class, recommended: defaults.class },
    { key: 'race', label: 'Race', value: character.race || 'Not set', recommended: defaults.race },
    { key: 'alliance', label: 'Alliance', value: character.alliance || 'Not set', recommended: defaults.alliance },
    { key: 'mundus', label: 'Mundus', value: defaults.mundus },
    { key: 'front_weapon', label: 'Front weapon', value: defaults.front_weapon },
    { key: 'back_weapon', label: 'Back weapon', value: defaults.back_weapon },
    { key: 'leveling_armor', label: 'Leveling armor', value: defaults.leveling_armor },
    { key: 'endgame_armor', label: 'Endgame armor', value: defaults.endgame_armor },
    { key: 'leveling_trait', label: 'Leveling trait', value: defaults.leveling_trait },
    { key: 'gear_cap', label: 'Permanent gear begins', value: defaults.gear_cap }
  ].filter(card => card.value)

  return <div className="page basic-setup-page">
    <section className="hero-panel" style={{ '--hero-accent': build.theme?.accent || '#69e891' }}>
      <div className="hero-copy">
        <span className="eyebrow">{[defaults.class, defaults.race, defaults.alliance].filter(Boolean).join(' · ')}</span>
        <h1>{character.name}</h1><p>{build.summary}</p>
        <div className="badge-row">{[defaults.mundus, defaults.front_weapon, defaults.back_weapon].filter(Boolean).map(value => <span key={value}>{value}</span>)}{variant && <span title={variant.summary || ''}>{variant.name}{variant.changes?.length ? '' : ' (base)'}</span>}{esoPlus && <span className="plus">ESO Plus</span>}</div>
      </div>
      <CachedImage src={build.images?.hero} alt={build.name} className="hero-image" fallback="none" />
    </section>

    <div className="page-title setup-title"><span className="eyebrow">Foundation</span><h1>Basic setup</h1><p>This page is the build reference: what the guide recommends, why it recommends it, and the Level 50 attribute target. Record the character's current numbers under Current Levels.</p></div>
    <div className="setup-cards">{cards.map(card => <article className="stat-card setup-stat-card" key={card.key}>
      <div className="stat-card-head"><small>{card.label}</small>{help[card.key] && <InfoPopover title={card.label}><HelpCopy info={help[card.key]} /></InfoPopover>}</div>
      <strong>{card.value}</strong>
      {card.recommended && card.value !== card.recommended && <em>Build recommends {card.recommended}</em>}
      {(card.key === 'race' || card.key === 'alliance') && <NavLink to="/settings">Edit character profile</NavLink>}
    </article>)}</div>

    <section className="panel build-attribute-target">
      <div className="build-target-copy"><span className="eyebrow">Build attribute target</span><h2>Recommended Level 50 split</h2><p>This is the build goal from the JSON file, not the character's recorded allocation. Changing builds or variants can change this target without changing the points entered under Current Levels.</p></div>
      <div className="attribute-bars target-only">{ATTRIBUTE_KEYS.map(key => {
        const label = key.charAt(0).toUpperCase() + key.slice(1)
        const target = attributes.target[key]
        return <div key={key}>
          <span><b>{label}</b><strong>{target}/64 target</strong></span>
          <div className={`attribute-bar ${key}`}><i style={{ width: `${Math.min(100, target / 64 * 100)}%` }} /></div>
          <small>Recorded {attributes.actual[key]} of {target}</small>
        </div>
      })}</div>
      <div className={`build-progress-card ${attributes.matchesTarget ? 'complete' : ''}`}>
        <small>Build Progress</small>
        <b>{attributes.spent}/{attributes.targetTotal}</b>
        <span>attribute points recorded</span>
        <div className="build-progress-meter" aria-hidden="true"><i style={{ width: `${targetProgress}%` }} /></div>
        <em>{buildProgressNote}</em>
      </div>
    </section>

    {(build.concepts || []).length > 0 && <section className="section-block"><div className="section-head"><div><span className="eyebrow">How it works</span><h2>Build concepts</h2></div></div><div className="concept-grid">{build.concepts.map(concept => <article className="panel" key={concept.title}><h3>{concept.title}</h3><p>{concept.text}</p></article>)}</div></section>}
  </div>
}
