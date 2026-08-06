import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import TitleBar from './components/TitleBar'
import CharacterModal from './components/CharacterModal'
import CharacterSwitcher from './components/CharacterSwitcher'
import NumberStepper from './components/NumberStepper'
import ErrorBoundary from './components/ErrorBoundary'
import { displayLine, esoCatalog } from './utils/catalogLogic'
import { applyCompletionChange } from './utils/buildLogic'
import { applyVariant, availableVariants, listVariants } from './utils/variantLogic'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const primaryNav = [
  ['/setup', 'Basic Setup', '⌁'], ['/status', 'Current Levels', '◈'], ['/skills', 'Skills & Passives', '✦'],
  ['/equipment', 'Equipment', '◫'], ['/rotations', 'Skill Bars & Rotations', '↻'],
  ['/champion-points', 'Champion Points', '✧'], ['/consumables', 'Consumables / Other', '⚗'],
  ['/help/tips', 'Help & Tools', '?']
]
const helpNav = [
  ['/help/tips', 'Gameplay Tips', '◆'], ['/help/resources', 'ESO Resources', '↗'], ['/help/import-export', 'Import / Export', '⇄']
]
const cpNav = [
  ['/champion-points', 'Overview', '✧', null], ['/champion-points/craft', 'Craft', '◇', 'cp_craft'],
  ['/champion-points/warfare', 'Warfare', '◇', 'cp_warfare'], ['/champion-points/fitness', 'Fitness', '◇', 'cp_fitness']
]
const groupOrder = ['Class', 'Weapon', 'Armor', 'World', 'Guild', 'Alliance War', 'Racial', 'Craft', 'System']

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
    <div className="section-rail-head"><span className="eyebrow">Help &amp; Tools</span><h2>Resources</h2><p>Guide notes, backups, build files, and trusted ESO sites.</p></div>
    {helpNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `section-rail-link ${isActive ? 'active' : ''}`}><span>{icon}</span><b>{label}</b></NavLink>)}
  </aside>
  return null
}

export default function App() {
  const location = useLocation()
  const [builds, setBuilds] = useState([])
  const [characters, setCharacters] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [character, setCharacter] = useState(null)
  const [buildRecord, setBuildRecord] = useState(null)
  const [modal, setModal] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appSettings, setAppSettings] = useState({ theme: 'dark', eso_plus: 'false' })
  const contentRef = useRef(null)
  const activeIdRef = useRef(null)
  const queue = useRef(Promise.resolve())

  const baseBuild = buildRecord?.data || null
  const build = useMemo(() => applyVariant(baseBuild, character?.variant_id), [baseBuild, character?.variant_id])
  const variants = useMemo(() => listVariants(baseBuild), [baseBuild])
  const selectableVariants = useMemo(() => availableVariants(baseBuild), [baseBuild])
  const theme = appSettings.theme || 'dark'
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
    if (!raw.theme) { raw.theme = 'dark'; await window.api.settings.set('theme', 'dark') }
    if (raw.eso_plus === undefined) { raw.eso_plus = 'false'; await window.api.settings.set('eso_plus', 'false') }
    setAppSettings(raw); return raw
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

  useEffect(() => { (async () => { try { await reloadBuilds(); await reloadCharacters(); await reloadSettings() } finally { setLoading(false) } })() }, [reloadBuilds, reloadCharacters, reloadSettings])
  useEffect(() => { refreshActive() }, [activeId, refreshActive])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0 }, [location.pathname, activeId])

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
  const incrementCp = useCallback(tree => run(async () => {
    if (!activeIdRef.current) return
    await window.api.characters.incrementCp(activeIdRef.current, tree, 1)
    await refreshActive(); await reloadCharacters(activeIdRef.current)
  }), [run, refreshActive, reloadCharacters])
  const setSkillRank = useCallback((id, rank) => run(async () => { if (activeIdRef.current) { await window.api.characters.setSkillRank(activeIdRef.current, id, rank); await refreshActive() } }), [run, refreshActive])
  const setSkillTracking = useCallback((allocations, completed) => run(async () => { if (activeIdRef.current) { await window.api.characters.setSkillTracking(activeIdRef.current, allocations, completed); await refreshActive() } }), [run, refreshActive])
  const toggleUnlock = useCallback((itemId, done) => run(async () => {
    if (!activeIdRef.current || !build || !character) return
    const { allocations, completed } = applyCompletionChange(build, character, itemId, done)
    await window.api.characters.setSkillTracking(activeIdRef.current, allocations, completed); await refreshActive()
  }), [run, refreshActive, build, character])
  const setGearPiece = useCallback((stage, key, done) => run(async () => { if (activeIdRef.current) { await window.api.characters.setGearPiece(activeIdRef.current, stage, key, done); await refreshActive() } }), [run, refreshActive])
  const setAppSetting = useCallback(async (key, value) => { await window.api.settings.set(key, String(value)); setAppSettings(s => ({ ...s, [key]: String(value) })) }, [])
  const addTrackedSkillLine = useCallback(lineId => run(async () => { if (activeIdRef.current) { await window.api.characters.addTrackedSkillLine(activeIdRef.current, lineId); await refreshActive() } }), [run, refreshActive])
  const deleteTrackedSkillLine = useCallback(lineId => run(async () => { if (activeIdRef.current) { await window.api.characters.deleteTrackedSkillLine(activeIdRef.current, lineId); await refreshActive() } }), [run, refreshActive])

  const ctx = useMemo(() => ({
    builds, characters, activeId, setActiveId, character, build, baseBuild, buildRecord, skillLines, skillGroups, loading,
    variants, selectableVariants, catalog: esoCatalog, appSettings, theme, esoPlus, setAppSetting, reloadSettings,
    reloadBuilds, reloadCharacters, refreshActive, updateCharacter, incrementCp, toggleUnlock, setSkillRank,
    setSkillTracking, setGearPiece, addTrackedSkillLine, deleteTrackedSkillLine, openCharacterModal: () => setModal(true)
  }), [builds, characters, activeId, character, build, baseBuild, buildRecord, skillLines, skillGroups, loading, variants,
    selectableVariants, appSettings, theme, esoPlus, setAppSetting, reloadSettings, reloadBuilds, reloadCharacters,
    refreshActive, updateCharacter, incrementCp, toggleUnlock, setSkillRank, setSkillTracking, setGearPiece,
    addTrackedSkillLine, deleteTrackedSkillLine])

  if (loading) return <AppContext.Provider value={ctx}><div className="app-root"><TitleBar /><main className="first-run-screen loading-screen"><img src="./logo.png" alt="" /><span className="eyebrow">Arrow to the Build</span><h1>Loading character data…</h1></main></div></AppContext.Provider>

  const firstRun = characters.length === 0
  if (firstRun) return <AppContext.Provider value={ctx}><div className="app-root"><TitleBar />
    <main className="first-run-screen"><img src="./logo.png" alt="Arrow to the Build" /><span className="eyebrow">ESO progression companion</span><h1>Build your first character</h1><p>Choose a bundled build, record the character you actually created, and ATTB will turn the guide into a step-by-step progression checklist.</p><button className="btn primary first-run-button" onClick={() => setModal(true)}>＋ Add First Character</button></main>
    <CharacterModal open={modal} builds={builds} firstCharacter onClose={() => setModal(false)} onImported={reloadBuilds} onCreated={async id => { setModal(false); await reloadCharacters(id); setActiveId(id) }} />
  </div></AppContext.Provider>

  const showRail = location.pathname.startsWith('/skills') || location.pathname.startsWith('/champion-points') || location.pathname.startsWith('/help')
  return <AppContext.Provider value={ctx}><div className="app-root">
    <TitleBar />
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo"><img src="./logo.png" alt="" />{!collapsed && <div><strong>ATTB</strong></div>}</div>
        <nav className="sidebar-nav" aria-label="Main">{primaryNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${(isActive || (to === '/skills' && location.pathname.startsWith('/skills')) || (to === '/help/tips' && location.pathname.startsWith('/help'))) ? 'active' : ''}`} title={collapsed ? label : ''}><span aria-hidden="true">{icon}</span>{collapsed ? <span className="sr-only">{label}</span> : <b>{label}</b>}</NavLink>)}</nav>
        <div className="sidebar-footer">
          <button className="nav-item build-creator-stub" disabled title="Planned after core tracking is stable"><span aria-hidden="true">✎</span>{!collapsed && <><b>Build Creator</b><em>Soon</em></>}</button>
          <NavLink to="/settings" className={({ isActive }) => `nav-item settings-link ${isActive ? 'active' : ''}`} title={collapsed ? 'Settings' : ''}><span aria-hidden="true">⚙</span>{collapsed ? <span className="sr-only">Settings</span> : <b>Settings</b>}</NavLink>
          <button className="collapse-btn" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? '›' : '‹'}</button>
        </div>
      </aside>
      <main className="main-panel">
        <header className="character-bar">
          <CharacterSwitcher characters={characters} activeId={activeId} onSelect={setActiveId} onAdd={() => setModal(true)} />
          <div className="character-level-center topbar-field"><span className="topbar-label">Level</span><NumberStepper value={character?.level || 1} min={1} max={50} onChange={level => updateCharacter({ level })} label="Overall character level" /></div>
          <label className="variant-control topbar-field"><span className="topbar-label">Build Variant</span><select value={character?.variant_id || ''} disabled={!character || selectableVariants.length < 2} onChange={event => updateCharacter({ variant_id: event.target.value })}>{selectableVariants.map(variant => <option key={variant.id} value={variant.id}>{variant.name}{variant.changes.length ? '' : ' (base)'}</option>)}</select></label>
        </header>
        <div className={`workspace ${showRail ? 'with-section-rail' : ''}`}>
          <SectionRail location={location} skillGroups={skillGroups} character={character} />
          <div className="content-scroll" ref={contentRef}><ErrorBoundary resetKey={`${location.pathname}:${activeId || 'none'}`}><Outlet key={`${location.pathname}:${activeId || 'none'}`} /></ErrorBoundary></div>
        </div>
      </main>
    </div>
    <CharacterModal open={modal} builds={builds} onClose={() => setModal(false)} onImported={reloadBuilds} onCreated={async id => { setModal(false); await reloadCharacters(id); setActiveId(id) }} />
  </div></AppContext.Provider>
}
