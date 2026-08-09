import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'
import { displayVariantName } from '../utils/variantLogic'
import EmptyState from './EmptyState'
import InfoPopover from '../components/InfoPopover'
import CachedImage from '../components/CachedImage'
import CharacterBuildSetupModal from '../components/CharacterBuildSetupModal'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'

function HelpCopy({ info }) {
  if (!info) return <>No additional guidance is included in this build file.</>
  if (typeof info === 'string') return <>{info}</>
  return <>{info.summary && <p>{info.summary}</p>}{info.recommended && <p><b>Build recommendation:</b> {info.recommended}</p>}{info.alternatives?.length > 0 && <p><b>Strong alternatives:</b> {info.alternatives.join(', ')}</p>}{info.locations?.length > 0 && <p><b>Where to find it:</b> {info.locations.join('; ')}</p>}{info.notes?.length > 0 && <ul>{info.notes.map(note => <li key={note}>{note}</li>)}</ul>}</>
}

export default function SetupPage() {
  const { character, build, esoPlus, editor, characterBuilds, switchWorkspace, appSettings } = useApp()
  const syncedClass = character?.addon_sync?.class_name || build?.defaults?.class || ''
  const eligibleTargets = useMemo(() => (characterBuilds || []).filter(item => !item.class_name || !syncedClass || item.class_name === syncedClass), [characterBuilds, syncedClass])
  const [adaptTarget, setAdaptTarget] = useState(() => character?.build_id || '')
  const [buildAction, setBuildAction] = useState('')
  const [buildActionError, setBuildActionError] = useState('')
  const [createSetupOpen, setCreateSetupOpen] = useState(false)
  const buildToolsStorageKey = `attb-build-planning-hidden:${character?.id || 'none'}`
  const [buildToolsHidden, setBuildToolsHidden] = useState(() => localStorage.getItem(buildToolsStorageKey) === 'true')
  useEffect(() => { setBuildToolsHidden(localStorage.getItem(buildToolsStorageKey) === 'true') }, [buildToolsStorageKey])
  const setBuildToolsVisibility = hidden => { setBuildToolsHidden(hidden); localStorage.setItem(buildToolsStorageKey, String(hidden)) }
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
  const openImportedDraft = async (mode, options = {}) => {
    if (!character?.addon_sync?.linked || buildAction) return
    setBuildActionError('')
    setBuildAction(mode)
    try {
      if (mode === 'create') await editor.createFromCharacter(character.id, options)
      else {
        if (!adaptTarget) throw new Error('Choose the target build you want to adapt first.')
        await editor.adaptFromCharacter(character.id, adaptTarget)
      }
      setCreateSetupOpen(false)
      setBuildToolsVisibility(true)
      switchWorkspace('build-editor', '/build-editor/overview')
    } catch (error) {
      setBuildActionError(error.message || String(error))
    } finally {
      setBuildAction('')
    }
  }

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
    <section className="hero-panel" style={{ '--hero-accent': build.theme?.accent || 'var(--accent)' }}>
      <div className="hero-copy">
        <span className="eyebrow">{[defaults.class, defaults.race, defaults.alliance].filter(Boolean).join(' · ')}</span>
        <h1>{character.name}</h1><p>{build.summary}</p>
        <div className="badge-row">{[defaults.mundus, defaults.front_weapon, defaults.back_weapon].filter(Boolean).map(value => <span key={value}>{value}</span>)}{variant && <span title={variant.summary || ''}>{displayVariantName(variant)}</span>}{esoPlus && <span className="plus">ESO Plus</span>}</div>
      </div>
      <CachedImage src={build.images?.hero} alt={build.name} className="hero-image" fallback="none" />
    </section>

    <div className="page-title setup-title"><span className="eyebrow">Foundation</span><h1>Basic setup</h1><p>This page is the build reference: what the guide recommends, why it recommends it, and the Level 50 attribute target. Record the character's current numbers under Current Levels.</p></div>
    {character.addon_sync?.linked && !buildToolsHidden && <section className="panel character-build-bridge">
      <div className="character-build-bridge-copy"><span className="eyebrow">Build planning tools</span><h2>Create another plan or adapt a target</h2><p>Start a fresh editable build from this character's latest CURRENT ESO state, or adapt an existing build as the TARGET while preserving the character's real progression underneath it.</p><small>Imported skills are marked as owned, catch-up, or future without inventing when older progression happened.</small></div>
      <div className="character-build-actions">
        <button type="button" className="btn primary" disabled={!!buildAction} onClick={() => { setBuildActionError(''); setCreateSetupOpen(true) }}>{buildAction === 'create' ? 'Creating…' : 'Create Build from Character'}</button>
        <div className="adapt-build-row"><select aria-label="Target build to adapt" value={adaptTarget} onChange={event => setAdaptTarget(event.target.value)} disabled={!!buildAction}><option value="">Choose target build…</option>{eligibleTargets.map(item => <option key={item.id} value={item.id}>{item.name}{item.is_bundled ? ' · ATTB' : ' · My build'}</option>)}</select><button type="button" className="btn secondary" disabled={!!buildAction || !adaptTarget} onClick={() => openImportedDraft('adapt')}>{buildAction === 'adapt' ? 'Adapting…' : 'Adapt Build to Character'}</button></div>
        {buildActionError && <div className="inline-error" role="alert">{buildActionError}</div>}
        <button type="button" className="btn ghost compact character-build-dismiss" disabled={!!buildAction} onClick={() => setBuildToolsVisibility(true)}>Hide build planning tools</button>
      </div>
    </section>}
    {character.addon_sync?.linked && buildToolsHidden && <div className="build-tools-reveal"><span>Build planning tools hidden for this character.</span><button type="button" className="btn ghost compact" onClick={() => setBuildToolsVisibility(false)}>Show build planning tools</button></div>}

    <div className="setup-cards">{cards.map(card => <article className="stat-card setup-stat-card" key={card.key}>
      <div className="stat-card-head"><small>{card.label}</small>{help[card.key] && <InfoPopover title={card.label}><HelpCopy info={help[card.key]} /></InfoPopover>}</div>
      <strong>{card.value}</strong>
      {card.recommended && card.value !== card.recommended && <em>Build recommends {card.recommended}</em>}
      {(card.key === 'race' || card.key === 'alliance') && <NavLink to="/settings?tab=character">Edit character profile</NavLink>}
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

    {String(build.notes || '').trim() && <section className="panel build-notes-display"><div className="section-head"><div><span className="eyebrow">Author notes</span><h2>Build notes</h2></div></div><div className="build-notes-copy">{build.notes}</div></section>}

    <CharacterBuildSetupModal
      open={createSetupOpen}
      character={{ name: character.name, class_name: syncedClass, level: character.level, attributes: character.attributes }}
      defaultAuthor={appSettings.build_editor_default_author || 'NPC'}
      title={`Create a new build for ${character.name}`}
      submitLabel="Create Build from Character"
      busy={buildAction === 'create'}
      error={createSetupOpen ? buildActionError : ''}
      onClose={() => { if (!buildAction) setCreateSetupOpen(false) }}
      onSubmit={form => openImportedDraft('create', form)}
    />
  </div>
}
