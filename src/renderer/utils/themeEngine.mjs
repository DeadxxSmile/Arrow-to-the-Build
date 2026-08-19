import themeSchema from '../../../resources/data/theme-schema.json'

export { themeSchema }
export const THEME_SCHEMA_VERSION = themeSchema.theme_schema_version
export const THEME_TOKENS = themeSchema.tokens
export const THEME_TOKEN_KEYS = themeSchema.tokens.map(token => token.key)

export function normalizeThemeColor(input) {
  const value = String(input || '').trim()
  let match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (match) {
    let hex = match[1]
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(char => char + char).join('')
    return `#${hex.toUpperCase()}`
  }
  match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/i)
  if (!match) return null
  const channels = match.slice(1, 4).map(raw => Math.max(0, Math.min(255, Math.round(Number(raw)))))
  if (channels.some(number => !Number.isFinite(number))) return null
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null
  const hex = channels.map(number => number.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `#${hex}${alpha < 0.999 ? Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() : ''}`
}

export function rgbaFromThemeColor(input) {
  const hex = normalizeThemeColor(input)
  if (!hex) return null
  const body = hex.slice(1)
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
    a: body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1
  }
}

export function hexFromRgba({ r = 0, g = 0, b = 0, a = 1 }, includeAlpha = false) {
  const channel = value => Math.max(0, Math.min(255, Math.round(Number(value) || 0))).toString(16).padStart(2, '0').toUpperCase()
  const alpha = Math.max(0, Math.min(1, Number(a) || 0))
  return `#${channel(r)}${channel(g)}${channel(b)}${includeAlpha || alpha < 0.999 ? channel(alpha * 255) : ''}`
}

export function opaqueHex(input) {
  const rgba = rgbaFromThemeColor(input) || { r: 0, g: 0, b: 0 }
  return hexFromRgba({ ...rgba, a: 1 }, false)
}

function luminance(input) {
  const rgba = rgbaFromThemeColor(input)
  if (!rgba) return 0
  const transform = raw => {
    const value = raw / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * transform(rgba.r) + 0.7152 * transform(rgba.g) + 0.0722 * transform(rgba.b)
}

export function contrastRatio(foreground, background) {
  const one = luminance(foreground)
  const two = luminance(background)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

export function themeContrastWarnings(colors = {}) {
  return themeSchema.contrast_checks.map(check => {
    if (!colors[check.foreground] || !colors[check.background]) return null
    const ratio = contrastRatio(colors[check.foreground], colors[check.background])
    if (ratio + 1e-6 >= check.minimum) return null
    return {
      ...check,
      ratio,
      message: `${check.label}: ${ratio.toFixed(2)}:1 contrast; ${Number(check.minimum).toFixed(1)}:1 is recommended.`
    }
  }).filter(Boolean)
}

export function resolveThemeDraft(draft, themes = []) {
  const base = themes.find(theme => theme.id === draft?.based_on) || themes.find(theme => theme.id === 'default')
  return {
    ...(base?.resolved_colors || {}),
    ...(draft?.colors || {})
  }
}

export function presentationBaseForDraft(draft, themes = []) {
  const base = themes.find(theme => theme.id === draft?.based_on)
  return base?.presentation_base || (base?.built_in ? base.id : 'default') || 'default'
}

export function applyThemeToDocument(theme, selectedId = theme?.id || 'default') {
  if (!theme?.resolved_colors) return
  const root = document.documentElement
  for (const token of themeSchema.tokens) {
    const value = theme.resolved_colors[token.key]
    if (value) root.style.setProperty(token.css_variable, value)
  }
  root.dataset.theme = selectedId || theme.id || 'default'
  root.dataset.themeBase = theme.presentation_base || (theme.built_in ? theme.id : 'default')
  root.style.colorScheme = theme.color_scheme || 'dark'
}

export function themeIdFromName(name) {
  const base = String(name || 'custom-theme').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'custom-theme'
  return base.length >= 2 ? base.slice(0, 64) : `theme-${base}`
}

export function themeColorScheme(colors = {}) {
  return luminance(colors.appBg || '#000000') > 0.42 ? 'light' : 'dark'
}
