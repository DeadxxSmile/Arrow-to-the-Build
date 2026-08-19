import { themeSchema } from '../utils/themeEngine.mjs'

export default function ThemePreview({ colors = {} }) {
  const previewStyle = Object.fromEntries(themeSchema.tokens.map(token => [token.css_variable, colors[token.key]]).filter(([, value]) => value))
  return <div className="theme-preview-card" aria-label="Theme preview" style={previewStyle}>
    <div className="theme-preview-titlebar"><b>ATTB</b><span>Theme Preview</span></div>
    <div className="theme-preview-shell">
      <aside><span className="active">Character</span><span>Build</span><span>Help</span></aside>
      <main>
        <span className="eyebrow">LIVE PREVIEW</span>
        <h3>Your theme at a glance</h3>
        <p>Panels, text, navigation, controls, states, and primary actions use the same semantic tokens as the real app.</p>
        <div className="theme-preview-actions"><button type="button" className="btn primary">Primary Action</button><button type="button" className="btn secondary">Secondary</button></div>
        <div className="theme-preview-input">Input / control surface</div>
        <div className="theme-preview-states"><span className="success">Success</span><span className="warning">Warning</span><span className="danger">Error</span><span className="info">Info</span></div>
      </main>
    </div>
  </div>
}
