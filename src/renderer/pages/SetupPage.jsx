import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import InfoPopover from '../components/InfoPopover'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'

function HelpCopy({ info }) {
  if (!info) return <>No additional guidance is included in this build file.</>
  if (typeof info === 'string') return <>{info}</>
  return <>{info.summary && <p>{info.summary}</p>}{info.recommended && <p><b>Build recommendation:</b> {info.recommended}</p>}{info.alternatives?.length > 0 && <p><b>Strong alternatives:</b> {info.alternatives.join(', ')}</p>}{info.locations?.length > 0 && <p><b>Where to find it:</b> {info.locations.join('; ')}</p>}{info.notes?.length > 0 && <ul>{info.notes.map(note => <li key={note}>{note}</li>)}</ul>}</>
}

export default function SetupPage() {
  const { character, build } = useApp()
  if (!character || !build) return <EmptyState />
  const defaults = build.defaults || {}
  const help = build.setup_help || {}
  const attributes = attributeSummary(character, build)
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

  return <div className="page">
    <div className="page-title"><span className="eyebrow">Foundation</span><h1>Basic setup</h1><p>Your profile records what the character actually is. The build cards explain what the guide recommends and why.</p></div>
    <div className="setup-cards">{cards.map(card => <article className="stat-card setup-stat-card" key={card.key}>
      <div className="stat-card-head"><small>{card.label}</small>{help[card.key] && <InfoPopover title={card.label}><HelpCopy info={help[card.key]} /></InfoPopover>}</div>
      <strong>{card.value}</strong>
      {card.recommended && card.value !== card.recommended && <em>Build recommends {card.recommended}</em>}
      {(card.key === 'race' || card.key === 'alliance') && <NavLink to="/settings">Edit character profile</NavLink>}
    </article>)}</div>

    <section className="panel attributes-panel">
      <div><span className="eyebrow">Attributes</span><h2>Recorded split versus build target</h2><p>The solid bar is what this character has recorded. The marker is the build target{build.active_variant?.changes?.includes('defaults') ? ' for this variant' : ''}. Edit the split under Settings → Character Settings.</p></div>
      <div className="attribute-bars">{ATTRIBUTE_KEYS.map(key => {
        const label = key.charAt(0).toUpperCase() + key.slice(1), actual = attributes.actual[key], target = attributes.target[key]
        return <div key={key}><span><b>{label}</b><strong>{actual}/64{target !== actual ? ` · target ${target}` : ''}</strong></span><div className={`attribute-bar ${key}`}><i style={{ width: `${Math.min(100, actual / 64 * 100)}%` }} />{target > 0 && <u style={{ left: `${Math.min(100, target / 64 * 100)}%` }} title={`Build target ${target}`} />}</div></div>
      })}</div>
      <small className="attribute-foot">{attributes.spent} of {attributes.available} points recorded at level {character.level}{attributes.matchesTarget ? ' · matches the build target' : ''}</small>
    </section>
    {(build.concepts || []).length > 0 && <section className="section-block"><div className="section-head"><div><span className="eyebrow">How it works</span><h2>Build concepts</h2></div></div><div className="concept-grid">{build.concepts.map(concept => <article className="panel" key={concept.title}><h3>{concept.title}</h3><p>{concept.text}</p></article>)}</div></section>}
  </div>
}
