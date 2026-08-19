import { useEffect, useMemo, useState } from 'react'
import ThemeColorField from './ThemeColorField'
import ThemePreview from './ThemePreview'
import {
  THEME_SCHEMA_VERSION, THEME_TOKENS, themeSchema, resolveThemeDraft,
  presentationBaseForDraft, themeColorScheme, themeContrastWarnings, themeIdFromName
} from '../utils/themeEngine.mjs'

export default function ThemeEditorModal({ initial, themes, onCancel, onSave, setThemePreview }) {
  const [draft, setDraft] = useState(() => ({
    theme_schema_version: THEME_SCHEMA_VERSION,
    id: initial.id || themeIdFromName(initial.name),
    name: initial.name || 'My Custom Theme',
    author: initial.author || '',
    description: initial.description || '',
    based_on: Object.prototype.hasOwnProperty.call(initial, 'based_on') ? initial.based_on : 'default',
    colors: { ...(initial.colors || {}) }
  }))
  const [mode, setMode] = useState('simple')
  const [livePreview, setLivePreview] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const originalId = initial.originalId || null
  const resolved = useMemo(() => resolveThemeDraft(draft, themes), [draft, themes])
  const base = useMemo(() => draft.based_on ? themes.find(theme => theme.id === draft.based_on) : null, [themes, draft.based_on])
  const defaultTheme = useMemo(() => themes.find(theme => theme.id === 'default'), [themes])
  const baseChoices = useMemo(() => themes.filter(candidate => {
    if (candidate.id === originalId) return false
    if (!originalId) return true
    const seen = new Set()
    let current = candidate
    while (current && !seen.has(current.id)) {
      if (current.based_on === originalId) return false
      seen.add(current.id)
      current = current.based_on ? themes.find(theme => theme.id === current.based_on) : null
    }
    return true
  }), [themes, originalId])
  const warnings = useMemo(() => themeContrastWarnings(resolved), [resolved])

  useEffect(() => {
    if (!livePreview) { setThemePreview(null); return }
    setThemePreview({
      id: 'theme-preview',
      name: draft.name,
      resolved_colors: resolved,
      presentation_base: presentationBaseForDraft(draft, themes),
      color_scheme: themeColorScheme(resolved)
    })
    return () => setThemePreview(null)
  }, [draft, livePreview, resolved, setThemePreview, themes])

  const update = patch => setDraft(current => ({ ...current, ...patch }))
  const setColor = (key, value) => setDraft(current => ({ ...current, colors: { ...current.colors, [key]: value } }))
  const resetColor = key => setDraft(current => {
    const colors = { ...current.colors }
    if (current.based_on) delete colors[key]
    else colors[key] = defaultTheme?.resolved_colors?.[key] || resolved[key]
    return { ...current, colors }
  })
  const resetGroup = keys => setDraft(current => {
    const colors = { ...current.colors }
    for (const key of keys) {
      if (current.based_on) delete colors[key]
      else colors[key] = defaultTheme?.resolved_colors?.[key] || resolved[key]
    }
    return { ...current, colors }
  })
  const resetAll = () => setDraft(current => ({ ...current, colors: current.based_on ? {} : { ...(defaultTheme?.resolved_colors || resolved) } }))
  const changeBase = nextId => {
    if (!nextId) {
      setDraft(current => ({ ...current, based_on: null, colors: { ...resolved } }))
      return
    }
    setDraft(current => ({ ...current, based_on: nextId }))
  }

  const save = async useTheme => {
    setError('')
    if (!draft.name.trim()) { setError('Give the theme a name before saving.'); return }
    setBusy(true)
    try { await onSave(draft, originalId, useTheme) }
    catch (err) { setError(err.message || 'The theme could not be saved.') }
    finally { setBusy(false) }
  }

  const visibleGroups = themeSchema.groups.map(group => ({
    ...group,
    tokens: group.tokens.map(key => THEME_TOKENS.find(token => token.key === key)).filter(token => token && (mode === 'advanced' || token.simple))
  })).filter(group => group.tokens.length)

  return <div className="modal-backdrop theme-editor-backdrop" role="presentation">
    <section className="theme-editor-modal" role="dialog" aria-modal="true" aria-labelledby="theme-editor-title">
      <header className="theme-editor-header">
        <div><span className="eyebrow">THEME SCHEMA {THEME_SCHEMA_VERSION}</span><h2 id="theme-editor-title">{originalId ? `Edit ${initial.name}` : 'Create Custom Theme'}</h2><p>Change colors visually or enter exact HEX / RGB values. Theme JSON remains the portable source of truth.</p></div>
        <button type="button" className="theme-editor-close" onClick={onCancel} aria-label="Close Theme Editor" title="Close Theme Editor" />
      </header>
      <div className="theme-editor-body">
        <aside className="theme-editor-sidebar">
          <div className="theme-editor-meta">
            <label><span>Theme name</span><input value={draft.name} maxLength="80" onChange={event => update({ name: event.target.value, ...(!originalId ? { id: themeIdFromName(event.target.value) } : {}) })} /></label>
            <label><span>Theme ID</span><input value={draft.id} disabled={!!originalId} onChange={event => update({ id: themeIdFromName(event.target.value) })} /><small>Permanent after the theme is first saved.</small></label>
            <label><span>Based on</span><select value={draft.based_on || ''} onChange={event => changeBase(event.target.value)}><option value="">Standalone · explicit full palette</option>{baseChoices.map(theme => <option key={theme.id} value={theme.id}>{theme.name}{theme.built_in ? ' · built in' : ''}</option>)}</select><small>{draft.based_on ? 'Unchanged colors inherit from this theme.' : 'Standalone themes store every color explicitly.'}</small></label>
            <label><span>Author</span><input value={draft.author} maxLength="80" onChange={event => update({ author: event.target.value })} /></label>
            <label><span>Description</span><textarea value={draft.description} maxLength="240" rows="3" onChange={event => update({ description: event.target.value })} /></label>
          </div>
          <ThemePreview colors={resolved} />
          <label className="theme-live-preview"><span><b>Live application preview</b><small>Temporarily apply changes across ATTB while this editor is open.</small></span><span className="switch"><input type="checkbox" checked={livePreview} onChange={event => setLivePreview(event.target.checked)} /><i /></span></label>
          {warnings.length > 0 && <div className="theme-contrast-warning"><b>{warnings.length} contrast warning{warnings.length === 1 ? '' : 's'}</b>{warnings.map(item => <small key={`${item.foreground}-${item.background}`}>{item.message}</small>)}</div>}
        </aside>
        <main className="theme-editor-colors">
          <div className="theme-editor-toolbar"><div className="theme-mode-tabs" role="tablist"><button type="button" className={mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')}>Simple</button><button type="button" className={mode === 'advanced' ? 'active' : ''} onClick={() => setMode('advanced')}>Advanced Colors</button></div><button type="button" className="btn ghost compact" onClick={resetAll}>Reset All to Base</button></div>
          <p className="theme-mode-help">{mode === 'simple' ? 'The major colors that define the overall look of ATTB.' : `All ${THEME_TOKENS.length} semantic Theme Schema color tokens.`}</p>
          {visibleGroups.map(group => <section key={group.name} className="theme-token-group">
            <div className="theme-token-group-head"><h3>{group.name}</h3><button type="button" className="btn ghost compact" onClick={() => resetGroup(group.tokens.map(token => token.key))}>Reset section</button></div>
            <div className="theme-token-list">{group.tokens.map(token => <ThemeColorField key={token.key} token={token} value={draft.colors[token.key]} inheritedValue={base?.resolved_colors?.[token.key] || defaultTheme?.resolved_colors?.[token.key] || resolved[token.key]} inherited={!!draft.based_on && !Object.prototype.hasOwnProperty.call(draft.colors, token.key)} onChange={value => setColor(token.key, value)} onReset={() => resetColor(token.key)} resetLabel={draft.based_on ? 'Reset to the base theme' : 'Reset to ATTB Default'} />)}</div>
          </section>)}
        </main>
      </div>
      {error && <div className="theme-editor-error">{error}</div>}
      <footer className="theme-editor-footer"><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button><div><button type="button" className="btn secondary" disabled={busy} onClick={() => save(false)}>Save Theme</button><button type="button" className="btn primary" disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Save & Use'}</button></div></footer>
    </section>
  </div>
}
