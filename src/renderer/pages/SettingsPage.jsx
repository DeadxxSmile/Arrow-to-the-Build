import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import NumberStepper from '../components/NumberStepper'
import AttributesEditor from '../components/AttributesEditor'
import { ESO_ALLIANCES, ESO_RACES } from '../components/CharacterModal'

export default function SettingsPage() {
  const {
    builds, character, build, activeId, setActiveId, theme, esoPlus, appSettings, setAppSetting,
    updateCharacter, reloadCharacters, addTrackedSkillLine, deleteTrackedSkillLine,
    catalog, skillLines, selectableVariants
  } = useApp()
  const [tab, setTab] = useState('app')
  const [dbPath, setDbPath] = useState('')
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState('Craft')
  const [lineId, setLineId] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const lineSelectRef = useRef(null)
  const flashTimer = useRef(null)
  const remoteImages = appSettings.remote_images === 'true'

  useEffect(() => { window.api.db.getPath().then(setDbPath) }, [])
  useEffect(() => { setNameDraft(character?.name || '') }, [character?.id, character?.name])
  useEffect(() => () => clearTimeout(flashTimer.current), [])
  const flash = message => { setNotice(message); clearTimeout(flashTimer.current); flashTimer.current = setTimeout(() => setNotice(''), 3500) }

  const clearCache = async () => { await window.api.images.clearCache(); flash('Downloaded image cache cleared.') }
  const resetApp = async () => {
    if (!window.confirm('Reset all ATTB app data? This removes every saved character, imported build, setting, and checklist. Bundled builds will be restored.')) return
    if (!window.confirm('Final confirmation: erase all local ATTB progress?')) return
    await window.api.images.clearCache(); await window.api.settings.resetApp(); localStorage.removeItem('attb-active-character'); window.location.reload()
  }
  const removeCharacter = async () => {
    if (!character || !window.confirm(`Remove ${character.name} from ATTB? This does not delete anything in ESO.`)) return
    await window.api.characters.delete(activeId)
    const remaining = await reloadCharacters(); setActiveId(remaining[0]?.id || null)
  }
  const commitName = () => {
    const next = nameDraft.trim()
    if (!next || next === character?.name) { setNameDraft(character?.name || ''); return }
    updateCharacter({ name: next })
  }
  const changeBuild = async buildId => {
    if (!buildId || buildId === character.build_id) return
    const next = builds.find(item => item.id === buildId)
    const classChanged = next?.class_name && next.class_name !== build?.defaults?.class
    const message = classChanged
      ? `Change ${character.name} from ${build?.defaults?.class} to a ${next.class_name} build? ATTB will clear incompatible class selections and build-specific equipment progress, while keeping level, CP, race, alliance, and personal progression.`
      : `Change the selected build for ${character.name}? Matching skill progress is preserved, while incompatible build completion and equipment entries are removed.`
    if (!window.confirm(message)) return
    await updateCharacter({ build_id: buildId })
    flash(`Changed build to ${next?.name || 'the selected build'}.`)
  }

  const selectedIds = useMemo(() => new Set(skillLines.map(line => line.id)), [skillLines])
  const categories = catalog?.categories || []
  const options = useMemo(() => (catalog?.lines || []).filter(line => line.group === category && !selectedIds.has(line.id)).sort((a, b) => a.name.localeCompare(b.name)), [catalog, category, selectedIds])
  useEffect(() => { if (!options.some(line => line.id === lineId)) setLineId(options[0]?.id || '') }, [options, lineId])
  const addLine = async event => {
    event.preventDefault(); if (!lineId) return
    try { const line = (catalog.lines || []).find(item => item.id === lineId); await addTrackedSkillLine(lineId); flash(`${line?.name || 'Skill line'} added to tracking.`); requestAnimationFrame(() => lineSelectRef.current?.focus()) }
    catch (error) { flash(error.message) }
  }
  const removeLine = async line => {
    if (!window.confirm(`Remove ${line.name} from tracking? Saved allocations remain in character backups.`)) return
    await deleteTrackedSkillLine(line.id); flash(`${line.name} removed from tracking.`)
  }

  return <div className="page settings-page">
    <div className="page-title"><span className="eyebrow">Application and profile control</span><h1>Settings</h1><p>Preferences and editable character details live here. Backups and build JSON tools have moved to Help &amp; Tools.</p></div>
    <div className="settings-tabs" role="tablist"><button role="tab" aria-selected={tab === 'app'} className={tab === 'app' ? 'active' : ''} onClick={() => setTab('app')}>App Settings</button><button role="tab" aria-selected={tab === 'character'} className={tab === 'character' ? 'active' : ''} onClick={() => setTab('character')}>Character Settings</button></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}

    {tab === 'app' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Appearance</span><h2>Theme</h2></div></div><div className="setting-row"><div><b>Color mode</b><p>Switch the entire application between its dark and light palettes.</p></div><select value={theme} aria-label="Color mode" onChange={event => setAppSetting('theme', event.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Account-wide access</span><h2>ESO Plus</h2></div></div><label className="setting-row clickable"><div><b>ESO Plus active</b><p>Used for DLC-access notes and subscription-specific recommendations across every character.</p></div><span className="switch"><input type="checkbox" checked={esoPlus} onChange={event => setAppSetting('eso_plus', event.target.checked)} /><i /></span></label></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Network</span><h2>Remote build images</h2></div></div><label className="setting-row clickable"><div><b>Allow images referenced by trusted imported builds</b><p>ATTB remains offline by default. Remote downloads are restricted to HTTPS, five megabytes, real image formats, and a local cache.</p></div><span className="switch"><input type="checkbox" checked={remoteImages} onChange={event => setAppSetting('remote_images', event.target.checked)} /><i /></span></label></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Future module</span><h2>Build Creator</h2></div><p>The creator will eventually produce the same schema 3 JSON format used by the Mighty Seven.</p></div><div className="future-module"><b>Planned workflow</b><span>Choose class and setup → add skill lines → order recommendations → define hotbars, rotations, equipment, consumables, CP paths, and variants → validate and export.</span></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Storage</span><h2>Local data</h2></div></div><div className="data-path"><small>SQLite database</small><code>{dbPath}</code></div><div className="data-path"><small>Bundled ESO catalog</small><code>{catalog?.catalog_version} · {catalog?.game_version} · {(catalog?.lines || []).length} skill lines</code></div><div className="button-row"><button className="btn secondary" onClick={clearCache}>Clear downloaded image cache</button><button className="btn danger" onClick={resetApp}>Reset entire app</button></div></section>
    </div>}

    {tab === 'character' && <div className="settings-stack">{!character ? <section className="panel"><h2>No character selected</h2></section> : <>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Current profile</span><h2>{character.name}</h2></div><small>{build?.name}</small></div>
        <div className="form-grid three">
          <label><span>Character name</span><input value={nameDraft} maxLength={60} onChange={event => setNameDraft(event.target.value)} onBlur={commitName} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setNameDraft(character.name); event.currentTarget.blur() } }} /></label>
          <label><span>Race</span><select value={character.race || ''} onChange={event => updateCharacter({ race: event.target.value })}>{ESO_RACES.map(race => <option key={race}>{race}</option>)}</select><small>Build recommends {build?.defaults?.race || 'no specific race'}.</small></label>
          <label><span>Alliance</span><select value={character.alliance || ''} onChange={event => updateCharacter({ alliance: event.target.value })}>{ESO_ALLIANCES.map(alliance => <option key={alliance}>{alliance}</option>)}</select><small>Build recommends {build?.defaults?.alliance || 'no specific alliance'}.</small></label>
          <label><span>Selected build</span><select value={character.build_id} onChange={event => changeBuild(event.target.value)}>{builds.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Build variant</span><select value={character.variant_id} onChange={event => updateCharacter({ variant_id: event.target.value })}>{selectableVariants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}{variant.changes.length ? '' : ' (base)'}</option>)}</select></label>
          <label><span>Overall level</span><NumberStepper value={character.level} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" /></label>
          <label><span>Craft CP</span><NumberStepper value={character.cp_craft} min={0} max={1200} onChange={cp_craft => updateCharacter({ cp_craft })} label="Craft CP" /></label>
          <label><span>Warfare CP</span><NumberStepper value={character.cp_warfare} min={0} max={1200} onChange={cp_warfare => updateCharacter({ cp_warfare })} label="Warfare CP" /></label>
          <label><span>Fitness CP</span><NumberStepper value={character.cp_fitness} min={0} max={1200} onChange={cp_fitness => updateCharacter({ cp_fitness })} label="Fitness CP" /></label>
        </div>
      </section>
      <AttributesEditor character={character} build={build} onChange={attributes => updateCharacter({ attributes })} />
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Personal progression</span><h2>Add complete skill lines</h2></div><p>Added lines are tracked without affecting build recommendations unless the build explicitly references them.</p></div>
        <form className="catalog-line-form" onSubmit={addLine}><label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Skill line</span><select ref={lineSelectRef} value={lineId} onChange={event => setLineId(event.target.value)} disabled={!options.length}>{options.length ? options.map(line => <option key={line.id} value={line.id}>{line.name}{line.class ? ` · ${line.class}` : ''}</option>) : <option value="">Every line in this category is already shown</option>}</select></label><button className="btn primary" disabled={!lineId}>Add skill line</button></form>
        <div className="tracked-line-list">{skillLines.filter(line => line.tracked_only).map(line => <div key={line.id}><div><b>{line.name}</b><small>{line.group}{line.class ? ` · ${line.class}` : ''}</small></div><span>{character.skill_ranks[line.id] ?? 0}/{line.max || 50}</span><button className="btn ghost danger-text" onClick={() => removeLine(line)}>Remove</button></div>)}{!skillLines.some(line => line.tracked_only) && <div className="quiet-box">No additional catalog lines added yet.</div>}</div>
      </section>
      <section className="panel danger-zone"><div><span className="eyebrow">Danger zone</span><h2>Remove character</h2><p>This removes only the ATTB profile. It cannot affect the character in ESO.</p></div><button className="btn danger" onClick={removeCharacter}>Remove {character.name}</button></section>
    </>}</div>}
  </div>
}
