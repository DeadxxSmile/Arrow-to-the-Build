import React, { useEffect, useMemo, useRef, useState } from 'react'
import NumberStepper from './NumberStepper'
import { applyVariant, availableVariants } from '../utils/variantLogic'
import { ATTRIBUTE_KEYS, attributePointsForLevel, attributeTotal, readAttributes } from '../utils/buildLogic'

export const ESO_RACES = ['High Elf', 'Argonian', 'Wood Elf', 'Breton', 'Dark Elf', 'Imperial', 'Khajiit', 'Nord', 'Orc', 'Redguard']
export const ESO_ALLIANCES = ['Aldmeri Dominion', 'Daggerfall Covenant', 'Ebonheart Pact']
const ZERO_ATTRIBUTES = { magicka: 0, health: 0, stamina: 0 }
const EMPTY = { name: '', build_id: '', variant_id: '', race: '', alliance: '', level: 1, attributes: ZERO_ATTRIBUTES, cp_craft: 0, cp_warfare: 0, cp_fitness: 0 }
const ATTRIBUTE_LABEL = { magicka: 'Magicka', health: 'Health', stamina: 'Stamina' }
const emptyForm = buildId => ({ ...EMPTY, build_id: buildId, attributes: { ...ZERO_ATTRIBUTES } })

export default function CharacterModal({ open, builds, onClose, onCreated, onImported, firstCharacter = false }) {
  const [form, setForm] = useState(() => emptyForm(''))
  const [selectedBuild, setSelectedBuild] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nameRef = useRef(null)
  const variants = useMemo(() => availableVariants(selectedBuild), [selectedBuild])
  const attributes = readAttributes(form.attributes)
  const availableAttributes = attributePointsForLevel(form.level)
  const spentAttributes = attributeTotal(attributes)
  const selectedBuildView = useMemo(() => applyVariant(selectedBuild, form.variant_id), [selectedBuild, form.variant_id])
  const buildTarget = readAttributes(selectedBuildView?.defaults?.attributes)

  const loadBuild = async buildId => {
    if (!buildId) { setSelectedBuild(null); return }
    const record = await window.api.builds.get(buildId)
    const data = record?.data || null
    setSelectedBuild(data)
    if (data) setForm(current => ({
      ...current,
      build_id: buildId,
      variant_id: availableVariants(data)[0]?.id || '',
      race: data.defaults?.race || current.race || ESO_RACES[0],
      alliance: data.defaults?.alliance || current.alliance || ESO_ALLIANCES[0]
    }))
  }

  useEffect(() => {
    if (!open) return
    setError('')
    const buildId = form.build_id || builds[0]?.id || ''
    setForm(emptyForm(buildId))
    loadBuild(buildId).catch(error => setError(error.message))
    requestAnimationFrame(() => nameRef.current?.focus())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, builds])

  useEffect(() => {
    if (!open) return
    const onKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setAttribute = (key, value) => setForm(current => ({ ...current, attributes: { ...readAttributes(current.attributes), [key]: value } }))

  const submit = async event => {
    event.preventDefault(); setError('')
    if (!form.build_id) { setError('Pick or import a build JSON first.'); return }
    if (spentAttributes > availableAttributes) { setError(`Level ${form.level} provides ${availableAttributes} attribute points, but ${spentAttributes} are entered.`); return }
    setBusy(true)
    try { const id = await window.api.characters.create(form); setForm(emptyForm('')); onCreated(id) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const importBuild = async () => {
    setError('')
    try {
      const result = await window.api.builds.importFile()
      if (result) { await onImported(); await loadBuild(result.id) }
    } catch (err) { setError(err.message) }
  }

  const importBackup = async () => {
    setError('')
    setBusy(true)
    try {
      const result = await window.api.characters.importBackup()
      // Restoring a backup creates a full character, so hand it straight to the same flow a new one uses.
      if (result?.id) { setForm(emptyForm('')); onCreated(result.id) }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form className="modal character-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Add character">
      <div className="modal-head"><div><span className="eyebrow">{firstCharacter ? 'Welcome to ATTB' : 'New profile'}</span><h2>{firstCharacter ? 'Add your first character' : 'Add character'}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></div>
      <p className="modal-intro">Record the character you actually made. The selected build supplies recommendations, while race, alliance, attributes, and Champion Points remain this profile's real values.</p>
      <div className="form-grid two">
        <label><span>Character name</span><input ref={nameRef} required maxLength={60} value={form.name} onChange={event => set('name', event.target.value)} placeholder="Enter character name" /></label>
        <label><span>Build</span><select value={form.build_id} onChange={event => { if (event.target.value === '__import__') { importBuild(); return } loadBuild(event.target.value) }}>{!builds.length && <option value="">No builds available</option>}{builds.map(build => <option key={build.id} value={build.id}>{build.name} · {build.game_version}</option>)}<option value="__import__">+ Add new build (import JSON)...</option></select></label>
        <label><span>Build variant</span><select value={form.variant_id} onChange={event => set('variant_id', event.target.value)} disabled={!variants.length}>{variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}{variant.changes.length ? '' : ' (base)'}</option>)}</select></label>
        <label><span>Current level</span><NumberStepper value={form.level} min={1} max={50} onChange={value => set('level', value)} label="Current character level" /></label>
        <label><span>Race</span><select value={form.race} onChange={event => set('race', event.target.value)}>{ESO_RACES.map(race => <option key={race}>{race}</option>)}</select><small>Build recommendation: {selectedBuildView?.defaults?.race || 'None listed'}</small></label>
        <label><span>Alliance</span><select value={form.alliance} onChange={event => set('alliance', event.target.value)}>{ESO_ALLIANCES.map(alliance => <option key={alliance}>{alliance}</option>)}</select><small>Build recommendation: {selectedBuildView?.defaults?.alliance || 'None listed'}</small></label>
      </div>

      <section className="modal-progress-section">
        <div className="modal-progress-head"><div><span className="eyebrow">Current progression</span><h3>Attribute points</h3></div><p>Enter only what this character has spent. The build goal stays separate: {buildTarget.magicka} Magicka / {buildTarget.health} Health / {buildTarget.stamina} Stamina.</p></div>
        <div className="form-grid three modal-attribute-grid">{ATTRIBUTE_KEYS.map(key => {
          const value = attributes[key]
          const otherSpent = spentAttributes - value
          const max = Math.max(value, Math.min(64, availableAttributes - otherSpent))
          return <label key={key}><span>{ATTRIBUTE_LABEL[key]}</span><NumberStepper value={value} min={0} max={max} onChange={next => setAttribute(key, next)} label={`${ATTRIBUTE_LABEL[key]} attribute points`} /></label>
        })}</div>
        <div className={`modal-progress-summary ${spentAttributes > availableAttributes ? 'warn' : ''}`}><b>{spentAttributes}</b><span>of {availableAttributes} available at Level {form.level}</span><em>{Math.max(0, availableAttributes - spentAttributes)} unspent</em></div>
      </section>

      <section className="modal-progress-section">
        <div className="modal-progress-head"><div><span className="eyebrow">Character-specific totals</span><h3>Champion Points</h3></div><p>Enter the three numbers shown in ESO. Champion Points can be used by account alts even when their character level is below 50.</p></div>
        <div className="form-grid three modal-cp-grid">
          <label><span>Craft CP</span><NumberStepper value={form.cp_craft} min={0} max={1200} onChange={value => set('cp_craft', value)} label="Craft CP" /></label>
          <label><span>Warfare CP</span><NumberStepper value={form.cp_warfare} min={0} max={1200} onChange={value => set('cp_warfare', value)} label="Warfare CP" /></label>
          <label><span>Fitness CP</span><NumberStepper value={form.cp_fitness} min={0} max={1200} onChange={value => set('cp_fitness', value)} label="Fitness CP" /></label>
        </div>
      </section>

      <div className="import-row"><button type="button" className="btn secondary" onClick={importBuild}>Import another build JSON</button><button type="button" className="btn secondary" onClick={importBackup} disabled={busy}>Import character backup</button><span>ESO Plus is account-wide under Settings. Character backups live under Help &amp; Tools.</span></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Working...' : firstCharacter ? 'Create first character' : 'Create character'}</button></div>
    </form>
  </div>
}
