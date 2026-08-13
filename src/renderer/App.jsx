import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import TitleBar from './components/TitleBar'
import CharacterModal from './components/CharacterModal'
import CharacterSwitcher from './components/CharacterSwitcher'
import AddonSetupModal from './components/AddonSetupModal'
import AddonImportModal from './components/AddonImportModal'
import NumberStepper from './components/NumberStepper'
import OverrideResetButton from './components/OverrideResetButton'
import ErrorBoundary from './components/ErrorBoundary'
import { useAppDialog } from './components/AppDialogProvider'
import useBuildEditor from './hooks/useBuildEditor'
import { displayLine, esoCatalog } from './utils/catalogLogic'
import { applyCompletionChange } from './utils/buildLogic'
import { APP_TAGLINE } from './utils/branding'
import {
  applyLoadout, applyVariant, availableLoadouts, availableVariants,
  listLoadouts, listVariants, displayVariantName
} from './utils/variantLogic'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const characterPrimaryNav = [
  ['/setup', 'Basic Setup', '⌁'], ['/status', 'Current Levels', '◈'], ['/skills', 'Skills & Passives', '✦'],
  ['/equipment', 'Equipment', '◫'], ['/rotations', 'Skill Bars & Rotations', '↻'],
  ['/champion-points', 'Champion Points', '✧'], ['/companions', 'Companions', '♟'],
  ['/consumables', 'Consumables / Other', '⚗'], ['/help/tips', 'Help & Tools', '?']
]
const characterHelpNav = [
  ['/help/tips', 'Gameplay Tips', '◆'], ['/help/guides', 'ATTB Guides', '▤'],
  ['/help/import-export', 'Character Backups', '⇄'], ['/help/resources', 'Resources & Links', '↗']
]
const buildLibraryNav = [
  ['/build-editor/library', 'Build Library', '▦'], ['/build-editor/new', 'Create New Build', '＋']
]
const buildCurrentNav = [
  ['/build-editor/overview', 'Overview', '⌁'], ['/build-editor/character-setup', 'Character Setup', '◉'],
  ['/build-editor/class-configuration', 'Class Configuration', '◇'], ['/build-editor/skills', 'Skills & Passives', '✦'],
  ['/build-editor/leveling', 'Leveling Plan', '↟'], ['/build-editor/equipment', 'Equipment', '◫'],
  ['/build-editor/champion-points', 'Champion Points', '✧'], ['/build-editor/companions', 'Companions', '♟'],
  ['/build-editor/loadouts', 'Loadouts & Variants', '⇄'],
  ['/build-editor/review', 'Review & Save', '✓']
]
const buildAuthoringNav = [
  ['/build-editor/guide', 'Build Setup Guide', '▤'], ['/build-editor/import-export', 'Import / Export', '⇄']
]
const cpNav = [
  ['/champion-points', 'Overview', '✧', null], ['/champion-points/craft', 'Craft', '◇', 'cp_craft'],
  ['/champion-points/warfare', 'Warfare', '◇', 'cp_warfare'], ['/champion-points/fitness', 'Fitness', '◇', 'cp_fitness']
]
const groupOrder = ['Class', 'Weapon', 'Armor', 'World', 'Guild', 'Alliance War', 'Racial', 'Craft', 'System']
const DEFAULT_SETTINGS = {
  theme: 'default',
  eso_plus: 'false',
  remote_images: 'false',
  startup_workspace: 'last',
  build_editor_default_author: 'NPC',
  build_editor_autosave_seconds: '5',
  build_editor_show_guidance: 'true',
  build_editor_advanced_default: 'false',
  build_editor_compatibility_warnings: 'true',
  addon_sync_enabled: 'false',
  addon_onboarding_complete: 'false',
  addon_profile_root: '',
  addon_allow_overrides: 'false'
}

function isBuildEditorPath(pathname) { return pathname.startsWith('/build-editor') }
function routeStorageKey(workspace) { return workspace === 'build-editor' ? 'attb-last-build-editor-route' : 'attb-last-character-route' }
function collapseStorageKey(workspace) { return `attb-sidebar-collapsed-${workspace}` }

function SectionRail({ location, skillGroups, character }) {
  if (location.pathname.startsWith('/skills')) return <aside className="section-rail" aria-label="Skill lines">
    <div className="section-rail-head"><span className="eyebrow">Skill tracking</span><h2>Lines</h2><p>Open a line to record ranks, skills, morphs, and passive points.</p></div>
    <NavLink end to="/skills" className={({ isActive }) => `section-rail-link overview ${isActive ? 'active' : ''}`}><span>✦</span><b>Overview</b></NavLink>
    <div className="section-rail-scroll">{skillGroups.map(([group, lines]) => <section key={group} className="section-rail-group"><small>{group}</small>{lines.map(line => <NavLink key={line.id} to={`/skills/${line.id}`} className={({ isActive }) => `section-rail-link ${isActive ? 'active' : ''}`}>
      <span aria-hidden="true">{line.tracked_only ? '＋' : '·'}</span><b>{line.name}</b><em>{character?.skill_ranks?.[line.id] ?? 0}/{line.max || 50}</em>
    </NavLink>)}</section>)}</div>
  </aside>

  if (location.pathname.startsWith('/champion-points')) return <aside className="section-rail cp-rail" aria-label="Champion Point constellations">
    <div className="section-rail-head"><span className="eyebrow">Champion Points</span><h2>Constellations</h2><p>Enter each tree's budget, then follow the build's required path and recommended branches.</p></div>
    {cpNav.map(([to, label, icon, field], index) => <NavLink end={index === 0} key={to} to={to} className={({ isActive }) => `section-rail-link ${isActive ? 'active' : ''}`}><span>{icon}</span><b>{label}</b>{field && <em>{character?.[field] ?? 0}</em>}</NavLink>)}
  </aside>

  if (location.pathname.startsWith('/help')) return <aside className="section-rail tools-rail" aria-label="Help and tools">
    <div className="section-rail-head"><span className="eyebrow">Help &amp; Tools</span><h2>Character support</h2><p>Gameplay guidance, ATTB/AI authoring docs, character backups, addon help, and trusted ESO resources.</p></div>
    {characterHelpNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `section-rail-link ${isActive ? 'active' : ''}`}><span>{icon}</span><b>{label}</b></NavLink>)}
  </aside>
  return null
}

function CharacterSidebar({ collapsed, location, onSwitchWorkspace, onToggle }) {
  return <aside className="sidebar">
    <div className="sidebar-logo"><img src="./logo.png" alt="" />{!collapsed && <div><strong>ATTB</strong><small>Character Tracker</small></div>}</div>
    <nav className="sidebar-nav" aria-label="Character Tracker">{characterPrimaryNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${(isActive || (to === '/skills' && location.pathname.startsWith('/skills')) || (to === '/help/tips' && location.pathname.startsWith('/help'))) ? 'active' : ''}`} title={collapsed ? label : ''}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</NavLink>)}</nav>
    <div className="sidebar-footer">
      <button type="button" className="nav-item workspace-switch" onClick={onSwitchWorkspace} title={collapsed ? 'Open Build Editor' : ''}><span aria-hidden="true">✎</span>{collapsed ? <span className="sr-only">Open Build Editor</span> : <><b>Build Creator</b><em>Open</em></>}</button>
      <NavLink to="/settings" className={({ isActive }) => `nav-item settings-link ${isActive ? 'active' : ''}`} title={collapsed ? 'Settings' : ''}><span aria-hidden="true">⚙</span>{collapsed ? <span className="sr-only">Settings</span> : <b>Settings</b>}</NavLink>
      <button className="collapse-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? '›' : '‹'}</button>
    </div>
  </aside>
}

function BuildEditorSidebar({ collapsed, draft, onSwitchWorkspace, onToggle }) {
  return <aside className="sidebar build-editor-sidebar">
    <div className="sidebar-logo"><img src="./logo.png" alt="" />{!collapsed && <div><strong>ATTB</strong><small>Build Editor</small></div>}</div>
    <nav className="sidebar-nav editor-nav" aria-label="Build Editor">
      {!collapsed && <span className="sidebar-section-label">Library</span>}
      {buildLibraryNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : ''}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</NavLink>)}
      {!collapsed && <span className="sidebar-section-label current-build-label">Current build</span>}
      {buildCurrentNav.map(([to, label, icon]) => draft
        ? <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : ''}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</NavLink>
        : <button type="button" key={to} className="nav-item editor-disabled" disabled title={collapsed ? `${label} - open a build first` : 'Open or create a build first'}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</button>)}
      {!collapsed && <span className="sidebar-section-label">Authoring</span>}
      {buildAuthoringNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : ''}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</NavLink>)}
    </nav>
    <div className="sidebar-footer">
      <button type="button" className="nav-item workspace-switch return-workspace" onClick={onSwitchWorkspace} title={collapsed ? 'Return to Character Tracker' : ''}><span aria-hidden="true">←</span>{collapsed ? <span className="sr-only">Return to Character Tracker</span> : <b>Character Tracker</b>}</button>
      <NavLink to="/build-editor/settings" className={({ isActive }) => `nav-item settings-link ${isActive ? 'active' : ''}`} title={collapsed ? 'Settings' : ''}><span aria-hidden="true">⚙</span>{collapsed ? <span className="sr-only">Settings</span> : <b>Settings</b>}</NavLink>
      <button className="collapse-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? '›' : '‹'}</button>
    </div>
  </aside>
}

function CharacterFirstRun({ onAdd, onOpenEditor }) {
  return <main className="workspace-empty-state">
    <img src="./logo-words.png" alt="Arrow to the Build" />
    <span className="eyebrow">ESO progression companion</span>
    <p className="app-tagline">{APP_TAGLINE}</p>
    <h1>Build your first character</h1>
    <p>Choose a build, record the character you actually created, and ATTB will turn it into a step-by-step progression checklist. The Build Editor remains available without a character.</p>
    <div className="first-run-actions"><button className="btn primary first-run-button" onClick={onAdd}>＋ Add First Character</button><button className="btn secondary first-run-button" onClick={onOpenEditor}>Open Build Editor</button></div>
  </main>
}

export default function App() {
  const dialog = useAppDialog()
  const location = useLocation()
  const navigate = useNavigate()
  const workspace = isBuildEditorPath(location.pathname) ? 'build-editor' : 'character'
  const launchedWithRoute = useRef(Boolean(window.location.hash && !['#', '#/'].includes(window.location.hash)))
  const startupApplied = useRef(false)
  const [builds, setBuilds] = useState([])
  const [characters, setCharacters] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [character, setCharacter] = useState(null)
  const [buildRecord, setBuildRecord] = useState(null)
  const [modal, setModal] = useState(false)
  const [addonStatus, setAddonStatus] = useState(null)
  const [addonSetupOpen, setAddonSetupOpen] = useState(false)
  const [addonDiscoveries, setAddonDiscoveries] = useState([])
  const [addonImportOpen, setAddonImportOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapseStorageKey('character')) === 'true')
  const [loading, setLoading] = useState(true)
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS)
  const contentRef = useRef(null)
  const activeIdRef = useRef(null)
  const queue = useRef(Promise.resolve())

  const baseBuild = buildRecord?.data || null
  const loadouts = useMemo(() => listLoadouts(baseBuild), [baseBuild])
  const selectableLoadouts = useMemo(() => availableLoadouts(baseBuild), [baseBuild])
  const loadoutBuild = useMemo(() => applyLoadout(baseBuild, character?.loadout_id), [baseBuild, character?.loadout_id])
  const activeLoadoutId = loadoutBuild?.active_loadout?.id || ''
  const build = useMemo(() => applyVariant(loadoutBuild, character?.variant_id, activeLoadoutId), [loadoutBuild, character?.variant_id, activeLoadoutId])
  const variants = useMemo(() => listVariants(loadoutBuild), [loadoutBuild])
  const selectableVariants = useMemo(() => availableVariants(loadoutBuild, activeLoadoutId), [loadoutBuild, activeLoadoutId])
  const theme = appSettings.theme || 'default'
  const esoPlus = appSettings.eso_plus === 'true'
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const skillLines = useMemo(() => {
    const relevant = (build?.relevant_lines || []).map(line => displayLine(line)).filter(Boolean)
    const used = new Set(relevant.map(line => line.id))
    const tracked = (character?.tracked_skill_lines || [])
      .filter(id => !used.has(id)).map(id => displayLine(null, id)).filter(Boolean)
      .map(line => ({ ...line, tracked_only: true, build_relevant: false }))
    return [...relevant, ...tracked].map(line => ({ ...line, rank: character?.skill_ranks?.[line.id] ?? 0 }))
  }, [build, character])

  const skillGroups = useMemo(() => {
    const groups = {}
    for (const line of skillLines) (groups[line.group || 'System'] ||= []).push(line)
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = groupOrder.indexOf(a), bi = groupOrder.indexOf(b)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b)
    }).map(([group, lines]) => [group, lines.slice().sort((a, b) => a.name.localeCompare(b.name))])
  }, [skillLines])

  const reloadBuilds = useCallback(async () => { const list = await window.api.builds.list(); setBuilds(list); return list }, [])
  const reloadCharacters = useCallback(async (preferred = null) => {
    const list = await window.api.characters.list()
    setCharacters(list)
    const saved = preferred || activeIdRef.current || localStorage.getItem('attb-active-character')
    const next = list.some(c => c.id === saved) ? saved : (list[0]?.id || null)
    activeIdRef.current = next
    setActiveId(next)
    return list
  }, [])
  const reloadSettings = useCallback(async () => {
    const raw = await window.api.settings.getAll()
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (raw[key] === undefined) { raw[key] = value; await window.api.settings.set(key, value) }
    }
    setAppSettings(raw)
    return raw
  }, [])
  const reloadAddonStatus = useCallback(async () => {
    const status = await window.api.addon.getStatus()
    setAddonStatus(status)
    return status
  }, [])
  const reloadAddonDiscoveries = useCallback(async (openWhenFound = false) => {
    const list = await window.api.addon.listDiscovered()
    setAddonDiscoveries(list)
    if (openWhenFound && list.length) setAddonImportOpen(true)
    return list
  }, [])
  const refreshActive = useCallback(async () => {
    const id = activeIdRef.current
    if (!id) { setCharacter(null); setBuildRecord(null); return null }
    const current = await window.api.characters.get(id)
    setCharacter(current)
    if (!current) { setBuildRecord(null); return null }
    setBuildRecord(await window.api.builds.get(current.build_id))
    localStorage.setItem('attb-active-character', id)
    return current
  }, [])

  const editor = useBuildEditor({ appSettings, reloadBuilds })
  const characterBuilds = useMemo(() => builds.filter(item => item.is_bundled || Number(item.last_saved_revision) > 0), [builds])

  useEffect(() => { (async () => {
    try {
      await reloadBuilds()
      await reloadCharacters()
      await reloadSettings()
      const status = await reloadAddonStatus()
      if (!status.onboarding_complete) setAddonSetupOpen(true)
      else if (status.enabled) await reloadAddonDiscoveries(true)
    } finally { setLoading(false) }
  })() }, [reloadBuilds, reloadCharacters, reloadSettings, reloadAddonStatus, reloadAddonDiscoveries])
  useEffect(() => { refreshActive() }, [activeId, refreshActive])
  useEffect(() => {
    const handle = async payload => {
      if (payload?.status) setAddonStatus(payload.status)
      if (payload?.type === 'sync') {
        await reloadCharacters(activeIdRef.current)
        await refreshActive()
        if (payload.new_characters?.length) {
          setAddonDiscoveries(current => {
            const merged = new Map(current.map(item => [item.character_key, item]))
            for (const item of payload.new_characters) merged.set(item.character_key, item)
            return [...merged.values()]
          })
          setAddonImportOpen(true)
        }
      }
    }
    window.api.addon.onSyncUpdated(handle)
    return () => window.api.addon.offSyncUpdated()
  }, [reloadCharacters, refreshActive])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { setCollapsed(localStorage.getItem(collapseStorageKey(workspace)) === 'true') }, [workspace])
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0 }, [location.pathname, activeId, workspace])

  useEffect(() => {
    if (loading || startupApplied.current) return
    startupApplied.current = true
    if (launchedWithRoute.current) return
    const preference = appSettings.startup_workspace || 'last'
    const target = preference === 'last' ? (localStorage.getItem('attb-last-workspace') || 'character') : preference
    if (target === 'build-editor') navigate(localStorage.getItem(routeStorageKey('build-editor')) || '/build-editor/library', { replace: true })
    else navigate(characters.length ? (localStorage.getItem(routeStorageKey('character')) || '/setup') : '/setup', { replace: true })
  }, [loading, appSettings.startup_workspace, characters.length, navigate])

  useEffect(() => {
    if (loading || !startupApplied.current || location.pathname === '/') return
    localStorage.setItem('attb-last-workspace', workspace)
    localStorage.setItem(routeStorageKey(workspace), location.pathname)
  }, [loading, location.pathname, workspace])

  const switchWorkspace = useCallback((target, explicitPath = '') => {
    localStorage.setItem('attb-last-workspace', target)
    if (location.pathname !== '/') localStorage.setItem(routeStorageKey(workspace), location.pathname)
    const fallback = target === 'build-editor' ? '/build-editor/library' : '/setup'
    const saved = target === 'character' && characters.length === 0 ? '/setup' : localStorage.getItem(routeStorageKey(target))
    navigate(explicitPath || saved || fallback)
  }, [characters.length, location.pathname, navigate, workspace])
  const toggleCollapsed = useCallback(() => setCollapsed(value => {
    const next = !value
    localStorage.setItem(collapseStorageKey(workspace), String(next))
    return next
  }), [workspace])

  const run = useCallback(task => {
    const result = queue.current.then(task)
    queue.current = result.catch(err => { console.error('[ATTB]', err) })
    return result
  }, [])
  const updateCharacter = useCallback(patch => run(async () => {
    if (!activeIdRef.current) return
    await window.api.characters.update(activeIdRef.current, patch)
    await refreshActive(); await reloadCharacters(activeIdRef.current)
  }), [run, refreshActive, reloadCharacters])
  const setSkillRank = useCallback((id, rank) => run(async () => { if (activeIdRef.current) { await window.api.characters.setSkillRank(activeIdRef.current, id, rank); await refreshActive() } }), [run, refreshActive])
  const setSkillTracking = useCallback((allocations, completed) => run(async () => { if (activeIdRef.current) { await window.api.characters.setSkillTracking(activeIdRef.current, allocations, completed); await refreshActive() } }), [run, refreshActive])
  const toggleUnlock = useCallback((itemId, done) => run(async () => {
    if (!activeIdRef.current || !build || !character) return
    const { allocations, completed } = applyCompletionChange(build, character, itemId, done)
    await window.api.characters.setSkillTracking(activeIdRef.current, allocations, completed); await refreshActive()
  }), [run, refreshActive, build, character])
  const setTemporaryUnlockState = useCallback((itemId, state) => run(async () => {
    if (!activeIdRef.current) return
    await window.api.characters.setTemporaryUnlockState(activeIdRef.current, itemId, state)
    await refreshActive()
  }), [run, refreshActive])
  const setGearPiece = useCallback((stage, key, done) => run(async () => { if (activeIdRef.current) { await window.api.characters.setGearPiece(activeIdRef.current, stage, key, done); await refreshActive() } }), [run, refreshActive])
  const setAppSetting = useCallback(async (key, value) => { await window.api.settings.set(key, String(value)); setAppSettings(s => ({ ...s, [key]: String(value) })) }, [])
  const addTrackedSkillLine = useCallback(lineId => run(async () => { if (activeIdRef.current) { await window.api.characters.addTrackedSkillLine(activeIdRef.current, lineId); await refreshActive() } }), [run, refreshActive])
  const deleteTrackedSkillLine = useCallback(lineId => run(async () => { if (activeIdRef.current) { await window.api.characters.deleteTrackedSkillLine(activeIdRef.current, lineId); await refreshActive() } }), [run, refreshActive])
  const clearAddonOverride = useCallback(fieldPath => run(async () => {
    if (!activeIdRef.current) return
    await window.api.addon.clearOverride(activeIdRef.current, fieldPath)
    await refreshActive(); await reloadCharacters(activeIdRef.current)
  }), [run, refreshActive, reloadCharacters])
  const openAddonSetup = useCallback(() => setAddonSetupOpen(true), [])
  const openAddonImport = useCallback(async () => {
    try {
      const status = await reloadAddonStatus()
      if (!status.enabled) { setAddonSetupOpen(true); return }
      await window.api.addon.syncNow()
      const list = await reloadAddonDiscoveries(false)
      if (!list.length) await dialog.alert({ title: 'No new addon characters found', message: 'Every character currently stored by the addon is already linked or has been dismissed. To relink an existing or dismissed snapshot, open Settings > ESO Addon & Sync. To discover a new ESO character, log into it and use /reloadui or log out so ESO writes a new snapshot.' })
      else setAddonImportOpen(true)
    } catch (error) { await dialog.alert({ title: 'Addon import unavailable', message: error.message || 'ATTB could not read the addon data.' }) }
  }, [reloadAddonStatus, reloadAddonDiscoveries, dialog])

  const ctx = useMemo(() => ({
    builds, characters, activeId, setActiveId, character, build, baseBuild, loadoutBuild, buildRecord, skillLines, skillGroups, loading,
    loadouts, selectableLoadouts, variants, selectableVariants, catalog: esoCatalog, appSettings, theme, esoPlus, setAppSetting, reloadSettings,
    reloadBuilds, reloadCharacters, refreshActive, updateCharacter, toggleUnlock, setTemporaryUnlockState, setSkillRank,
    setSkillTracking, setGearPiece, addTrackedSkillLine, deleteTrackedSkillLine, openCharacterModal: () => setModal(true),
    workspace, switchWorkspace, editor, characterBuilds,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride
  }), [builds, characters, activeId, character, build, baseBuild, loadoutBuild, buildRecord, skillLines, skillGroups, loading,
    loadouts, selectableLoadouts, variants, selectableVariants, appSettings, theme, esoPlus, setAppSetting, reloadSettings, reloadBuilds, reloadCharacters,
    refreshActive, updateCharacter, toggleUnlock, setTemporaryUnlockState, setSkillRank, setSkillTracking, setGearPiece,
    addTrackedSkillLine, deleteTrackedSkillLine, workspace, switchWorkspace, editor, characterBuilds,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride])

  if (loading) return <AppContext.Provider value={ctx}><div className="app-root"><TitleBar /><main className="first-run-screen loading-screen"><img src="./logo.png" alt="" /><span className="eyebrow">Arrow to the Build</span><p className="app-tagline compact">{APP_TAGLINE}</p><h1>Loading local data…</h1></main></div></AppContext.Provider>

  const firstRun = characters.length === 0
  const syncedCharacter = !!character?.addon_sync?.linked
  const syncedLocked = syncedCharacter && appSettings.addon_allow_overrides !== 'true'
  const characterRouteNeedsProfile = workspace === 'character' && !location.pathname.startsWith('/help') && location.pathname !== '/settings'
  const showCharacterWelcome = firstRun && characterRouteNeedsProfile
  const showRail = workspace === 'character' && (location.pathname.startsWith('/help') || (!firstRun && (location.pathname.startsWith('/skills') || location.pathname.startsWith('/champion-points'))))

  return <AppContext.Provider value={ctx}><div className="app-root">
    <TitleBar />
    <div className={`app-shell ${collapsed ? 'collapsed' : ''} ${workspace === 'build-editor' ? 'build-editor-shell' : 'character-shell'}`}>
      {workspace === 'build-editor'
        ? <BuildEditorSidebar collapsed={collapsed} draft={editor.draft} onSwitchWorkspace={() => switchWorkspace('character')} onToggle={toggleCollapsed} />
        : <CharacterSidebar collapsed={collapsed} location={location} onSwitchWorkspace={() => switchWorkspace('build-editor')} onToggle={toggleCollapsed} />}
      <main className="main-panel">
        {workspace === 'build-editor' ? <header className="build-editor-bar">
          {editor.draft ? <>
            <div className="build-editor-title"><span className="eyebrow">Editable build</span><h1>{editor.draft.data.name || 'Untitled Build'}</h1><p><span className="mono">{editor.draft.build_id}</span> · {editor.draft.dirty ? 'Unsaved revision changes' : editor.revisions.length ? 'Saved build is current' : 'Not saved as a permanent build yet'}</p></div>
            <div className="build-editor-bar-actions">
              <span className={`workspace-status ${editor.autosaveStatus}`}>{editor.autosaveStatus === 'pending' ? 'Autosave pending' : editor.autosaveStatus === 'saving' ? 'Autosaving…' : editor.autosaveStatus === 'error' ? 'Autosave failed' : editor.draft.dirty ? 'Recovery draft saved locally' : editor.revisions.length ? 'Saved' : 'Recovery draft ready'}</span>
              <button type="button" className="btn ghost compact" disabled={!editor.canUndo} onClick={editor.undo}>Undo</button>
              <button type="button" className="btn ghost compact" disabled={!editor.canRedo} onClick={editor.redo}>Redo</button>
              <button type="button" className="btn secondary compact" onClick={async () => { await editor.validateDraft(); navigate('/build-editor/review') }}>Review</button>
              <button type="button" className="btn primary compact" disabled={!editor.draft.dirty && editor.revisions.length > 0} onClick={async () => { try { const result = await editor.saveBuild(''); const sync = result.file_sync; await dialog.alert({ title: sync?.ok === false ? 'Build saved; JSON sync pending' : 'Build saved', message: sync?.ok === false ? `Saved as revision ${result.revision_number} inside ATTB. The user build JSON file was preserved and could not be updated:
${sync.error}` : `Saved as revision ${result.revision_number}.
JSON file: ${sync?.path || 'User build folder'}` }) } catch (error) { await dialog.alert({ title: 'Build could not be saved', message: error.message }) } }}>Save Build</button>
              <button type="button" className="btn ghost compact" onClick={async () => { try { await editor.closeDraft(); navigate('/build-editor/library') } catch (error) { await dialog.alert({ title: 'Draft could not be closed safely', message: error.message }) } }}>Close</button>
            </div>
          </> : <>
            <div><span className="eyebrow">Authoring workspace</span><h1>Build Editor</h1><p>Create, fork, import, and maintain Schema 4 builds without changing character progress.</p></div>
            <div className="build-editor-bar-actions"><span className="workspace-status">No build open</span><button type="button" className="btn primary" onClick={() => navigate('/build-editor/new')}>Create Build</button><button type="button" className="btn secondary" onClick={() => navigate('/build-editor/guide')}>Open Guide</button></div>
          </>}
        </header> : firstRun ? <header className="character-bar empty-character-bar">
          <div><span className="eyebrow">Character Tracker</span><h2>No character selected</h2><p>Add a character when you are ready to track a build in game.</p></div>
          <button type="button" className="btn primary" onClick={() => setModal(true)}>＋ Add Character</button>
        </header> : <header className={`character-bar ${selectableLoadouts.length > 1 ? 'has-loadouts' : ''}`}>
          <CharacterSwitcher characters={characters} activeId={activeId} onSelect={setActiveId} onAdd={() => setModal(true)} />
          {selectableLoadouts.length > 1 && <label className="loadout-control topbar-field"><span className="topbar-label">Build Loadout</span><select value={character?.loadout_id || activeLoadoutId} onChange={event => updateCharacter({ loadout_id: event.target.value })}>{selectableLoadouts.map(loadout => <option key={loadout.id} value={loadout.id}>{loadout.name}</option>)}</select></label>}
          <div className={`character-level-center topbar-field ${syncedCharacter ? 'synced-topbar-field' : ''}`}><span className="topbar-label">Level{syncedCharacter && <i className="sync-dot" title="Synced from ESO" />}</span><div className="synced-control"><NumberStepper value={character?.level || 1} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" disabled={syncedLocked} /><OverrideResetButton fieldPath="level" compact /></div></div>
          <label className="variant-control topbar-field"><span className="topbar-label">Build Variant</span><select value={character?.variant_id || ''} disabled={!character || selectableVariants.length < 2} onChange={event => updateCharacter({ variant_id: event.target.value })}>{selectableVariants.map(variant => <option key={variant.id} value={variant.id}>{displayVariantName(variant)}</option>)}</select></label>
        </header>}
        <div className={`workspace ${showRail ? 'with-section-rail' : ''}`}>
          {showRail && <SectionRail location={location} skillGroups={skillGroups} character={character} />}
          <div className="content-scroll" ref={contentRef}><ErrorBoundary resetKey={`${workspace}:${location.pathname}:${activeId || 'none'}`}>
            {showCharacterWelcome ? <CharacterFirstRun onAdd={() => setModal(true)} onOpenEditor={() => switchWorkspace('build-editor')} /> : <Suspense fallback={<div className="page"><div className="page-title"><h1>Loading...</h1></div></div>}><Outlet key={`${workspace}:${location.pathname}:${activeId || 'none'}`} /></Suspense>}
          </ErrorBoundary></div>
        </div>
      </main>
    </div>
    <CharacterModal open={modal} builds={characterBuilds} firstCharacter={firstRun} onClose={() => setModal(false)} onImportAddon={openAddonImport} onCreated={async id => { setModal(false); await reloadCharacters(id); setActiveId(id); if (workspace === 'build-editor') switchWorkspace('character', '/setup') }} />
    <AddonSetupModal open={addonSetupOpen} status={addonStatus} onComplete={async status => { setAddonStatus(status); setAddonSetupOpen(false); await reloadSettings(); if (status?.enabled) await reloadAddonDiscoveries(true) }} />
    <AddonImportModal open={addonImportOpen} discoveries={addonDiscoveries} builds={characterBuilds} defaultAuthor={appSettings.build_editor_default_author || 'NPC'} onClose={() => setAddonImportOpen(false)} onImported={async result => {
      const remaining = addonDiscoveries.filter(item => item.character_key !== result.character_key)
      setAddonDiscoveries(remaining)
      setAddonImportOpen(remaining.length > 0)
      await reloadCharacters(result.id); setActiveId(result.id); await refreshActive(); await reloadAddonStatus()
      if (result.created_build && result.build_id) {
        await reloadBuilds()
        await editor.openDraft(result.build_id)
        switchWorkspace('build-editor', '/build-editor/overview')
      } else if (workspace === 'build-editor') switchWorkspace('character', '/setup')
    }} onDismissed={async key => { const remaining = addonDiscoveries.filter(item => item.character_key !== key); setAddonDiscoveries(remaining); setAddonImportOpen(remaining.length > 0); await reloadAddonStatus() }} />
  </div></AppContext.Provider>
}
