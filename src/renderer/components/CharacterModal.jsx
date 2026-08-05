import React, { useEffect, useMemo, useRef, useState } from 'react'
import NumberStepper from './NumberStepper'
import { availableVariants } from '../utils/variantLogic'

export const ESO_RACES = ['High Elf', 'Argonian', 'Wood Elf', 'Breton', 'Dark Elf', 'Imperial', 'Khajiit', 'Nord', 'Orc', 'Redguard']
export const ESO_ALLIANCES = ['Aldmeri Dominion', 'Daggerfall Covenant', 'Ebonheart Pact']
const EMPTY = { name: '', build_id: '', variant_id: '', race: '', alliance: '', level: 1, cp_craft: 0, cp_warfare: 0, cp_fitness: 0 }

export default function CharacterModal({ open, builds, onClose, onCreated, onImported, firstCharacter = false }) {
  const [form, setForm] = useState(EMPTY)
  const [selectedBuild, setSelectedBuild] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const nameRef = useRef(null)
  const variants = useMemo(() => availableVariants(selectedBuild), [selectedBuild])

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
    setForm({ ...EMPTY, build_id: buildId })
    loadBuild(buildId).catch(error => setError(error.message))
    requestAnimationFrame(() => nameRef.current?.focus())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, builds])

  useEffect(() => {
    if (!open) return
    const onKey = event => { if (event.key === 'Escape' && !firstCharacter) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, firstCharacter])

  if (!open) return null
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = async event => {
    event.preventDefault(); setError('')
    if (!form.build_id) { setError('Pick or import a build JSON first.'); return }
    setBusy(true)
    try { const id = await window.api.characters.create(form); setForm(EMPTY); onCreated(id) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const importBuild = async () => {
    setError('')
    try {
      const result = await window.api.builds.importFile()
      if (result) { await onImported(); await loadBuild(result.id) }
    } catch (err) { setError(err.message) }
  }

  return <div className="modal-backdrop" onMouseDown={event => { if (!firstCharacter && event.target === event.currentTarget) onClose() }}>
    <form className="modal character-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Add character">
      <div className="modal-head"><div><span className="eyebrow">{firstCharacter ? 'Welcome to ATTB' : 'New profile'}</span><h2>{firstCharacter ? 'Add your first character' : 'Add character'}</h2></div>{!firstCharacter && <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>}</div>
      <p className="modal-intro">Record the character you actually made. The selected build supplies recommendations, while race and alliance remain your character&rsquo;s real choices.</p>
      <div className="form-grid two">
        <label><span>Character name</span><input ref={nameRef} required maxLength={60} value={form.name} onChange={event => set('name', event.target.value)} placeholder="Enter character name" /></label>
        <label><span>Build</span><select value={form.build_id} onChange={event => loadBuild(event.target.value)}>{!builds.length && <option value="">No builds available</option>}{builds.map(build => <option key={build.id} value={build.id}>{build.name} · {build.game_version}</option>)}</select></label>
        <label><span>Build variant</span><select value={form.variant_id} onChange={event => set('variant_id', event.target.value)} disabled={!variants.length}>{variants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}{variant.changes.length ? '' : ' (base)'}</option>)}</select></label>
        <label><span>Current level</span><NumberStepper value={form.level} min={1} max={50} onChange={value => set('level', value)} label="Current character level" /></label>
        <label><span>Race</span><select value={form.race} onChange={event => set('race', event.target.value)}>{ESO_RACES.map(race => <option key={race}>{race}</option>)}</select><small>Build recommendation: {selectedBuild?.defaults?.race || 'None listed'}</small></label>
        <label><span>Alliance</span><select value={form.alliance} onChange={event => set('alliance', event.target.value)}>{ESO_ALLIANCES.map(alliance => <option key={alliance}>{alliance}</option>)}</select><small>Build recommendation: {selectedBuild?.defaults?.alliance || 'None listed'}</small></label>
      </div>
      {form.level >= 50 && <div className="form-grid three modal-cp-grid">
        <label><span>Craft CP</span><NumberStepper value={form.cp_craft} min={0} max={1200} onChange={value => set('cp_craft', value)} label="Craft CP" /></label>
        <label><span>Warfare CP</span><NumberStepper value={form.cp_warfare} min={0} max={1200} onChange={value => set('cp_warfare', value)} label="Warfare CP" /></label>
        <label><span>Fitness CP</span><NumberStepper value={form.cp_fitness} min={0} max={1200} onChange={value => set('cp_fitness', value)} label="Fitness CP" /></label>
      </div>}
      <div className="import-row"><button type="button" className="btn secondary" onClick={importBuild}>Import another build JSON</button><span>ESO Plus is account-wide under Settings. Character backups live under Help &amp; Tools.</span></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-actions">{!firstCharacter && <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>}<button className="btn primary" disabled={busy}>{busy ? 'Creating…' : firstCharacter ? 'Create first character' : 'Create character'}</button></div>
    </form>
  </div>
}
