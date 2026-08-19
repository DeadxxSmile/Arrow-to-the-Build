import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { themeSchema } from '../utils/themeEngine.mjs'

export default function ThemeGuidePage() {
  const navigate = useNavigate()
  const { themeCatalog, themesDirectory } = useApp()
  const simpleCount = themeSchema.tokens.filter(token => token.simple).length
  const exportTemplate = async () => { await window.api.themes.exportTemplate() }
  const openFolder = async () => { await window.api.themes.openFolder() }
  return <div className="page help-topic-page theme-guide-page">
    <div className="page-title"><NavLink to="/help" className="reference-back">‹ Help &amp; Tools</NavLink><span className="eyebrow">ATTB CUSTOMIZATION</span><h1>Themes &amp; Theme Schema</h1><p>Create a theme visually inside ATTB or edit the same portable JSON format by hand. Both routes use the exact same Theme Schema 1 engine.</p></div>
    <section className="panel help-callout"><div><span className="eyebrow">NO CSS REQUIRED</span><h2>Use the visual Theme Editor</h2><p>Duplicate any built-in or custom theme, pick colors graphically, type exact HEX or RGB values, preview the whole application live, and save the result as an ordinary JSON theme.</p></div><button type="button" className="btn primary" onClick={() => navigate('/settings?tab=general')}>Open Theme Settings</button></section>
    <div className="help-reference-grid theme-help-grid">
      <section className="panel"><span className="eyebrow">SIMPLE EDITOR</span><h2>{simpleCount} major colors</h2><p>Start with the colors that most strongly define the application: backgrounds, text, accents, navigation, controls, states, and primary actions.</p></section>
      <section className="panel"><span className="eyebrow">ADVANCED COLORS</span><h2>{themeSchema.tokens.length} semantic tokens</h2><p>Advanced mode exposes the complete color contract while keeping implementation details and arbitrary CSS out of theme files.</p></section>
      <section className="panel"><span className="eyebrow">PORTABLE JSON</span><h2>Theme Schema {themeSchema.theme_schema_version}</h2><p>Export a theme, share it, edit it in a text editor, or import someone else's. Missing values can inherit from a base theme.</p></section>
      <section className="panel"><span className="eyebrow">SAFE BY DESIGN</span><h2>Colors, not code</h2><p>Theme files cannot execute JavaScript, inject CSS, or reference arbitrary local files. Invalid themes are skipped instead of crashing ATTB.</p></section>
    </div>
    <section className="panel"><div className="section-head"><div><span className="eyebrow">THEME FILES</span><h2>Create or edit JSON manually</h2><p>Custom theme files live in ATTB's local themes folder. The exported template contains every supported Theme Schema 1 color token.</p></div></div><div className="data-path"><small>Local themes folder</small><code>{themesDirectory || 'ArrowToTheBuild\\themes'}</code></div><div className="button-row"><button type="button" className="btn secondary" onClick={openFolder}>Open Themes Folder</button><button type="button" className="btn secondary" onClick={exportTemplate}>Export JSON Template</button></div></section>
    <section className="panel"><div className="section-head"><div><span className="eyebrow">BUILT-IN FOUNDATIONS</span><h2>Start from a known palette</h2><p>Built-in themes use the same resolved semantic color contract as custom themes and can be used as inheritance bases.</p></div></div><div className="theme-help-builtins">{themeCatalog.filter(theme => theme.built_in).map(theme => <article key={theme.id}><div className="theme-active-swatches">{['appBg','surface','accentPrimary','accentSecondary'].map(key => <span key={key} style={{ background: theme.resolved_colors?.[key] }} />)}</div><b>{theme.name}</b><small>{theme.description}</small></article>)}</div></section>
  </div>
}
