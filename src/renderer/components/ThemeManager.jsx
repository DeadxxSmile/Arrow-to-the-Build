import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from './AppDialogProvider'
import ThemeEditorModal from './ThemeEditorModal'
import { themeIdFromName } from '../utils/themeEngine.mjs'

export default function ThemeManager({ flash }) {
  const { theme, themeCatalog, themeErrors, setAppSetting, reloadThemes, setThemePreview } = useApp()
  const dialog = useAppDialog()
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState('')
  const active = useMemo(() => themeCatalog.find(item => item.id === theme) || themeCatalog.find(item => item.id === 'default'), [theme, themeCatalog])
  const custom = useMemo(() => themeCatalog.filter(item => !item.built_in), [themeCatalog])

  const switchTheme = async id => { await setAppSetting('theme', id); flash?.(`${themeCatalog.find(item => item.id === id)?.name || 'Theme'} applied.`) }
  const createFrom = source => {
    const base = source || active || themeCatalog.find(item => item.id === 'default')
    const name = `${base?.name || 'ATTB Default'} Custom`
    const seed = themeIdFromName(name)
    let id = seed
    let suffix = 2
    while (themeCatalog.some(item => item.id === id)) id = `${seed.slice(0, 60)}-${suffix++}`
    setEditor({ id, name, author: '', description: `Custom colors based on ${base?.name || 'ATTB Default'}.`, based_on: base?.id || 'default', colors: {}, originalId: null })
  }
  const edit = source => setEditor({ id: source.id, name: source.name, author: source.author || '', description: source.description || '', based_on: source.based_on ?? null, colors: { ...(source.colors || {}) }, originalId: source.id })
  const save = async (definition, originalId, useTheme) => {
    const result = await window.api.themes.save(definition, originalId)
    await reloadThemes(result.registry)
    if (useTheme) await setAppSetting('theme', result.theme.id)
    setThemePreview(null)
    setEditor(null)
    flash?.(`${result.theme.name} saved${useTheme ? ' and applied' : ''}.`)
  }
  const importTheme = async overwrite => {
    setBusy('import')
    try {
      const result = await window.api.themes.import(overwrite)
      if (!result) return
      if (result.conflict) {
        const approved = await dialog.confirm({ title: `Replace ${result.existing.name}?`, message: `A custom theme with ID "${result.existing.id}" already exists. Replace its JSON with the imported theme?`, confirmLabel: 'Replace Theme', danger: true })
        if (approved) {
          const replaced = await window.api.themes.save(result.incoming_raw, result.existing.id)
          await reloadThemes(replaced.registry)
          flash?.(`${replaced.theme.name} replaced from imported JSON.`)
        }
        return
      }
      await reloadThemes(result.registry)
      flash?.(`${result.theme.name} imported.`)
    } catch (error) { await dialog.alert({ title: 'Theme import failed', message: error.message }) }
    finally { setBusy('') }
  }
  const remove = async source => {
    const approved = await dialog.confirm({ title: `Delete ${source.name}?`, message: 'This removes the custom theme JSON from ATTB. Export it first if you want to keep a copy.', confirmLabel: 'Delete Theme', danger: true })
    if (!approved) return
    try {
      const registry = await window.api.themes.delete(source.id)
      await reloadThemes(registry)
      if (theme === source.id) await setAppSetting('theme', 'default')
      flash?.(`${source.name} deleted.`)
    } catch (error) { await dialog.alert({ title: 'Theme could not be deleted', message: error.message }) }
  }
  const exportTheme = async source => { const path = await window.api.themes.export(source.id); if (path) flash?.(`${source.name} exported.`) }
  const exportTemplate = async () => { const path = await window.api.themes.exportTemplate(); if (path) flash?.('Theme Schema 1 template exported.') }
  const openFolder = async () => { try { await window.api.themes.openFolder() } catch (error) { await dialog.alert({ title: 'Themes folder unavailable', message: error.message }) } }
  const reload = async () => { await reloadThemes(); flash?.('Theme folder rescanned.') }

  return <>
    <section className="panel theme-settings-panel">
      <div className="section-head"><div><span className="eyebrow">Appearance</span><h2>Themes</h2><p>Use an ATTB palette, import a shared JSON theme, or create your own without writing CSS.</p></div><span className="theme-schema-badge">Theme Schema 1</span></div>
      <div className="setting-row theme-picker-row"><div><b>Active color theme</b><p>{active?.description || 'Choose the palette used throughout the app.'}</p></div><select value={active?.id || 'default'} aria-label="Color theme" onChange={event => switchTheme(event.target.value)}>{themeCatalog.map(item => <option key={item.id} value={item.id}>{item.name}{item.built_in ? '' : ' · Custom'}</option>)}</select></div>
      <div className="theme-action-row"><button type="button" className="btn primary" onClick={() => createFrom(active)}>Customize Current Theme</button><button type="button" className="btn secondary" disabled={busy === 'import'} onClick={() => importTheme(false)}>{busy === 'import' ? 'Importing…' : 'Import Theme JSON'}</button><button type="button" className="btn secondary" onClick={exportTemplate}>Export JSON Template</button><button type="button" className="btn secondary" onClick={openFolder}>Open Themes Folder</button><button type="button" className="btn secondary" onClick={reload}>Reload Themes</button></div>
      {active && <div className="theme-active-summary"><div className="theme-active-swatches">{['appBg','surface','accentPrimary','accentSecondary','textPrimary'].map(key => <span key={key} style={{ background: active.resolved_colors?.[key] }} title={key} />)}</div><div><b>{active.name}</b><small>{active.built_in ? 'Built-in ATTB theme' : `Custom theme${active.based_on ? ` · based on ${themeCatalog.find(item => item.id === active.based_on)?.name || active.based_on}` : ''}`}</small></div><div className="theme-active-actions"><button type="button" className="btn secondary compact" onClick={() => exportTheme(active)}>Export</button>{!active.built_in && <><button type="button" className="btn secondary compact" onClick={() => edit(active)}>Edit</button><button type="button" className="btn danger compact" onClick={() => remove(active)}>Delete</button></>}</div></div>}
      {themeErrors?.length > 0 && <div className="theme-load-errors"><b>{themeErrors.length} theme file{themeErrors.length === 1 ? '' : 's'} could not be loaded.</b>{themeErrors.map(item => <small key={`${item.file}-${item.error}`}><code>{item.file}</code>: {item.error}</small>)}</div>}
    </section>
    {custom.length > 0 && <section className="panel theme-library-panel"><div className="section-head"><div><span className="eyebrow">Custom library</span><h2>Your themes</h2><p>Custom themes live as ordinary JSON files and can be edited visually or by hand.</p></div><span className="schema-badges"><span>{custom.length} custom</span></span></div><div className="theme-library-grid">{custom.map(item => <article key={item.id} className="theme-library-card"><div className="theme-active-swatches">{['appBg','surface','accentPrimary','accentSecondary'].map(key => <span key={key} style={{ background: item.resolved_colors?.[key] }} />)}</div><h3>{item.name}</h3><p>{item.description || 'Custom ATTB color theme.'}</p><small>{item.based_on ? `Based on ${themeCatalog.find(base => base.id === item.based_on)?.name || item.based_on}` : 'Standalone theme'}</small><div className="button-row"><button type="button" className="btn secondary compact" onClick={() => edit(item)}>Edit</button><button type="button" className="btn ghost compact" onClick={() => switchTheme(item.id)}>Use</button><button type="button" className="btn ghost compact" onClick={() => exportTheme(item)}>Export</button></div></article>)}</div></section>}
    {editor && <ThemeEditorModal initial={editor} themes={themeCatalog} setThemePreview={setThemePreview} onCancel={() => { setThemePreview(null); setEditor(null) }} onSave={save} />}
  </>
}
