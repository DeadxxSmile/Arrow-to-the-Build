import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import companionCatalog from '../../../resources/data/eso-companions.json'
import { buildCompanionTargets, selectedCompanionTarget, withCompanionTarget } from '../utils/companionLogic'

function RoleBadge({ role }) {
  return <span className={`companion-role role-${String(role || '').toLowerCase()}`}>{role || 'flex'}</span>
}

function setupOptions(companion, build) {
  if (!companion) return []
  const authored = buildCompanionTargets(build, companion.id).map(entry => ({
    ...entry,
    option_id: `build:${entry.id}`,
    target_id: entry.id,
    origin: 'build'
  }))
  const authoredPresetIds = new Set(authored.flatMap(entry => [entry.id, entry.preset_id].filter(Boolean)))
  const presets = (companion.builds || [])
    .filter(preset => !authoredPresetIds.has(preset.id))
    .map(preset => ({
      ...preset,
      option_id: `preset:${preset.id}`,
      target_id: preset.id,
      origin: 'preset'
    }))
  return [...authored, ...presets]
}

function DetailValue({ label, value }) {
  return <div className="companion-detail-value"><small>{label}</small><strong>{value || 'Not specified'}</strong></div>
}

export default function CompanionsPage() {
  const { character, build, updateCharacter } = useApp()
  const defaultCompanion = companionCatalog.companions[0]?.id || ''
  const [companionId, setCompanionId] = useState(defaultCompanion)
  const [setupKey, setSetupKey] = useState('')

  const companion = useMemo(
    () => companionCatalog.companions.find(row => row.id === companionId) || companionCatalog.companions[0],
    [companionId]
  )
  const options = useMemo(() => setupOptions(companion, build), [companion, build])

  useEffect(() => {
    if (!character) return
    const firstSavedCompanion = companionCatalog.companions.find(row => selectedCompanionTarget(character, row.id))
    setCompanionId(firstSavedCompanion?.id || defaultCompanion)
  }, [character?.id, defaultCompanion])

  useEffect(() => {
    if (!character || !companion) return
    const saved = selectedCompanionTarget(character, companion.id)
    const preferred = options.find(option => option.target_id === saved) || options[0]
    setSetupKey(preferred?.option_id || '')
  }, [character?.id, companion?.id, options])

  if (!character || !build || !companion) return <EmptyState />

  const setup = options.find(option => option.option_id === setupKey) || options[0]
  const savedTarget = selectedCompanionTarget(character, companion.id)
  const isSaved = !!setup && savedTarget === setup.target_id

  const chooseSetup = async optionId => {
    const nextSetup = options.find(option => option.option_id === optionId)
    setSetupKey(optionId)
    if (!nextSetup) return
    await updateCharacter({ companion_progress: withCompanionTarget(character.companion_progress, companion.id, nextSetup.target_id) })
  }

  return <div className="page companions-page">
    <div className="page-title">
      <span className="eyebrow">Combat support</span>
      <h1>Companions</h1>
      <p>Choose the companion you want to plan for, then pick one of its recommended setups or a setup authored in the current build. The full loadout stays visible below instead of being squeezed into selection cards.</p>
    </div>

    <section className="panel companion-selector-panel">
      <label>
        <span>Companion</span>
        <select value={companion.id} onChange={event => setCompanionId(event.target.value)}>
          {companionCatalog.companions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <small>{companion.race} · {companion.class} · Strong fits: {companion.strengths.join(', ')}</small>
      </label>
      <label>
        <span>Build</span>
        <select value={setup?.option_id || ''} onChange={event => chooseSetup(event.target.value)} disabled={!options.length}>
          {options.map(option => <option key={option.option_id} value={option.option_id}>{option.origin === 'build' ? 'Current build: ' : 'ATTB preset: '}{option.name}</option>)}
        </select>
        <small>{isSaved ? `Saved as ${character.name}'s target for ${companion.short_name || companion.name}.` : 'Changing this build saves it as this character\'s target.'}</small>
      </label>
    </section>

    {setup ? <section className="panel companion-detail-panel">
      <header className="companion-detail-header">
        <div>
          <span className="eyebrow">{setup.origin === 'build' ? 'Current build setup' : 'Recommended companion setup'}</span>
          <h2>{companion.name}</h2>
          <h3>{setup.name}</h3>
          <p>{setup.summary || `A ${setup.role || 'flexible'} setup for ${companion.short_name || companion.name}.`}</p>
        </div>
        <div className="companion-detail-status">
          <RoleBadge role={setup.role} />
          {isSaved && <span className="mini-tag final">CHARACTER TARGET</span>}
        </div>
      </header>

      <div className="companion-detail-grid">
        <article className="companion-detail-section">
          <span className="eyebrow">Equipment</span>
          <h3>Gear direction</h3>
          <div className="companion-loadout-grid">
            <DetailValue label="Weapon" value={setup.weapon} />
            <DetailValue label="Armor weight" value={setup.armor_weight} />
            <DetailValue label="Weapon trait" value={setup.weapon_trait} />
            <DetailValue label="Armor trait" value={setup.armor_trait} />
            <DetailValue label="Jewelry trait" value={setup.jewelry_trait} />
          </div>
          {(setup.equipment || []).length > 0 && <div className="companion-guidance-list">
            <b>Equipment notes</b>
            <ul>{setup.equipment.map(note => <li key={note}>{note}</li>)}</ul>
          </div>}
        </article>

        <article className="companion-detail-section">
          <span className="eyebrow">Combat bar</span>
          <h3>Ability priority</h3>
          <p>Companions work from left to right when abilities are ready, so slot order is part of the build.</p>
          <ol className="companion-skill-priority">
            {(setup.skills || []).map((skill, index) => <li key={`${skill}-${index}`}><span>{index + 1}</span><strong>{skill}</strong></li>)}
          </ol>
          <div className="companion-ultimate-row"><span>U</span><div><small>Ultimate</small><strong>{setup.ultimate || 'Not specified'}</strong></div></div>
        </article>

        <article className="companion-detail-section companion-detail-wide">
          <span className="eyebrow">How to use it</span>
          <h3>Build notes</h3>
          {(setup.notes || []).length > 0
            ? <ul className="companion-notes-list">{setup.notes.map(note => <li key={note}>{note}</li>)}</ul>
            : <p>No extra playstyle notes are attached to this setup.</p>}
          {setup.source_url && <button type="button" className="btn ghost" onClick={() => window.api.external.open(setup.source_url)}>Open research source ↗</button>}
        </article>
      </div>
    </section> : <section className="panel quiet-box">No companion build is available for this companion yet.</section>}
  </div>
}
