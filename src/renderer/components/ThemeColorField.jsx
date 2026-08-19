import { useEffect, useMemo, useState } from 'react'
import { hexFromRgba, normalizeThemeColor, opaqueHex, rgbaFromThemeColor } from '../utils/themeEngine.mjs'

export default function ThemeColorField({ token, value, inheritedValue, inherited, onChange, onReset, resetLabel = 'Reset to the base theme' }) {
  const resolved = normalizeThemeColor(value || inheritedValue) || '#000000'
  const rgba = useMemo(() => rgbaFromThemeColor(resolved) || { r: 0, g: 0, b: 0, a: 1 }, [resolved])
  const [text, setText] = useState(value || resolved)
  useEffect(() => { setText(value || resolved) }, [value, resolved])

  const commitText = () => {
    const normalized = normalizeThemeColor(text)
    if (normalized) onChange(normalized)
    else setText(value || resolved)
  }
  const changeRgb = (channel, raw) => {
    const next = { ...rgba, [channel]: channel === 'a' ? Math.max(0, Math.min(1, Number(raw) / 100)) : Math.max(0, Math.min(255, Number(raw) || 0)) }
    onChange(hexFromRgba(next, token.alpha))
  }

  return <div className={`theme-color-field ${inherited ? 'inherited' : ''}`}>
    <div className="theme-color-copy"><b>{token.label}</b><small>{token.description}</small></div>
    <div className="theme-color-controls">
      <label className="theme-swatch" title={`Choose ${token.label}`}>
        <input type="color" value={opaqueHex(resolved)} onChange={event => {
          const rgb = rgbaFromThemeColor(event.target.value)
          onChange(hexFromRgba({ ...rgb, a: token.alpha ? rgba.a : 1 }, token.alpha))
        }} />
        <span style={{ background: resolved }} />
      </label>
      <label className="theme-hex-input"><span>HEX</span><input value={text} onChange={event => setText(event.target.value)} onBlur={commitText} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setText(value || resolved); event.currentTarget.blur() } }} /></label>
      <div className="theme-rgb-inputs" aria-label={`${token.label} RGB values`}>
        {['r', 'g', 'b'].map(channel => <label key={channel}><span>{channel.toUpperCase()}</span><input type="number" min="0" max="255" value={rgba[channel]} onChange={event => changeRgb(channel, event.target.value)} /></label>)}
        {token.alpha && <label><span>A%</span><input type="number" min="0" max="100" value={Math.round(rgba.a * 100)} onChange={event => changeRgb('a', event.target.value)} /></label>}
      </div>
      <button type="button" className="theme-reset-color" disabled={inherited} onClick={onReset} title={inherited ? 'This value is inherited from the base theme' : resetLabel}>↶</button>
    </div>
    <div className="theme-color-origin">{inherited ? `Inherited · ${inheritedValue}` : 'Custom override'}</div>
  </div>
}
