'use strict'

const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const { assertSafeJsonStructure } = require('../shared/jsonSafety.cjs')

const SCHEMA_VERSION = 1
const MAX_THEME_BYTES = 256 * 1024
const ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/
const root = path.join(__dirname, '../..')
const schema = require('../../resources/data/theme-schema.json')
const builtinBundle = require('../../resources/themes/builtin-themes.json')
const tokenKeys = schema.tokens.map(token => token.key)
const tokenSet = new Set(tokenKeys)
const builtinIds = new Set(builtinBundle.themes.map(theme => theme.id))

function themesDirectory() {
  return path.join(app.getPath('userData'), 'themes')
}

function ensureThemesDirectory() {
  const directory = themesDirectory()
  fs.mkdirSync(directory, { recursive: true })
  return directory
}

function templatePath() {
  return path.join(root, 'resources/themes/ATTB_THEME_TEMPLATE.json')
}

function parseChannel(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(255, Math.round(number)))
}

function normalizeHex(input) {
  const value = String(input || '').trim()
  let match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (match) {
    let hex = match[1]
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(char => char + char).join('')
    return `#${hex.toUpperCase()}`
  }
  match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/i)
  if (!match) return null
  const channels = match.slice(1, 4).map(parseChannel)
  if (channels.some(channel => channel === null)) return null
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null
  const hex = channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `#${hex}${alpha < 0.999 ? Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() : ''}`
}

function rgbaFromHex(value) {
  const hex = normalizeHex(value)
  if (!hex) return null
  const body = hex.slice(1)
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
    a: body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1
  }
}

function luminance(value) {
  const rgba = rgbaFromHex(value)
  if (!rgba) return 0
  const channel = number => {
    const n = number / 255
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgba.r) + 0.7152 * channel(rgba.g) + 0.0722 * channel(rgba.b)
}

function contrastRatio(foreground, background) {
  const one = luminance(foreground)
  const two = luminance(background)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

function colorScheme(colors) {
  return luminance(colors?.appBg || '#000000') > 0.42 ? 'light' : 'dark'
}

function clone(value) { return JSON.parse(JSON.stringify(value)) }

function cleanDefinition(input, options = {}) {
  assertSafeJsonStructure(input, { label: 'Theme definition', maxDepth: 24, maxNodes: 6000, maxProperties: 4000, maxArrayLength: 1000 })
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Theme file must contain one JSON object.')
  const errors = []
  const warnings = []
  const theme = {
    theme_schema_version: Number(input.theme_schema_version),
    id: String(input.id || '').trim().toLowerCase(),
    name: String(input.name || '').trim(),
    author: String(input.author || '').trim(),
    description: String(input.description || '').trim(),
    based_on: input.based_on ? String(input.based_on).trim().toLowerCase() : null,
    colors: {}
  }
  if (theme.theme_schema_version !== SCHEMA_VERSION) errors.push(`Theme Schema ${input.theme_schema_version ?? 'is missing'} is not supported. ATTB currently supports Theme Schema ${SCHEMA_VERSION}.`)
  if (!ID_RE.test(theme.id)) errors.push('Theme ID must be 2-64 lowercase letters, numbers, dashes, or underscores and must start with a letter or number.')
  if (!theme.name || theme.name.length > schema.max_name_length) errors.push(`Theme name is required and must be ${schema.max_name_length} characters or fewer.`)
  if (theme.author.length > schema.max_author_length) errors.push(`Theme author must be ${schema.max_author_length} characters or fewer.`)
  if (theme.description.length > schema.max_description_length) errors.push(`Theme description must be ${schema.max_description_length} characters or fewer.`)
  if (theme.based_on && theme.based_on === theme.id) errors.push('A theme cannot inherit from itself.')
  if (!input.colors || typeof input.colors !== 'object' || Array.isArray(input.colors)) errors.push('Theme colors must be a JSON object.')
  else {
    for (const [key, raw] of Object.entries(input.colors)) {
      if (!tokenSet.has(key)) { warnings.push(`Unknown color token "${key}" is preserved but not applied by Theme Schema ${SCHEMA_VERSION}.`); continue }
      const normalized = normalizeHex(raw)
      if (!normalized) errors.push(`${key} must be a HEX, RGB, or RGBA web color value.`)
      else theme.colors[key] = normalized
    }
  }
  const knownTop = new Set(['theme_schema_version', 'id', 'name', 'author', 'description', 'based_on', 'colors'])
  for (const key of Object.keys(input)) if (!knownTop.has(key)) warnings.push(`Unknown top-level field "${key}" is preserved but ignored.`)
  if (!theme.based_on && !options.builtin) {
    const missing = tokenKeys.filter(key => !theme.colors[key])
    if (missing.length) errors.push(`Standalone themes must define the complete color contract. Missing: ${missing.join(', ')}.`)
  }
  return { theme, errors, warnings }
}

function readJsonFile(file) {
  const stat = fs.statSync(file)
  if (!stat.isFile()) throw new Error('Theme path is not a file.')
  if (stat.size > MAX_THEME_BYTES) throw new Error('Theme file is larger than 256 KB.')
  let parsed
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (error) { throw new Error(`Theme file is not valid JSON. ${error.message}`) }
  assertSafeJsonStructure(parsed, { label: 'Theme file', maxDepth: 24, maxNodes: 6000, maxProperties: 4000, maxArrayLength: 1000 })
  return parsed
}

function rawCustomFiles() {
  const directory = ensureThemesDirectory()
  const result = []
  for (const name of fs.readdirSync(directory).filter(name => name.toLowerCase().endsWith('.json')).sort()) {
    const file = path.join(directory, name)
    try { result.push({ file, name, raw: readJsonFile(file) }) }
    catch (error) { result.push({ file, name, error: error.message }) }
  }
  return result
}

function customFileForId(id) {
  const key = String(id || '').toLowerCase()
  return rawCustomFiles().find(item => !item.error && String(item.raw?.id || '').trim().toLowerCase() === key) || null
}

function loadRegistry() {
  const entries = new Map()
  const fileErrors = []
  for (const raw of builtinBundle.themes) {
    const checked = cleanDefinition(raw, { builtin: true })
    if (checked.errors.length) throw new Error(`Bundled theme ${raw.id || raw.name} is invalid: ${checked.errors.join(' ')}`)
    entries.set(checked.theme.id, { definition: checked.theme, raw: clone(raw), source: 'builtin', file: null, warnings: checked.warnings })
  }
  for (const item of rawCustomFiles()) {
    if (item.error) { fileErrors.push({ file: item.name, error: item.error }); continue }
    const checked = cleanDefinition(item.raw)
    if (checked.errors.length) { fileErrors.push({ file: item.name, error: checked.errors.join(' '), warnings: checked.warnings }); continue }
    if (builtinIds.has(checked.theme.id)) { fileErrors.push({ file: item.name, error: `Theme ID "${checked.theme.id}" is reserved by a built-in theme.` }); continue }
    if (entries.has(checked.theme.id)) { fileErrors.push({ file: item.name, error: `Theme ID "${checked.theme.id}" is duplicated by another custom theme.` }); continue }
    entries.set(checked.theme.id, { definition: checked.theme, raw: clone(item.raw), source: 'custom', file: item.file, warnings: checked.warnings })
  }

  const resolving = new Set()
  const cache = new Map()
  function resolve(id) {
    if (cache.has(id)) return cache.get(id)
    const entry = entries.get(id)
    if (!entry) throw new Error(`Base theme "${id}" was not found.`)
    if (resolving.has(id)) throw new Error(`Theme inheritance cycle detected at "${id}".`)
    resolving.add(id)
    let colors = {}
    let presentation = id
    if (entry.definition.based_on) {
      const base = resolve(entry.definition.based_on)
      colors = { ...base.resolved_colors }
      presentation = base.presentation_base
    }
    colors = { ...colors, ...entry.definition.colors }
    const missing = tokenKeys.filter(key => !colors[key])
    if (missing.length) throw new Error(`Theme "${id}" cannot resolve the complete color contract. Missing: ${missing.join(', ')}.`)
    const contrast_warnings = schema.contrast_checks.map(check => {
      const ratio = contrastRatio(colors[check.foreground], colors[check.background])
      return ratio + 1e-6 < check.minimum ? `${check.label} has ${ratio.toFixed(2)}:1 contrast; ${check.minimum.toFixed(1)}:1 is recommended.` : null
    }).filter(Boolean)
    const resolved = {
      id,
      name: entry.definition.name,
      author: entry.definition.author,
      description: entry.definition.description,
      based_on: entry.definition.based_on,
      colors: clone(entry.definition.colors),
      resolved_colors: colors,
      source: entry.source,
      built_in: entry.source === 'builtin',
      presentation_base: entry.source === 'builtin' ? id : presentation,
      color_scheme: colorScheme(colors),
      warnings: [...entry.warnings, ...contrast_warnings],
      file_name: entry.file ? path.basename(entry.file) : null
    }
    resolving.delete(id)
    cache.set(id, resolved)
    return resolved
  }

  const themes = []
  for (const [id, entry] of entries) {
    try { themes.push(resolve(id)) }
    catch (error) {
      if (entry.source === 'builtin') throw error
      fileErrors.push({ file: entry.file ? path.basename(entry.file) : `${id}.json`, error: error.message })
    }
  }
  themes.sort((a, b) => Number(a.built_in !== b.built_in) || a.name.localeCompare(b.name))
  return { themes, errors: fileErrors, directory: themesDirectory(), schema: clone(schema) }
}

function getRawDefinition(id) {
  const registry = loadRegistry()
  const theme = registry.themes.find(item => item.id === String(id || ''))
  if (!theme) throw new Error('Theme not found.')
  if (theme.built_in) return clone(builtinBundle.themes.find(item => item.id === theme.id))
  const file = customFileForId(theme.id)
  if (!file) throw new Error('Custom theme file could not be found.')
  return clone(file.raw)
}

function slugify(value) {
  const slug = String(value || 'custom-theme').toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return (slug || 'custom-theme').slice(0, 64)
}

function uniqueId(seed) {
  const registry = loadRegistry()
  const ids = new Set(registry.themes.map(theme => theme.id))
  const base = ID_RE.test(seed) ? seed : slugify(seed)
  let id = base.length >= 2 ? base : `theme-${base}`
  let counter = 2
  while (ids.has(id)) id = `${base.slice(0, 58)}-${counter++}`
  return id
}

function writeTheme(definition, originalId = null) {
  assertSafeJsonStructure(definition || {}, { label: 'Theme definition', maxDepth: 24, maxNodes: 6000, maxProperties: 4000, maxArrayLength: 1000 })
  const raw = clone(definition || {})
  if (!raw.id) raw.id = uniqueId(raw.name)
  raw.id = String(raw.id).trim().toLowerCase()
  if (builtinIds.has(raw.id)) throw new Error('Built-in themes are protected. Duplicate the theme first.')
  const checked = cleanDefinition(raw)
  if (checked.errors.length) throw new Error(checked.errors.join('\n'))
  const registry = loadRegistry()
  if (checked.theme.based_on && !registry.themes.some(theme => theme.id === checked.theme.based_on)) throw new Error(`Base theme "${checked.theme.based_on}" was not found.`)
  const original = originalId ? String(originalId).toLowerCase() : null
  if (original && builtinIds.has(original)) throw new Error('Built-in themes cannot be overwritten.')
  if (!original && registry.themes.some(theme => theme.id === checked.theme.id)) throw new Error(`Theme ID "${checked.theme.id}" already exists.`)
  if (original && original !== checked.theme.id && registry.themes.some(theme => theme.id === checked.theme.id)) throw new Error(`Theme ID "${checked.theme.id}" already exists.`)

  let output = raw
  if (original) {
    try {
      const existing = getRawDefinition(original)
      output = { ...existing, ...raw, colors: { ...(existing.colors || {}), ...(raw.colors || {}) } }
      // Color keys deleted in the editor represent inheritance, so only preserve unknown keys.
      for (const key of tokenKeys) if (!Object.prototype.hasOwnProperty.call(raw.colors || {}, key)) delete output.colors[key]
    } catch { output = raw }
  }
  output.theme_schema_version = SCHEMA_VERSION
  output.id = checked.theme.id
  output.name = checked.theme.name
  output.author = checked.theme.author
  output.description = checked.theme.description
  output.based_on = checked.theme.based_on
  output.colors = output.colors || {}
  for (const [key, value] of Object.entries(checked.theme.colors)) output.colors[key] = value

  const directory = ensureThemesDirectory()
  const existingFile = original ? customFileForId(original)?.file : null
  const target = path.join(directory, `${checked.theme.id}.json`)
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  if (existingFile && path.resolve(existingFile) !== path.resolve(target) && fs.existsSync(existingFile)) fs.unlinkSync(existingFile)
  const next = loadRegistry()
  const saved = next.themes.find(theme => theme.id === checked.theme.id)
  if (!saved) throw new Error(next.errors.find(item => item.file === path.basename(target))?.error || 'Theme could not be loaded after saving.')
  return { theme: saved, registry: next }
}

function deleteTheme(id) {
  const key = String(id || '').toLowerCase()
  if (builtinIds.has(key)) throw new Error('Built-in themes cannot be deleted.')
  const registry = loadRegistry()
  const theme = registry.themes.find(item => item.id === key)
  if (!theme) throw new Error('Custom theme not found.')
  const dependents = registry.themes.filter(item => item.based_on === key)
  if (dependents.length) throw new Error(`This theme is used as a base by: ${dependents.map(item => item.name).join(', ')}. Change or delete those themes first.`)
  const file = customFileForId(key)?.file
  if (file && fs.existsSync(file)) fs.unlinkSync(file)
  return loadRegistry()
}

module.exports = {
  SCHEMA_VERSION, schema, tokenKeys, themesDirectory, ensureThemesDirectory, templatePath,
  normalizeHex, rgbaFromHex, contrastRatio, colorScheme, cleanDefinition, loadRegistry,
  getRawDefinition, uniqueId, writeTheme, deleteTheme, readJsonFile, builtinIds
}
