import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../App'
import { ESO_ALLIANCES, ESO_RACES } from '../components/CharacterModal'
import { displayVariantName } from '../utils/variantLogic'
import { useAppDialog } from '../components/AppDialogProvider'
import { APP_TAGLINE } from '../utils/branding'

export default function SettingsPage() {
  const {
    builds, characters, character, build, activeId, setActiveId, theme, esoPlus, appSettings, setAppSetting,
    updateCharacter, reloadBuilds, reloadCharacters, refreshActive, addTrackedSkillLine, deleteTrackedSkillLine,
    catalog, skillLines, selectableLoadouts, selectableVariants, workspace, openCharacterModal, characterBuilds, reloadSettings,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride
  } = useApp()
  const dialog = useAppDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const validTabs = ['general', 'character', 'addon', 'editor']
  const tab = validTabs.includes(requestedTab) ? requestedTab : (workspace === 'build-editor' ? 'editor' : 'general')
  const [dbPath, setDbPath] = useState('')
  const [appInfo, setAppInfo] = useState({ version: '' })
  const [storageInfo, setStorageInfo] = useState(null)
  const [storageBusy, setStorageBusy] = useState('')
  const [addonBusy, setAddonBusy] = useState('')
  const [syncSnapshots, setSyncSnapshots] = useState([])
  const [linkSnapshotKey, setLinkSnapshotKey] = useState('')
  const [linkCharacterId, setLinkCharacterId] = useState('')
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState('Craft')
  const [lineId, setLineId] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [authorDraft, setAuthorDraft] = useState(appSettings.build_editor_default_author || 'NPC')
  const lineSelectRef = useRef(null)
  const flashTimer = useRef(null)
  const remoteImages = appSettings.remote_images === 'true'
  const showGuidance = appSettings.build_editor_show_guidance !== 'false'
  const advancedDefault = appSettings.build_editor_advanced_default === 'true'
  const compatibilityWarnings = appSettings.build_editor_compatibility_warnings !== 'false'
  const overridesEnabled = appSettings.addon_allow_overrides === 'true'
  const syncedCharacter = character?.addon_sync?.linked
  const syncedLocked = syncedCharacter && !overridesEnabled

  const overrideLabel = path => {
    if (path === 'level') return 'Overall level'
    if (path === 'cp_craft') return 'Craft Champion Points'
    if (path === 'cp_warfare') return 'Warfare Champion Points'
    if (path === 'cp_fitness') return 'Fitness Champion Points'
    if (path === 'actual_unspent_skill_points') return 'Available skill points'
    if (path === 'actual_unspent_attribute_points') return 'Available attribute points'
    if (path.startsWith('attributes.')) return `${path.split('.')[1]} attribute points`
    if (path.startsWith('skill_ranks.')) return `Skill-line rank: ${path.slice('skill_ranks.'.length)}`
    if (path.startsWith('skill_allocations.')) return `Skill purchase: ${path.slice('skill_allocations.'.length)}`
    if (path.startsWith('tracked_skill_lines.')) return `Tracked skill line: ${path.slice('tracked_skill_lines.'.length)}`
    return path
  }

  useEffect(() => {
    if (validTabs.includes(requestedTab)) return
    setSearchParams({ tab }, { replace: true })
  }, [requestedTab, setSearchParams, tab])
  useEffect(() => {
    window.api.db.getPath().then(setDbPath)
    window.api.app.getInfo().then(setAppInfo).catch(() => {})
  }, [])
  useEffect(() => { setNameDraft(character?.name || '') }, [character?.id, character?.name])
  const refreshStorageInfo = useCallback(async () => {
    const info = await window.api.builds.getStorageInfo()
    setStorageInfo(info)
    return info
  }, [])
  useEffect(() => { refreshStorageInfo().catch(() => {}) }, [refreshStorageInfo])
  const refreshSyncSnapshots = useCallback(async () => {
    if (!addonStatus?.profile_root) { setSyncSnapshots([]); return [] }
    const list = await window.api.addon.listSnapshots()
    setSyncSnapshots(list)
    return list
  }, [addonStatus?.profile_root])
  useEffect(() => { if (tab === 'addon') refreshSyncSnapshots().catch(() => {}) }, [tab, refreshSyncSnapshots, addonStatus?.snapshot_count, addonStatus?.linked_count, addonStatus?.pending_count])
  useEffect(() => { setAuthorDraft(appSettings.build_editor_default_author || 'NPC') }, [appSettings.build_editor_default_author])
  useEffect(() => () => clearTimeout(flashTimer.current), [])
  const flash = useCallback(message => { setNotice(message); clearTimeout(flashTimer.current); flashTimer.current = setTimeout(() => setNotice(''), 3500) }, [])

  const clearCache = async () => { await window.api.images.clearCache(); flash('Downloaded image cache cleared.') }
  const openProjectLink = async url => {
    try { await window.api.external.open(url) }
    catch (error) { flash(error.message || 'That link could not be opened.') }
  }
  const runStorageAction = async (name, task, success) => {
    setStorageBusy(name)
    try {
      const result = await task()
      if (!result) return
      await reloadSettings()
      await refreshStorageInfo()
      flash(typeof success === 'function' ? success(result) : success)
    } catch (error) { flash(error.message || 'The build storage folder could not be updated.') }
    finally { setStorageBusy('') }
  }
  const chooseBuildFolder = () => runStorageAction('choose', () => window.api.builds.chooseStorageDirectory(), result => `Build folder changed. ${result.copied || 0} saved build file${result.copied === 1 ? '' : 's'} copied safely.`)
  const restoreBuildFolder = () => runStorageAction('restore', () => window.api.builds.restoreDefaultStorageDirectory(), result => `Default build folder restored. ${result.copied || 0} saved build file${result.copied === 1 ? '' : 's'} copied safely.`)
  const syncBuildFolder = () => runStorageAction('sync', () => window.api.builds.syncStorageDirectory(), result => result.failed ? `${result.synced} build files synced; ${result.failed} could not be written.` : `${result.synced} saved build file${result.synced === 1 ? '' : 's'} synced.`)
  const openBuildFolder = () => runStorageAction('open', () => window.api.builds.openStorageDirectory(), 'Build folder opened.')
  const runAddonAction = async (name, task, success) => {
    setAddonBusy(name)
    try {
      const result = await task()
      await reloadSettings()
      await reloadAddonStatus()
      if (success) flash(typeof success === 'function' ? success(result) : success)
      return result
    } catch (error) { flash(error.message || 'ESO addon integration could not be updated.') }
    finally { setAddonBusy('') }
  }
  const toggleAddon = async enabled => {
    if (enabled && !addonStatus?.profile_root) { openAddonSetup(); return }
    await runAddonAction('toggle', () => window.api.addon.setEnabled(enabled), enabled ? 'Addon synchronization enabled.' : 'Addon synchronization disabled.')
  }
  const chooseAddonFolder = async () => {
    setAddonBusy('choose')
    try {
      const root = await window.api.addon.chooseProfile()
      if (!root) return
      await window.api.addon.configure({ mode: 'existing', profileRoot: root, autoDetect: false })
      await reloadSettings(); await reloadAddonStatus(); await reloadAddonDiscoveries(true)
      flash('ESO profile folder changed and scanned.')
    } catch (error) { flash(error.message) }
    finally { setAddonBusy('') }
  }
  const installAddon = () => runAddonAction('install', () => window.api.addon.install(), result => result?.skipped ? `Newer ATTB addon kept in place.` : `ATTB addon ${result?.version || 'files'} installed or repaired.${result?.retired_bridge_removed ? ' Old addon files from an earlier version were removed.' : ''}`)
  const syncAddon = async () => {
    const result = await runAddonAction('sync', () => window.api.addon.syncNow(), value => value?.last_error ? `Latest snapshot read with an error: ${value.last_error}` : `Latest addon data read. ${value?.snapshot_count || 0} character snapshot${value?.snapshot_count === 1 ? '' : 's'} found.`)
    await reloadCharacters(activeId)
    await refreshActive()
    await refreshSyncSnapshots()
    return result
  }
  const toggleOverrides = async enabled => {
    if (!enabled) {
      const approved = await dialog.confirm({ title: 'Disable synced-data overrides?', message: 'All overrides across every synced character will be deleted. ATTB will restore the latest values reported by ESO.', confirmLabel: 'Disable and Restore Synced Data', danger: true })
      if (!approved) return
    }
    await runAddonAction('overrides', () => window.api.addon.setOverrideMode(enabled), enabled ? 'Synced-data overrides enabled.' : 'All overrides removed and synced ESO data restored.')
    await reloadCharacters(activeId)
  }
  const unlinkCharacter = async (characterId, characterName) => {
    if (!characterId) return
    const approved = await dialog.confirm({ title: `Stop syncing ${characterName || 'this character'}?`, message: 'The ATTB character and its selected build will remain. Its current effective values will become manual and the ESO snapshot will be kept in the sync manager so it can be linked again later.', confirmLabel: 'Stop Syncing', danger: true })
    if (!approved) return
    await window.api.addon.unlinkCharacter(characterId)
    await reloadCharacters(activeId)
    await refreshActive()
    await reloadAddonStatus()
    await refreshSyncSnapshots()
    flash(`${characterName || 'Character'} is now a manual ATTB character.`)
  }
  const unlinkCurrent = async () => {
    if (!character?.addon_sync?.linked) return
    await unlinkCharacter(character.id, character.name)
  }
  const resetApp = async () => {
    const first = await dialog.confirm({ title: 'Reset all ATTB data?', message: 'This removes every saved character, imported build, setting, checklist, draft, and revision. Bundled builds will be restored.', confirmLabel: 'Continue', danger: true })
    if (!first) return
    const final = await dialog.confirm({ eyebrow: 'Final confirmation', title: 'Erase all local ATTB progress?', message: 'This cannot be undone. Character backups and saved JSON files in your user build folder are preserved so they can be imported again later.', confirmLabel: 'Reset Entire App', danger: true })
    if (!final) return
    await window.api.images.clearCache()
    await window.api.settings.resetApp()
    for (const key of Object.keys(localStorage)) if (key.startsWith('attb-')) localStorage.removeItem(key)
    window.location.reload()
  }
  const removeCharacter = async () => {
    if (!character) return
    const approved = await dialog.confirm({ title: `Remove ${character.name}?`, message: 'This removes the local ATTB profile and tracking progress. It does not delete anything in ESO.', confirmLabel: 'Remove Character', danger: true })
    if (!approved) return
    await window.api.characters.delete(activeId)
    const remaining = await reloadCharacters(); setActiveId(remaining[0]?.id || null)
  }
  const commitName = () => {
    const next = nameDraft.trim()
    if (!next || next === character?.name) { setNameDraft(character?.name || ''); return }
    updateCharacter({ name: next })
  }
  const commitAuthor = async () => {
    const next = authorDraft.trim() || 'NPC'
    setAuthorDraft(next)
    if (next !== appSettings.build_editor_default_author) await setAppSetting('build_editor_default_author', next)
  }
  const changeBuild = async buildId => {
    if (!buildId || buildId === character.build_id) return
    const next = characterBuilds.find(item => item.id === buildId)
    const classChanged = next?.class_name && next.class_name !== build?.defaults?.class
    const message = classChanged
      ? `Change ${character.name} from ${build?.defaults?.class} to a ${next.class_name} build? ATTB will clear incompatible class selections and build-specific equipment progress, while keeping level, CP, race, alliance, and personal progression.`
      : `Change the selected build for ${character.name}? Matching skill progress is preserved, while incompatible build completion and equipment entries are removed.`
    const approved = await dialog.confirm({ title: 'Change selected build?', message, confirmLabel: 'Change Build' })
    if (!approved) return
    await updateCharacter({ build_id: buildId })
    flash(`Changed build to ${next?.name || 'the selected build'}.`)
  }

  const unlinkedSnapshots = useMemo(() => syncSnapshots.filter(item => !item.linked), [syncSnapshots])
  const manualCharacters = useMemo(() => (characters || []).filter(item => !item.addon_linked), [characters])
  const selectedSnapshot = useMemo(() => unlinkedSnapshots.find(item => item.character_key === linkSnapshotKey) || unlinkedSnapshots[0] || null, [unlinkedSnapshots, linkSnapshotKey])
  const compatibleManualCharacters = useMemo(() => manualCharacters.filter(item => !selectedSnapshot?.class_name || !item.class_name || String(item.class_name).toLowerCase() === String(selectedSnapshot.class_name).toLowerCase()), [manualCharacters, selectedSnapshot?.class_name])
  useEffect(() => {
    if (!unlinkedSnapshots.some(item => item.character_key === linkSnapshotKey)) setLinkSnapshotKey(unlinkedSnapshots[0]?.character_key || '')
  }, [unlinkedSnapshots, linkSnapshotKey])
  useEffect(() => {
    if (!compatibleManualCharacters.some(item => item.id === linkCharacterId)) setLinkCharacterId(compatibleManualCharacters[0]?.id || '')
  }, [compatibleManualCharacters, linkCharacterId])
  const linkExistingCharacter = async () => {
    if (!selectedSnapshot || !linkCharacterId) return
    const target = compatibleManualCharacters.find(item => item.id === linkCharacterId)
    const approved = await dialog.confirm({
      title: `Link ${selectedSnapshot.name} to ${target?.name || 'the selected ATTB character'}?`,
      message: `The existing ATTB profile and its selected build will be kept. ESO becomes the source for identity and current progression values. ${selectedSnapshot.discovery_status === 'dismissed' ? 'This snapshot was previously dismissed, but linking it here restores it directly.' : ''}`,
      confirmLabel: 'Link and Sync'
    })
    if (!approved) return
    setAddonBusy('link')
    try {
      const result = await window.api.addon.importCharacter(selectedSnapshot.character_key, { link_character_id: linkCharacterId })
      await reloadCharacters(result.id)
      await refreshActive()
      await reloadAddonStatus()
      await refreshSyncSnapshots()
      flash(`${selectedSnapshot.name} is now linked to ${target?.name || 'the selected ATTB profile'}.`)
    } catch (error) { flash(error.message || 'The character link could not be created.') }
    finally { setAddonBusy('') }
  }
  const restoreDismissed = async () => {
    setAddonBusy('rediscover')
    try {
      const list = await window.api.addon.rediscoverDismissed()
      await reloadAddonStatus()
      await refreshSyncSnapshots()
      flash(`${list.length} addon character${list.length === 1 ? '' : 's'} available for import or linking.`)
    } catch (error) { flash(error.message || 'Dismissed characters could not be restored.') }
    finally { setAddonBusy('') }
  }

  const selectedIds = useMemo(() => new Set(skillLines.map(line => line.id)), [skillLines])
  const categories = catalog?.categories || []
  const options = useMemo(() => (catalog?.lines || []).filter(line => line.group === category && !selectedIds.has(line.id)).sort((a, b) => a.name.localeCompare(b.name)), [catalog, category, selectedIds])
  useEffect(() => { if (!options.some(line => line.id === lineId)) setLineId(options[0]?.id || '') }, [options, lineId])
  const addLine = async event => {
    event.preventDefault(); if (!lineId || syncedLocked) return
    try { const line = (catalog.lines || []).find(item => item.id === lineId); await addTrackedSkillLine(lineId); flash(`${line?.name || 'Skill line'} added to tracking.`); requestAnimationFrame(() => lineSelectRef.current?.focus()) }
    catch (error) { flash(error.message) }
  }
  const removeLine = async line => {
    if (syncedLocked) return
    const approved = await dialog.confirm({ title: `Remove ${line.name} from tracking?`, message: 'Saved allocations remain available in exported character backups.', confirmLabel: 'Remove Skill Line', danger: true })
    if (!approved) return
    await deleteTrackedSkillLine(line.id); flash(`${line.name} removed from tracking.`)
  }

  return <div className="page settings-page">
    {notice && <div className="notice-banner settings-notice">{notice}</div>}
    {tab === 'general' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Appearance</span><h2>Theme</h2></div></div><div className="setting-row"><div><b>Color theme</b><p>Choose from six palettes: ATTB Default, Deep Dark, Light, Old Scrolls, monochrome SkyTrim, or the muted hunter-green Woodland theme.</p></div><select value={theme} aria-label="Color theme" onChange={event => setAppSetting('theme', event.target.value)}><option value="default">ATTB Default</option><option value="dark">Deep Dark</option><option value="light">Light</option><option value="old-scrolls">Old Scrolls</option><option value="skytrim">SkyTrim</option><option value="woodland">Woodland</option></select></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Startup</span><h2>Opening workspace</h2></div></div><div className="setting-row"><div><b>When ATTB launches</b><p>Choose a fixed workspace or return to whichever workspace you used last.</p></div><select value={appSettings.startup_workspace || 'last'} onChange={event => setAppSetting('startup_workspace', event.target.value)}><option value="last">Last used workspace</option><option value="character">Character Tracker</option><option value="build-editor">Build Editor</option><option value="help">Help &amp; Tools</option></select></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Network</span><h2>Remote build images</h2></div></div><label className="setting-row clickable"><div><b>Allow images referenced by trusted imported builds</b><p>ATTB remains offline by default. Remote downloads are restricted to HTTPS, five megabytes, real image formats, and a local cache.</p></div><span className="switch"><input type="checkbox" checked={remoteImages} onChange={event => setAppSetting('remote_images', event.target.checked)} /><i /></span></label></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Storage</span><h2>Local data</h2></div></div><div className="data-path"><small>SQLite database</small><code>{dbPath}</code></div><div className="data-path"><small>Bundled ESO catalog</small><code>{catalog?.catalog_version} · {catalog?.game_version} · {(catalog?.lines || []).length} skill lines</code></div><div className="button-row"><button className="btn secondary" onClick={clearCache}>Clear downloaded image cache</button><button className="btn danger" onClick={resetApp}>Reset entire app</button></div></section>
      <section className="panel about-panel"><div className="section-head"><div><span className="eyebrow">About</span><h2>Arrow to the Build</h2><p className="app-tagline about-tagline">{APP_TAGLINE}</p></div></div><div className="about-details"><div><small>App version</small><b>{appInfo.version ? `v${appInfo.version}` : 'Loading…'}</b></div><div><small>Built for</small><b>ESO {catalog?.game_version || 'catalog not loaded'}</b></div><div><small>Build format</small><b>Schema {builds.find(item => item.is_bundled)?.schema_version || 4}</b></div></div><div className="button-row"><button type="button" className="btn secondary" onClick={() => openProjectLink(appInfo.repository || 'https://github.com/DeadxxSmile/Arrow-to-the-Build')}>Open GitHub project</button><button type="button" className="btn ghost" onClick={() => openProjectLink(appInfo.issues || 'https://github.com/DeadxxSmile/Arrow-to-the-Build/issues')}>Report an issue</button></div></section>
    </div>}

    {tab === 'character' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Account-wide access</span><h2>ESO Plus</h2></div></div><label className="setting-row clickable"><div><b>ESO Plus active</b><p>Used for DLC-access notes and subscription-specific recommendations across every tracked character.</p></div><span className="switch"><input type="checkbox" checked={esoPlus} onChange={event => setAppSetting('eso_plus', event.target.checked)} /><i /></span></label></section>
      {!character ? <section className="panel no-character-settings"><div><span className="eyebrow">Character profile</span><h2>No character selected</h2><p>Add a character to configure identity, build selection, addon linking, and personally tracked skill lines. Numeric progression lives under Current Levels.</p></div><button type="button" className="btn primary" onClick={openCharacterModal}>＋ Add Character</button></section> : <>
        <section className="panel"><div className="section-head"><div><span className="eyebrow">Current profile</span><h2>{character.name}</h2></div><small>{build?.name}</small></div>
          <div className="form-grid three">
            <label><span>Character name</span><input value={nameDraft} maxLength={60} disabled={syncedCharacter} onChange={event => setNameDraft(event.target.value)} onBlur={commitName} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setNameDraft(character.name); event.currentTarget.blur() } }} /></label>
            <label><span>Race</span><select value={character.race || ''} disabled={syncedCharacter} onChange={event => updateCharacter({ race: event.target.value })}>{ESO_RACES.map(race => <option key={race}>{race}</option>)}</select><small>Build recommends {build?.defaults?.race || 'no specific race'}.</small></label>
            <label><span>Alliance</span><select value={character.alliance || ''} disabled={syncedCharacter} onChange={event => updateCharacter({ alliance: event.target.value })}>{ESO_ALLIANCES.map(alliance => <option key={alliance}>{alliance}</option>)}</select><small>Build recommends {build?.defaults?.alliance || 'no specific alliance'}.</small></label>
            <label><span>Selected build</span><select value={character.build_id} onChange={event => changeBuild(event.target.value)}>{characterBuilds.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {selectableLoadouts.length > 1 && <label><span>Build loadout</span><select value={character.loadout_id || selectableLoadouts[0]?.id || ''} onChange={event => updateCharacter({ loadout_id: event.target.value })}>{selectableLoadouts.map(loadout => <option key={loadout.id} value={loadout.id}>{loadout.name}</option>)}</select></label>}
            <label><span>Build variant</span><select value={character.variant_id} onChange={event => updateCharacter({ variant_id: event.target.value })}>{selectableVariants.map(variant => <option key={variant.id} value={variant.id}>{displayVariantName(variant)}</option>)}</select></label>
          </div>
          {syncedCharacter && <div className="identity-lock-note"><span aria-hidden="true">🔒</span><span>Name, class, race, alliance, account, server, and ESO character ID are identity fields supplied by the addon. Override mode never changes them.</span></div>}
        </section>
        <section className="panel"><div className="section-head"><div><span className="eyebrow">Personal progression</span><h2>Add complete skill lines</h2></div><p>Added lines are tracked without affecting build recommendations unless the build explicitly references them.</p></div>
          {syncedLocked && <div className="quiet-box sync-lock-note">Additional tracked lines are part of synced progression. Enable synced-data overrides to add or hide one temporarily.</div>}
          <form className="catalog-line-form" onSubmit={addLine}><label><span>Category</span><select disabled={syncedLocked} value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Skill line</span><select ref={lineSelectRef} value={lineId} onChange={event => setLineId(event.target.value)} disabled={syncedLocked || !options.length}>{options.length ? options.map(line => <option key={line.id} value={line.id}>{line.name}{line.class ? ` · ${line.class}` : ''}</option>) : <option value="">Every line in this category is already shown</option>}</select></label><button className="btn primary" disabled={syncedLocked || !lineId}>Add skill line</button></form>
          <div className="tracked-line-list">{skillLines.filter(line => line.tracked_only).map(line => <div key={line.id}><div><b>{line.name}</b><small>{line.group}{line.class ? ` · ${line.class}` : ''}</small></div><span>{character.skill_ranks[line.id] ?? 0}/{line.max || 50}</span><button className="btn ghost danger-text" disabled={syncedLocked} onClick={() => removeLine(line)}>Remove</button></div>)}{!skillLines.some(line => line.tracked_only) && <div className="quiet-box">No additional catalog lines added yet.</div>}</div>
        </section>
      </>}
      {character && <section className="panel danger-zone"><div><span className="eyebrow">Danger zone</span><h2>Remove character</h2><p>This removes only the ATTB profile. It cannot affect the character in ESO.</p></div><button className="btn danger" onClick={removeCharacter}>Remove {character.name}</button></section>}
    </div>}

    {tab === 'addon' && <div className="settings-stack">
      <section className="panel addon-settings-panel"><div className="section-head"><div><span className="eyebrow">ESO addon</span><h2>Automatic character synchronization</h2><p>Install or connect the silent ATTB addon, then add discovered ESO characters to Character Tracker with a new or existing build plan.</p></div><div className="schema-badges"><span>{addonStatus?.enabled ? 'Sync enabled' : 'Sync disabled'}</span><span>{addonStatus?.snapshot_count || 0} snapshot{addonStatus?.snapshot_count === 1 ? '' : 's'}</span>{addonStatus?.pending_count > 0 && <span>{addonStatus.pending_count} new</span>}</div></div>
        <div className="eso-save-limitation"><div><span className="eyebrow">ESO limitation</span><h3>Need the latest character data now? Run <code>/reloadui</code> in ESO.</h3><p>ESO addons cannot push data directly to desktop apps. ATTB can only read a new snapshot after ESO writes SavedVariables to disk. Automatic saves may arrive on their own, but <code>/reloadui</code> is the most reliable refresh.</p></div><div className="button-row compact-buttons addon-doc-buttons"><button type="button" className="btn secondary" onClick={() => openProjectLink('https://www.esoui.com/forums/showthread.php?t=8957')}>ZOS SavedVariables timing</button><button type="button" className="btn secondary" onClick={() => openProjectLink('https://wiki.esoui.com/Storing_data_and_accessing_files')}>ESOUI SavedVariables explanation</button></div></div>
        <label className="setting-row clickable"><div><b>Enable addon synchronization</b><p>Watch the configured ESO SavedVariables file and update linked characters whenever ESO writes new data.</p></div><span className="switch"><input type="checkbox" checked={!!addonStatus?.enabled} disabled={!!addonBusy} onChange={event => toggleAddon(event.target.checked)} /><i /></span></label>
        <label className="setting-row clickable"><div><b>Allow synced-data overrides</b><p>Temporarily test different levels, attributes, CP, skill ranks, and purchases. Disabling this deletes all overrides and restores the synced ESO values.</p></div><span className="switch"><input type="checkbox" checked={overridesEnabled} disabled={!!addonBusy || (!addonStatus?.enabled && !overridesEnabled)} onChange={event => toggleOverrides(event.target.checked)} /><i /></span></label>
        <div className="data-path"><small>ESO profile root</small><code>{addonStatus?.profile_root || 'Not configured'}</code></div>
        <div className="data-path"><small>Addon installation</small><code>{addonStatus?.addon_installed ? `${addonStatus.addon_path} · v${addonStatus.installed_version}` : addonStatus?.addon_path || 'Not installed'}</code></div>
        <div className="data-path"><small>ATTB SavedVariables</small><code>{addonStatus?.saved_variables_found ? `${addonStatus.saved_variables_path} · ${(addonStatus.saved_variables_size / 1024).toFixed(1)} KB` : addonStatus?.saved_variables_path ? `${addonStatus.saved_variables_path} · waiting for ESO` : 'No profile selected'}</code></div>
        {addonStatus?.last_error && <div className="error-box">{addonStatus.last_error}</div>}
        {!addonStatus?.addon_installed && addonStatus?.profile_root && <div className="quiet-box">The ESO profile is configured, but the ATTB addon is missing. Use Install / Repair Addon below.</div>}
        {addonStatus?.addon_update_available && <div className="notice-banner warn-banner">The installed ATTB addon is older than the bundled {addonStatus.bundled_version}. Install / Repair updates it.</div>}
        {addonStatus?.addon_newer_than_bundled && <div className="quiet-box">The installed ATTB addon is newer than the {addonStatus.bundled_version} copy bundled with this app. ATTB preserves the newer copy by default.</div>}
        {addonStatus?.retired_bridge_installed && <div className="notice-banner warn-banner"><b>Old ESO addon files found.</b> A leftover addon from an earlier ATTB version is still installed. Repairing the addon clears those old files and installs the current ArrowToTheBuild addon fresh.</div>}
        {addonStatus?.addon_installed && !addonStatus?.saved_variables_found && <div className="quiet-box"><b>Addon installed.</b> Log into ESO once and run <code>/reloadui</code> so ESO creates the SavedVariables file ATTB reads.</div>}
        {addonStatus?.addon_installed && addonStatus?.saved_variables_found && <div className="notice-banner"><b>ESO addon ready.</b> ATTB is watching the single SavedVariables archive. ESO controls when changes reach disk; use <code>/reloadui</code> whenever you need an immediate desktop refresh.</div>}
        <div className="button-row"><button type="button" className="btn primary" disabled={!!addonBusy || !addonStatus?.profile_root} onClick={installAddon}>{addonBusy === 'install' ? 'Installing…' : 'Install / Repair Addon'}</button><button type="button" className="btn secondary" disabled={!!addonBusy} onClick={chooseAddonFolder}>{addonBusy === 'choose' ? 'Choosing…' : 'Choose ESO Folder'}</button><button type="button" className="btn secondary" disabled={!!addonBusy || !addonStatus?.enabled} onClick={syncAddon}>{addonBusy === 'sync' ? 'Reading…' : 'Read Latest Snapshot'}</button><button type="button" className="btn secondary" disabled={!!addonBusy || !addonStatus?.enabled} onClick={openAddonImport}>Import Data From Addon</button></div>
        <div className="button-row compact-buttons"><button type="button" className="btn ghost" disabled={!addonStatus?.profile_root} onClick={() => window.api.addon.openFolder('addons')}>Open AddOns Folder</button><button type="button" className="btn ghost" disabled={!addonStatus?.profile_root} onClick={() => window.api.addon.openFolder('saved')}>Open SavedVariables Folder</button><button type="button" className="btn ghost" onClick={() => window.api.addon.openRepository()}>Addon GitHub</button></div>
        <small className="setting-footnote">One ESO profile is active at a time. ATTB supports live, liveeu, and PTS profile roots and never executes Lua from SavedVariables. ESO controls disk writes; /reloadui remains the reliable way to force a fresh SavedVariables write.</small>
      </section>
      <section className="panel sync-link-manager">
        <div className="section-head"><div><span className="eyebrow">Character link manager</span><h2>Connect ESO snapshots to existing ATTB characters</h2><p>Link a manually created character after the fact, including snapshots you previously dismissed. The ATTB character keeps its selected build while ESO becomes the source for current identity and progression.</p></div><div className="schema-badges"><span>{addonStatus?.linked_count || 0} linked</span><span>{syncSnapshots.length} known</span></div></div>
        {addonStatus?.profile_root ? <>
          <div className="sync-link-form">
            <label><span>ESO character snapshot</span><select value={selectedSnapshot?.character_key || ''} onChange={event => setLinkSnapshotKey(event.target.value)} disabled={!unlinkedSnapshots.length || !!addonBusy}>{unlinkedSnapshots.length ? unlinkedSnapshots.map(item => <option key={item.character_key} value={item.character_key}>{item.name} · {item.class_name || 'Unknown class'} · {item.world_name}{item.discovery_status === 'dismissed' ? ' · dismissed' : ''}</option>) : <option value="">No unlinked snapshots</option>}</select></label>
            <label><span>Existing ATTB character</span><select value={linkCharacterId} onChange={event => setLinkCharacterId(event.target.value)} disabled={!compatibleManualCharacters.length || !!addonBusy}>{compatibleManualCharacters.length ? compatibleManualCharacters.map(item => <option key={item.id} value={item.id}>{item.name} · {item.class_name || 'Unknown class'} · {item.build_name}</option>) : <option value="">No compatible manual characters</option>}</select></label>
            <button type="button" className="btn primary" disabled={!selectedSnapshot || !linkCharacterId || !!addonBusy} onClick={linkExistingCharacter}>{addonBusy === 'link' ? 'Linking…' : 'Link Existing Character'}</button>
          </div>
          {selectedSnapshot?.discovery_status === 'dismissed' && <div className="quiet-box"><b>Previously dismissed.</b> You can still link this snapshot directly here; no new <code>/reloadui</code> is required unless you want fresher ESO data first.</div>}
          <div className="sync-manager-actions button-row compact-buttons"><button type="button" className="btn secondary" disabled={!!addonBusy || !syncSnapshots.some(item => item.discovery_status === 'dismissed')} onClick={restoreDismissed}>{addonBusy === 'rediscover' ? 'Restoring…' : 'Restore Dismissed to Import Queue'}</button><button type="button" className="btn ghost" disabled={!!addonBusy} onClick={refreshSyncSnapshots}>Refresh Link List</button></div>
          <div className="sync-snapshot-list">{syncSnapshots.length ? syncSnapshots.map(item => <article key={item.character_key} className={`sync-snapshot-card ${item.linked ? 'linked' : item.discovery_status}`}>
            <div className="sync-snapshot-main"><div><b>{item.name}</b><small>{item.class_name || 'Unknown class'} · Level {item.level}{item.champion_points ? ` · CP ${item.champion_points}` : ''}</small><em>{item.account_name} · {item.world_name}</em></div><div className="schema-badges"><span>{item.linked ? 'Linked' : item.discovery_status === 'dismissed' ? 'Dismissed' : 'Available'}</span></div></div>
            <div className="sync-snapshot-meta"><span><small>Last snapshot</small><b>{item.captured_at ? new Date(item.captured_at * 1000).toLocaleString() : 'Unknown'}</b></span><span><small>ATTB profile</small><b>{item.linked ? item.linked_character_name : 'Not linked'}</b></span><span><small>Selected build</small><b>{item.linked ? item.linked_build_name : 'None'}</b></span></div>
            {item.linked && <div className="button-row compact-buttons"><button type="button" className="btn secondary" onClick={() => setActiveId(item.linked_character_id)}>Select Character</button><button type="button" className="btn danger" onClick={() => unlinkCharacter(item.linked_character_id, item.linked_character_name)}>Stop Syncing</button></div>}
          </article>) : <div className="quiet-box">No addon snapshots are stored for the active ESO profile yet. Log into a character, run <code>/reloadui</code>, then use Read Latest Snapshot.</div>}</div>
        </> : <div className="quiet-box">Choose an ESO profile folder above before managing character links.</div>}
      </section>
      {character?.addon_sync?.linked && <section className="panel character-sync-panel"><div className="section-head"><div><span className="eyebrow">Linked ESO character</span><h2>{character.name} is linked</h2><p>{character.addon_sync.account_name} · {character.addon_sync.world_name} · ID {character.addon_sync.eso_character_id}</p></div><div className="schema-badges"><span>Addon {character.addon_sync.addon_version}</span><span>{character.addon_sync.overrides?.length || 0} override{character.addon_sync.overrides?.length === 1 ? '' : 's'}</span></div></div>
        <div className="sync-character-summary"><div><small>Last ESO snapshot</small><b>{character.addon_sync.captured_at ? new Date(character.addon_sync.captured_at * 1000).toLocaleString() : 'Waiting for data'}</b></div><div><small>Override mode</small><b>{overridesEnabled ? 'Enabled' : 'Disabled'}</b></div><div><small>Identity source</small><b>ESO addon</b></div></div>
        <div className="sync-refresh-reminder"><b>Snapshot look stale?</b><span>Run <code>/reloadui</code> in ESO, then use Read Latest Snapshot here. ESO decides when SavedVariables reach disk.</span></div>
        {!character.addon_sync.profile_active && <div className="notice-banner warn-banner">This character belongs to a different ESO profile than the one currently selected in Settings &gt; ESO Addon &amp; Sync. Its last imported values are preserved, but it will not receive updates until that profile is active again.</div>}
        {character.addon_sync.overrides?.length > 0 && <div className="override-summary"><div><b>Active overrides</b><small>Restore any field independently, or disable override mode to clear every override at once.</small></div><div className="override-summary-list">{character.addon_sync.overrides.map(item => <div key={item.path}><span>{overrideLabel(item.path)}</span><code>{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</code><button type="button" className="override-reset compact" onClick={() => clearAddonOverride(item.path)} title="Restore synced ESO value" aria-label={`Restore ${overrideLabel(item.path)} to synced ESO value`}>↶</button></div>)}</div></div>}
        <div className="button-row"><button type="button" className="btn secondary" onClick={syncAddon}>Read Latest Snapshot</button><button type="button" className="btn danger" onClick={unlinkCurrent}>Stop Syncing Character</button></div>
      </section>}
    </div>}

    {tab === 'editor' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Identity</span><h2>Default author</h2></div></div><div className="setting-row"><div><b>Name used for new builds</b><p>New drafts will begin with this local author name. You can change it per build.</p></div><input value={authorDraft} maxLength={80} onChange={event => setAuthorDraft(event.target.value)} onBlur={commitAuthor} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setAuthorDraft(appSettings.build_editor_default_author || 'NPC'); event.currentTarget.blur() } }} /></div></section>
      <section className="panel build-storage-settings"><div className="section-head"><div><span className="eyebrow">User build library</span><h2>Saved JSON folder</h2><p>Every valid Save Build revision is mirrored here as an ordinary human-readable JSON file. Recovery drafts and revision history remain protected in SQLite.</p></div><div className="schema-badges"><span>{storageInfo?.available === false ? 'Folder unavailable' : `${storageInfo?.synced_builds || 0}/${storageInfo?.eligible_builds || 0} synced`}</span>{storageInfo?.external_changes > 0 && <span>{storageInfo.external_changes} externally changed</span>}</div></div>
        <div className="data-path"><small>{storageInfo?.is_default ? 'Default build folder' : 'Custom build folder'}</small><code>{storageInfo?.directory || appSettings.build_editor_storage_directory || 'Loading…'}</code></div>
        {storageInfo?.error && <div className="quiet-box storage-warning">ATTB cannot currently write to this folder: {storageInfo.error}. Saved builds remain protected in the database and can be synced when the folder is available again.</div>}
        {!storageInfo?.error && storageInfo?.pending_builds > 0 && <div className="quiet-box storage-warning">{storageInfo.pending_builds} saved build file{storageInfo.pending_builds === 1 ? ' needs' : 's need'} attention. Use Sync Saved Builds to recreate missing files. Files changed outside ATTB are preserved rather than overwritten automatically.</div>}
        <div className="button-row"><button type="button" className="btn primary" disabled={!!storageBusy} onClick={chooseBuildFolder}>{storageBusy === 'choose' ? 'Choosing…' : 'Choose Folder'}</button><button type="button" className="btn secondary" disabled={!!storageBusy} onClick={openBuildFolder}>{storageBusy === 'open' ? 'Opening…' : 'Open Folder'}</button><button type="button" className="btn secondary" disabled={!!storageBusy || storageInfo?.available === false} onClick={syncBuildFolder}>{storageBusy === 'sync' ? 'Syncing…' : 'Sync Saved Builds'}</button><button type="button" className="btn ghost" disabled={!!storageBusy || storageInfo?.is_default} onClick={restoreBuildFolder}>{storageBusy === 'restore' ? 'Restoring…' : 'Restore Default'}</button></div>
        <small className="setting-footnote">Default: {storageInfo?.default_directory || 'Documents\\Arrow to the Build\\Builds'}. Changing folders copies validated saved builds first and switches only after every copy succeeds.</small>
      </section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Draft safety</span><h2>Autosave</h2></div></div><div className="setting-row"><div><b>Draft autosave interval</b><p>How long the editor waits after your last change before saving the local recovery draft.</p></div><select value={appSettings.build_editor_autosave_seconds || '5'} onChange={event => setAppSetting('build_editor_autosave_seconds', event.target.value)}><option value="2">2 seconds</option><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="30">30 seconds</option></select></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Authoring experience</span><h2>Editor guidance</h2></div></div>
        <label className="setting-row clickable"><div><b>Show contextual recommendations and tooltips</b><p>Display interface help, ESO mechanics, and common build guidance while authoring.</p></div><span className="switch"><input type="checkbox" checked={showGuidance} onChange={event => setAppSetting('build_editor_show_guidance', event.target.checked)} /><i /></span></label>
        <label className="setting-row clickable"><div><b>Open new builds in Advanced mode</b><p>Expose specialist fields immediately instead of starting with the guided essentials.</p></div><span className="switch"><input type="checkbox" checked={advancedDefault} onChange={event => setAppSetting('build_editor_advanced_default', event.target.checked)} /><i /></span></label>
        <label className="setting-row clickable"><div><b>Show game-version compatibility warnings</b><p>Flag builds written for an older bundled ESO catalog so authors know what needs review.</p></div><span className="switch"><input type="checkbox" checked={compatibilityWarnings} onChange={event => setAppSetting('build_editor_compatibility_warnings', event.target.checked)} /><i /></span></label>
      </section>
      <section className="panel editor-settings-note"><span className="eyebrow">Build Editor workspace</span><h2>Draft protection is active</h2><p>These preferences control recovery autosave, contextual guidance, and the guided creator foundation. Additional advanced fields will use the same settings as later editor sections arrive.</p></section>
    </div>}
  </div>
}
