import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import TitleBar from './components/TitleBar'
import CharacterModal from './components/CharacterModal'
import CharacterSwitcher from './components/CharacterSwitcher'
import AddonSetupModal from './components/AddonSetupModal'
import AddonImportModal from './components/AddonImportModal'
import ErrorBoundary from './components/ErrorBoundary'
import { useAppDialog } from './components/AppDialogProvider'
import useBuildEditor from './hooks/useBuildEditor'
import { displayLine, esoCatalog, SKILL_LINE_GROUP_ORDER } from './utils/catalogLogic'
import { applyCompletionChange } from './utils/buildLogic'
import { APP_TAGLINE } from './utils/branding'
import { HELP_NAV_SECTIONS } from './utils/helpReference.mjs'
import { fallbackForWorkspace, isWorkspaceContentPath, workspaceForPath } from './utils/workspaceLogic.mjs'
import { applyThemeToDocument } from './utils/themeEngine.mjs'
import { resolveProgressionScope } from '../shared/progressionScope.mjs'
import {
  applyLoadout, applyVariant, availableLoadouts, availableVariants,
  listLoadouts, listVariants, displayVariantName
} from './utils/variantLogic'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const characterNavSections = [
  { label: 'Start here', items: [
    ['/setup', 'Basic Info', '⌁'], ['/status', 'Current Levels', '◈']
  ] },
  { label: 'Build progress', items: [
    ['/skills', 'Skills & Passives', '✦'], ['/equipment', 'Equipment', '◫'],
    ['/rotations', 'Skill Bars & Rotations', '↻'], ['/champion-points', 'Champion Points', '✧']
  ] },
  { label: 'Support', items: [
    ['/companions', 'Companions', '♟'], ['/consumables', 'Consumables / Other', '⚗']
  ] },
  { label: 'Guidance', items: [
    ['/gameplay-tips', 'Gameplay Tips', '◆']
  ] },
  { label: 'Character data', items: [
    ['/character-data', 'Backups & Import', '⇄']
  ] }
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

function routeStorageKey(workspace) { return `attb-last-${workspace}-route` }
function rememberedWorkspaceRoute(workspace, hasCharacters = true) {
  if (workspace === 'character' && !hasCharacters) return null
  const key = routeStorageKey(workspace)
  const saved = localStorage.getItem(key)
  if (!saved) return null
  if (isWorkspaceContentPath(saved, workspace)) return saved
  localStorage.removeItem(key)
  return null
}

function WorkspaceGlyph({ workspace }) {
  if (workspace === 'character') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></svg>
  if (workspace === 'build-editor') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.8 6.2 14 15.7 4.5a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L10 17.8 5 18.8Z" /><path d="m14.5 5.7 3.8 3.8" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" /><path d="M9.9 9.2a2.3 2.3 0 0 1 4.5.6c0 1.7-2.4 2-2.4 3.8" /><path d="M12 17.2h.01" /></svg>
}

function WorkspaceSwitcher({ active, onSwitch }) {
  const items = [
    ['character', 'Character', 'Character Tracker'],
    ['build-editor', 'Build', 'Build Editor'],
    ['help', 'Help', 'Help & Tools']
  ]
  return <div className="workspace-tabs" role="navigation" aria-label="Workspaces">{items.map(([id, label, title]) => <button
    type="button"
    key={id}
    className={`workspace-tab workspace-tab-${id} ${active === id ? 'active' : ''}`}
    onClick={() => onSwitch(id)}
    title={title}
    aria-current={active === id ? 'page' : undefined}
  ><WorkspaceGlyph workspace={id} /><span>{label}</span></button>)}</div>
}

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

  return null
}


const settingsNav = [
  ['general', 'General', '⚙'],
  ['character', 'Character', '♙'],
  ['addon', 'ESO Addon & Sync', '↻'],
  ['editor', 'Build Editor', '✎']
]

function SettingsSidebarNav({ location }) {
  const params = new URLSearchParams(location.search)
  const requested = params.get('tab')
  const activeTab = settingsNav.some(([id]) => id === requested) ? requested : 'general'
  return <nav className="sidebar-nav settings-sidebar-nav" aria-label="Settings">{settingsNav.map(([id, label, icon]) => <NavLink
    key={id}
    to={`/settings?tab=${id}`}
    className={() => `nav-item ${activeTab === id ? 'active' : ''}`}
    aria-current={activeTab === id ? 'page' : undefined}
  ><span aria-hidden="true">{icon}</span><b>{label}</b></NavLink>)}</nav>
}

function CharacterSidebarNav({ location }) {
  return <nav className="sidebar-nav character-tracker-nav" aria-label="Character Tracker">{characterNavSections.map(section => <Fragment key={section.label}>
    <span className="sidebar-section-label">{section.label}</span>
    {section.items.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${(isActive || (to === '/skills' && location.pathname.startsWith('/skills')) || (to === '/champion-points' && location.pathname.startsWith('/champion-points'))) ? 'active' : ''}`}><span aria-hidden="true">{icon}</span><b>{label}</b></NavLink>)}
  </Fragment>)}</nav>
}

function BuildEditorSidebarNav({ draft }) {
  const levelingRequired = draft ? resolveProgressionScope(draft.data || {}).leveling_content_required : true
  return <nav className="sidebar-nav editor-nav" aria-label="Build Editor">
    <span className="sidebar-section-label">Library</span>
    {buildLibraryNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span aria-hidden="true">{icon}</span><b>{label}</b></NavLink>)}
    <span className="sidebar-section-label current-build-label">Current build</span>
    {buildCurrentNav.map(([to, label, icon]) => {
      const displayLabel = to === '/build-editor/leveling' && !levelingRequired ? 'Build Phases' : label
      return draft
        ? <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span aria-hidden="true">{icon}</span><b>{displayLabel}</b></NavLink>
        : <button type="button" key={to} className="nav-item editor-disabled" disabled title="Open or create a build first"><span aria-hidden="true">{icon}</span><b>{displayLabel}</b></button>
    })}
    <span className="sidebar-section-label">Authoring</span>
    {buildAuthoringNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span aria-hidden="true">{icon}</span><b>{label}</b></NavLink>)}
  </nav>
}

function HelpSidebarNav() {
  return <nav className="sidebar-nav help-tools-nav" aria-label="Help and Tools">{HELP_NAV_SECTIONS.map(section => <Fragment key={section.label}>
    <span className="sidebar-section-label">{section.label}</span>
    {section.items.map(item => <NavLink end={!!item.end} key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b></NavLink>)}
  </Fragment>)}</nav>
}

function UnifiedSidebar({ mode, workspace, location, draft, onSwitchWorkspace }) {
  const settingsActive = mode === 'settings'
  const settingsTarget = settingsActive ? `/settings${location.search || '?tab=general'}` : workspace === 'build-editor' ? '/settings?tab=editor' : '/settings?tab=general'
  const closeSettings = event => {
    if (!settingsActive) return
    event.preventDefault()
    const remembered = localStorage.getItem('attb-last-workspace')
    onSwitchWorkspace(['character', 'build-editor', 'help'].includes(remembered) ? remembered : 'character')
  }
  return <aside className={`sidebar sidebar-mode-${mode}`}>
    <div className="sidebar-workspace-header">
      <WorkspaceSwitcher active={settingsActive ? '' : workspace} onSwitch={onSwitchWorkspace} />
    </div>
    <div className="sidebar-nav-surface">
      {mode === 'settings' ? <SettingsSidebarNav location={location} />
        : mode === 'build-editor' ? <BuildEditorSidebarNav draft={draft} />
          : mode === 'help' ? <HelpSidebarNav />
            : <CharacterSidebarNav location={location} />}
    </div>
    <div className={`sidebar-settings-dock ${settingsActive ? 'active' : ''}`}>
      <NavLink to={settingsTarget} onClick={closeSettings} className={`sidebar-settings-tab ${settingsActive ? 'active' : ''}`} aria-current={settingsActive ? 'page' : undefined} title={settingsActive ? 'Return to previous workspace' : 'Open Settings'}><span aria-hidden="true">⚙</span><b>Settings</b></NavLink>
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
  const workspace = workspaceForPath(location.pathname)
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
  const [loading, setLoading] = useState(true)
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS)
  const [themeRegistry, setThemeRegistry] = useState({ themes: [], errors: [], schema: null, directory: '' })
  const [themePreview, setThemePreview] = useState(null)
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
  const themeCatalog = themeRegistry.themes || []
  const activeTheme = themeCatalog.find(item => item.id === theme) || themeCatalog.find(item => item.id === 'default') || null
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
      const ai = SKILL_LINE_GROUP_ORDER.indexOf(a), bi = SKILL_LINE_GROUP_ORDER.indexOf(b)
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
  const reloadThemes = useCallback(async provided => {
    const registry = provided || await window.api.themes.list()
    setThemeRegistry(registry)
    return registry
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
      await reloadThemes()
      const status = await reloadAddonStatus()
      if (!status.onboarding_complete) setAddonSetupOpen(true)
      else if (status.enabled) await reloadAddonDiscoveries(true)
    } finally { setLoading(false) }
  })() }, [reloadBuilds, reloadCharacters, reloadSettings, reloadThemes, reloadAddonStatus, reloadAddonDiscoveries])
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
          // First-run addon setup owns the modal layer. Queue discoveries behind it so
          // onboarding and import can never render on top of each other.
          if (!addonSetupOpen && !modal) setAddonImportOpen(true)
        }
      }
    }
    window.api.addon.onSyncUpdated(handle)
    return () => window.api.addon.offSyncUpdated()
  }, [reloadCharacters, refreshActive, addonSetupOpen, modal])
  useEffect(() => {
    const selected = themePreview || activeTheme
    if (selected) applyThemeToDocument(selected, themePreview ? 'theme-preview' : selected.id)
  }, [activeTheme, themePreview])
  useEffect(() => {
    if (!themeCatalog.length || themePreview || themeCatalog.some(item => item.id === theme)) return
    window.api.settings.set('theme', 'default').then(() => setAppSettings(current => ({ ...current, theme: 'default' }))).catch(() => {})
  }, [theme, themeCatalog, themePreview])
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0 }, [location.pathname, location.search, activeId, workspace])

  useEffect(() => {
    if (loading || startupApplied.current) return
    startupApplied.current = true
    if (launchedWithRoute.current) return
    const preference = appSettings.startup_workspace || 'last'
    const target = preference === 'last' ? (localStorage.getItem('attb-last-workspace') || 'character') : preference
    const saved = rememberedWorkspaceRoute(target, characters.length > 0)
    navigate(saved || fallbackForWorkspace(target), { replace: true })
  }, [loading, appSettings.startup_workspace, characters.length, navigate])

  useEffect(() => {
    if (loading || !startupApplied.current || !isWorkspaceContentPath(location.pathname, workspace)) return
    localStorage.setItem('attb-last-workspace', workspace)
    localStorage.setItem(routeStorageKey(workspace), location.pathname)
  }, [loading, location.pathname, workspace])

  const switchWorkspace = useCallback((target, explicitPath = '') => {
    localStorage.setItem('attb-last-workspace', target)
    if (isWorkspaceContentPath(location.pathname, workspace)) localStorage.setItem(routeStorageKey(workspace), location.pathname)
    const saved = rememberedWorkspaceRoute(target, characters.length > 0)
    navigate(explicitPath || saved || fallbackForWorkspace(target))
  }, [characters.length, location.pathname, navigate, workspace])

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
  const setAddonOverrideMode = useCallback(async enabled => {
    if (!enabled) {
      const approved = await dialog.confirm({
        title: 'Disable synced-data overrides?',
        message: 'All overrides across every synced character will be deleted. ATTB will restore the latest values reported by ESO.',
        confirmLabel: 'Disable and Restore Synced Data',
        danger: true
      })
      if (!approved) return false
    }
    await window.api.addon.setOverrideMode(enabled)
    await reloadSettings()
    await reloadCharacters(activeIdRef.current)
    await refreshActive()
    await reloadAddonStatus()
    return true
  }, [dialog, reloadSettings, reloadCharacters, refreshActive, reloadAddonStatus])
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
    loadouts, selectableLoadouts, variants, selectableVariants, catalog: esoCatalog, appSettings, theme, activeTheme, themeCatalog,
    themeErrors: themeRegistry.errors || [], themeSchema: themeRegistry.schema, themesDirectory: themeRegistry.directory,
    setThemePreview, reloadThemes, esoPlus, setAppSetting, reloadSettings,
    reloadBuilds, reloadCharacters, refreshActive, updateCharacter, toggleUnlock, setTemporaryUnlockState, setSkillRank,
    setSkillTracking, setGearPiece, addTrackedSkillLine, deleteTrackedSkillLine, openCharacterModal: () => setModal(true),
    workspace, switchWorkspace, editor, characterBuilds,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride, setAddonOverrideMode
  }), [builds, characters, activeId, character, build, baseBuild, loadoutBuild, buildRecord, skillLines, skillGroups, loading,
    loadouts, selectableLoadouts, variants, selectableVariants, appSettings, theme, activeTheme, themeCatalog, themeRegistry,
    setThemePreview, reloadThemes, esoPlus, setAppSetting, reloadSettings, reloadBuilds, reloadCharacters,
    refreshActive, updateCharacter, toggleUnlock, setTemporaryUnlockState, setSkillRank, setSkillTracking, setGearPiece,
    addTrackedSkillLine, deleteTrackedSkillLine, workspace, switchWorkspace, editor, characterBuilds,
    addonStatus, reloadAddonStatus, reloadAddonDiscoveries, openAddonSetup, openAddonImport, clearAddonOverride, setAddonOverrideMode])

  const changeHeaderBuild = useCallback(async buildId => {
    if (!character || !buildId || buildId === character.build_id) return
    const next = characterBuilds.find(item => item.id === buildId)
    const classChanged = next?.class_name && next.class_name !== build?.defaults?.class
    const message = classChanged
      ? `Change ${character.name} from ${build?.defaults?.class || 'the current class'} to a ${next.class_name} build? ATTB will clear incompatible class selections and build-specific equipment progress, while keeping level, CP, race, alliance, and personal progression.`
      : `Change the selected build for ${character.name}? Matching skill progress is preserved, while incompatible build completion and equipment entries are removed.`
    const approved = await dialog.confirm({ title: 'Change selected build?', message, confirmLabel: 'Change Build' })
    if (!approved) return
    try { await updateCharacter({ build_id: buildId }) }
    catch (error) { await dialog.alert({ title: 'Build could not be changed', message: error.message }) }
  }, [build, character, characterBuilds, dialog, updateCharacter])

  if (loading) return <AppContext.Provider value={ctx}><div className="app-root"><TitleBar /><main className="first-run-screen loading-screen"><img src="./logo.png" alt="" /><span className="eyebrow">Arrow to the Build</span><p className="app-tagline compact">{APP_TAGLINE}</p><h1>Loading local data…</h1></main></div></AppContext.Provider>

  const firstRun = characters.length === 0
  const isSettings = location.pathname === '/settings' || location.pathname.endsWith('/settings')
  const sidebarMode = isSettings ? 'settings' : workspace
  const characterRouteNeedsProfile = workspace === 'character' && !isSettings && location.pathname !== '/character-data'
  const showCharacterWelcome = firstRun && characterRouteNeedsProfile
  const showRail = !isSettings && workspace === 'character' && !firstRun && (location.pathname.startsWith('/skills') || location.pathname.startsWith('/champion-points'))

  return <AppContext.Provider value={ctx}><div className="app-root">
    <TitleBar />
    <div className={`app-shell ${sidebarMode}-shell`}>
      <UnifiedSidebar mode={sidebarMode} workspace={workspace} location={location} draft={editor.draft} onSwitchWorkspace={switchWorkspace} />
      <main className="main-panel">
        {isSettings ? <header className="settings-workspace-bar"><h1>Application Settings</h1></header> : workspace === 'build-editor' ? <header className="build-editor-bar">
          {editor.draft ? <>
            <div className="build-editor-title"><h1>{editor.draft.data.name || 'Untitled Build'}</h1></div>
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
            <div className="build-editor-title"><h1>Build Editor</h1></div>
            <div className="build-editor-bar-actions"><span className="workspace-status">No build open</span><button type="button" className="btn primary compact" onClick={() => navigate('/build-editor/new')}>Create Build</button><button type="button" className="btn secondary compact" onClick={() => navigate('/build-editor/guide')}>Open Guide</button></div>
          </>}
        </header> : workspace === 'help' ? <header className="help-tools-bar">
          <div className="help-tools-title"><h1>Gameplay and Build Info, Tools, and Guides</h1></div>
          {characters.length ? <CharacterSwitcher characters={characters} activeId={activeId} onSelect={setActiveId} onAdd={() => setModal(true)} /> : <button type="button" className="btn primary compact" onClick={() => setModal(true)}>＋ Add Character</button>}
        </header> : firstRun ? <header className="character-bar empty-character-bar">
          <h2>No character selected</h2>
          <button type="button" className="btn primary compact" onClick={() => setModal(true)}>＋ Add Character</button>
        </header> : <header className="character-bar">
          <CharacterSwitcher characters={characters} activeId={activeId} onSelect={setActiveId} onAdd={() => setModal(true)} />
          <label className="build-control topbar-field"><span className="topbar-label">Build</span><select value={character?.build_id || ''} disabled={!character || !characterBuilds.length} onChange={event => changeHeaderBuild(event.target.value)}>{characterBuilds.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="variant-control topbar-field"><span className="topbar-label">Variant</span><select value={character?.variant_id || ''} disabled={!character || selectableVariants.length < 2} onChange={event => updateCharacter({ variant_id: event.target.value })}>{selectableVariants.map(variant => <option key={variant.id} value={variant.id}>{displayVariantName(variant)}</option>)}</select></label>
        </header>}
        <div className={`workspace ${showRail ? 'with-section-rail' : ''}`}>
          {showRail && <SectionRail location={location} skillGroups={skillGroups} character={character} />}
          <div className="content-scroll" ref={contentRef}><ErrorBoundary resetKey={`${workspace}:${location.pathname}:${location.search}:${activeId || 'none'}`}>
            {showCharacterWelcome ? <CharacterFirstRun onAdd={() => setModal(true)} onOpenEditor={() => switchWorkspace('build-editor')} /> : <Suspense fallback={<div className="page"><div className="page-title"><h1>Loading...</h1></div></div>}><Outlet key={`${workspace}:${location.pathname}:${location.search}:${activeId || 'none'}`} /></Suspense>}
          </ErrorBoundary></div>
        </div>
      </main>
    </div>
    <CharacterModal open={modal} builds={characterBuilds} firstCharacter={firstRun} onClose={() => setModal(false)} onImportAddon={openAddonImport} onCreated={async id => { setModal(false); await reloadCharacters(id); setActiveId(id); if (workspace === 'build-editor') switchWorkspace('character', '/setup') }} />
    <AddonSetupModal open={addonSetupOpen} status={addonStatus} onComplete={async status => {
      setAddonStatus(status)
      setAddonSetupOpen(false)
      await reloadSettings()
      if (status?.enabled) await reloadAddonDiscoveries(true)
      else setAddonImportOpen(false)
    }} />
    <AddonImportModal open={addonImportOpen && !addonSetupOpen && !modal} discoveries={addonDiscoveries} builds={characterBuilds} defaultAuthor={appSettings.build_editor_default_author || 'NPC'} onClose={() => setAddonImportOpen(false)} onImported={async result => {
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
