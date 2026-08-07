import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../App'
import { ESO_ALLIANCES, ESO_RACES } from '../components/CharacterModal'
import { displayVariantName } from '../utils/variantLogic'
import { useAppDialog } from '../components/AppDialogProvider'
import { APP_TAGLINE } from '../utils/branding'

export default function SettingsPage() {
  const {
    builds, character, build, activeId, setActiveId, theme, esoPlus, appSettings, setAppSetting,
    updateCharacter, reloadCharacters, addTrackedSkillLine, deleteTrackedSkillLine,
    catalog, skillLines, selectableLoadouts, selectableVariants, workspace, openCharacterModal, characterBuilds, reloadSettings,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride
  } = useApp()
  const dialog = useAppDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState(['general', 'character', 'editor'].includes(requestedTab) ? requestedTab : (workspace === 'build-editor' ? 'editor' : 'general'))
  const [dbPath, setDbPath] = useState('')
  const [appInfo, setAppInfo] = useState({ version: '' })
  const [storageInfo, setStorageInfo] = useState(null)
  const [storageBusy, setStorageBusy] = useState('')
  const [addonBusy, setAddonBusy] = useState('')
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
    const next = ['general', 'character', 'editor'].includes(requestedTab) ? requestedTab : (workspace === 'build-editor' ? 'editor' : 'general')
    setTab(next)
  }, [workspace, requestedTab])
  const chooseTab = next => {
    setTab(next)
    setSearchParams(next === 'general' ? {} : { tab: next }, { replace: true })
  }
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
  const installAddon = () => runAddonAction('install', () => window.api.addon.install(), result => result?.skipped ? `Newer ATTB addon components kept in place.` : `ATTB addon and sync bridge ${result?.version || 'files'} installed or repaired.`)
  const syncAddon = () => runAddonAction('sync', () => window.api.addon.syncNow(), result => result?.last_error ? `Sync completed with an error: ${result.last_error}` : `Addon data synced. ${result?.snapshot_count || 0} character snapshot${result?.snapshot_count === 1 ? '' : 's'} found.`)
  const toggleOverrides = async enabled => {
    if (!enabled) {
      const approved = await dialog.confirm({ title: 'Disable synced-data overrides?', message: 'All overrides across every synced character will be deleted. ATTB will immediately restore the latest values reported by ESO.', confirmLabel: 'Disable and Restore Live Data', danger: true })
      if (!approved) return
    }
    await runAddonAction('overrides', () => window.api.addon.setOverrideMode(enabled), enabled ? 'Synced-data overrides enabled.' : 'All overrides removed and live ESO data restored.')
    await reloadCharacters(activeId)
  }
  const unlinkCurrent = async () => {
    if (!character?.addon_sync?.linked) return
    const approved = await dialog.confirm({ title: `Stop syncing ${character.name}?`, message: 'The ATTB character and its selected build will remain. Its current effective values will become manual and the ESO snapshot will be dismissed until rediscovered.', confirmLabel: 'Stop Syncing', danger: true })
    if (!approved) return
    await window.api.addon.unlinkCharacter(character.id)
    await reloadCharacters(character.id)
    flash(`${character.name} is now a manual ATTB character.`)
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
    <div className="page-title"><span className="eyebrow">Application preferences</span><h1>Settings</h1><p>Manage shared behavior, character tracking, and Build Editor defaults from one place.</p></div>
    <div className="settings-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'general'} className={tab === 'general' ? 'active' : ''} onClick={() => chooseTab('general')}>General Settings</button>
      <button role="tab" aria-selected={tab === 'character'} className={tab === 'character' ? 'active' : ''} onClick={() => chooseTab('character')}>Character Settings</button>
      <button role="tab" aria-selected={tab === 'editor'} className={tab === 'editor' ? 'active' : ''} onClick={() => chooseTab('editor')}>Build Editor Settings</button>
    </div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}

    {tab === 'general' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Appearance</span><h2>Theme</h2></div></div><div className="setting-row"><div><b>Color mode</b><p>Switch both workspaces between the dark and light palettes.</p></div><select value={theme} aria-label="Color mode" onChange={event => setAppSetting('theme', event.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></div></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Startup</span><h2>Opening workspace</h2></div></div><div className="setting-row"><div><b>When ATTB launches</b><p>Choose a fixed workspace or return to whichever side of the app you used last.</p></div><select value={appSettings.startup_workspace || 'last'} onChange={event => setAppSetting('startup_workspace', event.target.value)}><option value="last">Last used workspace</option><option value="character">Character Tracker</option><option value="build-editor">Build Editor</option></select></div></section>
      <section className="panel addon-settings-panel"><div className="section-head"><div><span className="eyebrow">ESO companion addon</span><h2>Automatic character synchronization</h2><p>Install or connect the silent ATTB addon, then add discovered ESO characters to Character Tracker with a new or existing build plan.</p></div><div className="schema-badges"><span>{addonStatus?.enabled ? 'Sync enabled' : 'Sync disabled'}</span><span>{addonStatus?.snapshot_count || 0} snapshot{addonStatus?.snapshot_count === 1 ? '' : 's'}</span>{addonStatus?.pending_count > 0 && <span>{addonStatus.pending_count} new</span>}</div></div>
        <div className="eso-save-limitation"><div><span className="eyebrow">ESO limitation</span><h3>Need the latest character data now? Run <code>/reloadui</code> in ESO.</h3><p>ESO addons cannot push data directly to desktop apps. ATTB can only read a new snapshot after ESO writes SavedVariables to disk. Automatic saves may arrive on their own, but <code>/reloadui</code> is the most reliable refresh.</p></div><div className="button-row compact-buttons addon-doc-buttons"><button type="button" className="btn secondary" onClick={() => openProjectLink('https://www.esoui.com/forums/showthread.php?t=8957')}>ZOS SavedVariables timing</button><button type="button" className="btn secondary" onClick={() => openProjectLink('https://wiki.esoui.com/Storing_data_and_accessing_files')}>ESOUI SavedVariables explanation</button></div></div>
        <label className="setting-row clickable"><div><b>Enable addon synchronization</b><p>Watch the configured ESO SavedVariables file and update linked characters whenever ESO writes new data.</p></div><span className="switch"><input type="checkbox" checked={!!addonStatus?.enabled} disabled={!!addonBusy} onChange={event => toggleAddon(event.target.checked)} /><i /></span></label>
        <label className="setting-row clickable"><div><b>Allow synced-data overrides</b><p>Temporarily test different levels, attributes, CP, skill ranks, and purchases. Disabling this deletes all overrides and restores live ESO data.</p></div><span className="switch"><input type="checkbox" checked={overridesEnabled} disabled={!!addonBusy || (!addonStatus?.enabled && !overridesEnabled)} onChange={event => toggleOverrides(event.target.checked)} /><i /></span></label>
        <div className="data-path"><small>ESO profile root</small><code>{addonStatus?.profile_root || 'Not configured'}</code></div>
        <div className="data-path"><small>Main addon installation</small><code>{addonStatus?.addon_installed ? `${addonStatus.addon_path} · v${addonStatus.installed_version}` : addonStatus?.addon_path || 'Not installed'}</code></div>
        <div className="data-path"><small>Small sync bridge</small><code>{addonStatus?.bridge_installed ? `${addonStatus.bridge_addon_path} · v${addonStatus.bridge_installed_version}` : addonStatus?.bridge_addon_path || 'Not installed'}</code></div>
        <div className="data-path"><small>Full character archive</small><code>{addonStatus?.saved_variables_found ? addonStatus.saved_variables_path : addonStatus?.saved_variables_path ? `${addonStatus.saved_variables_path} · waiting for ESO` : 'No profile selected'}</code></div>
        <div className="data-path"><small>Sync bridge SavedVariables</small><code>{addonStatus?.bridge_saved_variables_found ? `${addonStatus.bridge_saved_variables_path} · ${(addonStatus.bridge_file_size / 1024).toFixed(1)} KB` : addonStatus?.bridge_saved_variables_path ? `${addonStatus.bridge_saved_variables_path} · waiting for ESO` : 'No profile selected'}</code></div>
        {addonStatus?.last_error && <div className="error-box">{addonStatus.last_error}</div>}
        {(!addonStatus?.addon_installed || !addonStatus?.bridge_installed) && addonStatus?.profile_root && <div className="quiet-box">The ESO profile is configured, but one or more ATTB addon components are missing. Use Install / Repair Addon below.</div>}
        {(addonStatus?.addon_update_available || addonStatus?.bridge_update_available) && <div className="notice-banner warn-banner">One or more installed ATTB addon components are older than the bundled {addonStatus.bundled_version}. Install / Repair updates both components.</div>}
        {(addonStatus?.addon_newer_than_bundled || addonStatus?.bridge_newer_than_bundled) && <div className="quiet-box">A locally installed ATTB addon component is newer than the {addonStatus.bundled_version} copy bundled with this app. ATTB preserves newer components by default.</div>}
        {addonStatus?.bridge_installed && !addonStatus?.bridge_saved_variables_found && <div className="quiet-box"><b>Sync bridge installed.</b> Log into ESO once so the game can create its SavedVariables file. Until then ATTB can only read the full archive when ESO writes it.</div>}
        {addonStatus?.bridge_saved_variables_found && addonStatus?.bridge_within_normal_save_limit && !addonStatus?.bridge_truncated && <div className="notice-banner"><b>ESO-controlled sync bridge ready.</b> Disk file {(addonStatus.bridge_file_size / 1024).toFixed(1)} KB{addonStatus.bridge_estimated_bytes ? ` · internal budget ${(addonStatus.bridge_estimated_bytes / 1024).toFixed(1)} / ${(addonStatus.bridge_budget_bytes / 1024).toFixed(0)} KB (${addonStatus.bridge_budget_status || 'ok'})` : ''}. ESO still controls the exact write time. Run /reloadui in ESO whenever you need a fresh snapshot immediately.</div>}
        {addonStatus?.bridge_truncated && <div className="notice-banner warn-banner"><b>Partial ESO sync.</b> The bridge protected its ${(addonStatus.bridge_budget_bytes / 1024).toFixed(0)} KB internal budget and omitted {addonStatus.bridge_dropped_sections?.length ? addonStatus.bridge_dropped_sections.join(', ') : 'lower-priority detail'}. ATTB preserves the last complete values for omitted sections until the full archive reaches disk on a loading screen, /reloadui, logout, or exit.</div>}
        {addonStatus?.bridge_saved_variables_found && !addonStatus?.bridge_within_normal_save_limit && <div className="notice-banner warn-banner"><b>Sync bridge is too large for normal-play saving.</b> It is {(addonStatus.bridge_file_size / 1024).toFixed(1)} KB. ESO may defer it until a loading screen, /reloadui, logout, or exit.</div>}
        <div className="button-row"><button type="button" className="btn primary" disabled={!!addonBusy || !addonStatus?.profile_root} onClick={installAddon}>{addonBusy === 'install' ? 'Installing…' : 'Install / Repair Addon'}</button><button type="button" className="btn secondary" disabled={!!addonBusy} onClick={chooseAddonFolder}>{addonBusy === 'choose' ? 'Choosing…' : 'Choose ESO Folder'}</button><button type="button" className="btn secondary" disabled={!!addonBusy || !addonStatus?.enabled} onClick={syncAddon}>{addonBusy === 'sync' ? 'Syncing…' : 'Sync Now'}</button><button type="button" className="btn secondary" disabled={!!addonBusy || !addonStatus?.enabled} onClick={openAddonImport}>Import Data From Addon</button></div>
        <div className="button-row compact-buttons"><button type="button" className="btn ghost" disabled={!addonStatus?.profile_root} onClick={() => window.api.addon.openFolder('addons')}>Open AddOns Folder</button><button type="button" className="btn ghost" disabled={!addonStatus?.profile_root} onClick={() => window.api.addon.openFolder('saved')}>Open SavedVariables Folder</button><button type="button" className="btn ghost" onClick={() => window.api.addon.openRepository()}>Addon GitHub</button></div>
        <small className="setting-footnote">One ESO profile is active at a time. ATTB supports live, liveeu, and PTS profile roots and never executes Lua from either SavedVariables file. ESO controls disk writes. The bridge requests better save opportunities when possible, but /reloadui remains the reliable way to force a fresh SavedVariables write.</small>
      </section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Network</span><h2>Remote build images</h2></div></div><label className="setting-row clickable"><div><b>Allow images referenced by trusted imported builds</b><p>ATTB remains offline by default. Remote downloads are restricted to HTTPS, five megabytes, real image formats, and a local cache.</p></div><span className="switch"><input type="checkbox" checked={remoteImages} onChange={event => setAppSetting('remote_images', event.target.checked)} /><i /></span></label></section>
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Storage</span><h2>Local data</h2></div></div><div className="data-path"><small>SQLite database</small><code>{dbPath}</code></div><div className="data-path"><small>Bundled ESO catalog</small><code>{catalog?.catalog_version} · {catalog?.game_version} · {(catalog?.lines || []).length} skill lines</code></div><div className="button-row"><button className="btn secondary" onClick={clearCache}>Clear downloaded image cache</button><button className="btn danger" onClick={resetApp}>Reset entire app</button></div></section>
      <section className="panel about-panel"><div className="section-head"><div><span className="eyebrow">About</span><h2>Arrow to the Build</h2><p className="app-tagline about-tagline">{APP_TAGLINE}</p></div></div><div className="about-details"><div><small>App version</small><b>{appInfo.version ? `v${appInfo.version}` : 'Loading…'}</b></div><div><small>Built for</small><b>ESO {catalog?.game_version || 'catalog not loaded'}</b></div><div><small>Build format</small><b>Schema {builds.find(item => item.is_bundled)?.schema_version || 4}</b></div></div><div className="button-row"><button type="button" className="btn secondary" onClick={() => openProjectLink(appInfo.repository || 'https://github.com/DeadxxSmile/Arrow-to-the-Build')}>Open GitHub project</button><button type="button" className="btn ghost" onClick={() => openProjectLink(appInfo.issues || 'https://github.com/DeadxxSmile/Arrow-to-the-Build/issues')}>Report an issue</button></div></section>
    </div>}

    {tab === 'character' && <div className="settings-stack">
      <section className="panel"><div className="section-head"><div><span className="eyebrow">Account-wide access</span><h2>ESO Plus</h2></div></div><label className="setting-row clickable"><div><b>ESO Plus active</b><p>Used for DLC-access notes and subscription-specific recommendations across every tracked character.</p></div><span className="switch"><input type="checkbox" checked={esoPlus} onChange={event => setAppSetting('eso_plus', event.target.checked)} /><i /></span></label></section>
      {character?.addon_sync?.linked && <section className="panel character-sync-panel"><div className="section-head"><div><span className="eyebrow">ESO live data</span><h2>{character.name} is linked</h2><p>{character.addon_sync.account_name} · {character.addon_sync.world_name} · ID {character.addon_sync.eso_character_id}</p></div><div className="schema-badges"><span>Addon {character.addon_sync.addon_version}</span><span>{character.addon_sync.overrides?.length || 0} override{character.addon_sync.overrides?.length === 1 ? '' : 's'}</span></div></div>
        <div className="sync-character-summary"><div><small>Last ESO snapshot</small><b>{character.addon_sync.captured_at ? new Date(character.addon_sync.captured_at * 1000).toLocaleString() : 'Waiting for data'}</b></div><div><small>Override mode</small><b>{overridesEnabled ? 'Enabled' : 'Disabled'}</b></div><div><small>Identity source</small><b>ESO addon</b></div></div>
        <div className="sync-refresh-reminder"><b>Snapshot look stale?</b><span>Run <code>/reloadui</code> in ESO, then use Sync Now here. ESO decides when SavedVariables reach disk.</span></div>
        {!character.addon_sync.profile_active && <div className="notice-banner warn-banner">This character belongs to a different ESO profile than the one currently selected in App Settings. Its last imported values are preserved, but it will not receive updates until that profile is active again.</div>}
        {character.addon_sync.overrides?.length > 0 && <div className="override-summary"><div><b>Active overrides</b><small>Restore any field independently, or disable override mode to clear every override at once.</small></div><div className="override-summary-list">{character.addon_sync.overrides.map(item => <div key={item.path}><span>{overrideLabel(item.path)}</span><code>{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</code><button type="button" className="override-reset compact" onClick={() => clearAddonOverride(item.path)} title="Restore live ESO value" aria-label={`Restore ${overrideLabel(item.path)} to live ESO value`}>↶</button></div>)}</div></div>}
        <div className="button-row"><button type="button" className="btn secondary" onClick={syncAddon}>Sync Now</button><button type="button" className="btn danger" onClick={unlinkCurrent}>Stop Syncing Character</button></div>
      </section>}
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
        <section className="panel danger-zone"><div><span className="eyebrow">Danger zone</span><h2>Remove character</h2><p>This removes only the ATTB profile. It cannot affect the character in ESO.</p></div><button className="btn danger" onClick={removeCharacter}>Remove {character.name}</button></section>
      </>}
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
