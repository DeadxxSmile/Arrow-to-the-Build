'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { state } = require('./electron-stub')
const service = require('../src/main/themeService')

function tempThemes() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-theme-test-'))
  state.userDataDir = dir
  return dir
}

test('Theme Schema 1 loads all twenty built-in themes through one complete contract', () => {
  tempThemes()
  const registry = service.loadRegistry()
  assert.equal(registry.errors.length, 0)
  assert.equal(registry.themes.filter(theme => theme.built_in).length, 20)
  assert.equal(registry.schema.theme_schema_version, 1)
  for (const theme of registry.themes) {
    assert.deepEqual(Object.keys(theme.resolved_colors).sort(), [...service.tokenKeys].sort())
    assert.ok(['light', 'dark'].includes(theme.color_scheme))
  }
})

test('theme colors accept web HEX/RGB values and normalize to canonical HEX', () => {
  assert.equal(service.normalizeHex('#abc'), '#AABBCC')
  assert.equal(service.normalizeHex('rgb(10, 20, 30)'), '#0A141E')
  assert.equal(service.normalizeHex('rgba(0, 0, 0, .5)'), '#00000080')
  assert.equal(service.normalizeHex('definitely green-ish'), null)
})

test('custom themes inherit built-in values, persist as JSON, and resolve overrides', () => {
  const dir = tempThemes()
  const result = service.writeTheme({
    theme_schema_version: 1,
    id: 'forest-test',
    name: 'Forest Test',
    author: 'Tester',
    description: 'Inheritance test',
    based_on: 'woodland',
    colors: { appBg: '#112233', accentPrimary: 'rgb(20, 100, 70)' }
  })
  assert.equal(result.theme.resolved_colors.appBg, '#112233')
  assert.equal(result.theme.resolved_colors.accentPrimary, '#146446')
  assert.equal(result.theme.resolved_colors.surface, result.registry.themes.find(theme => theme.id === 'woodland').resolved_colors.surface)
  assert.ok(fs.existsSync(path.join(dir, 'themes', 'forest-test.json')))
})

test('custom theme deletion protects inheritance dependencies', () => {
  tempThemes()
  service.writeTheme({ theme_schema_version: 1, id: 'base-test', name: 'Base Test', based_on: 'default', colors: {} })
  service.writeTheme({ theme_schema_version: 1, id: 'child-test', name: 'Child Test', based_on: 'base-test', colors: { accentPrimary: '#123456' } })
  assert.throws(() => service.deleteTheme('base-test'), /used as a base/i)
  service.deleteTheme('child-test')
  const next = service.deleteTheme('base-test')
  assert.equal(next.themes.some(theme => theme.id === 'base-test'), false)
})

test('invalid and unknown theme fields are reported without becoming executable styling', () => {
  const checked = service.cleanDefinition({
    theme_schema_version: 1,
    id: 'safe-test',
    name: 'Safe Test',
    based_on: 'default',
    arbitrary_css: 'body { display: none }',
    colors: { accentPrimary: '#ABCDEF', madeUpCssToken: 'url(file:///secret)' }
  })
  assert.equal(checked.errors.length, 0)
  assert.ok(checked.warnings.some(item => item.includes('arbitrary_css')))
  assert.ok(checked.warnings.some(item => item.includes('madeUpCssToken')))
  assert.deepEqual(checked.theme.colors, { accentPrimary: '#ABCDEF' })
})

test('standalone themes require the full schema contract and can load without a base', () => {
  tempThemes()
  const builtins = require('../resources/themes/builtin-themes.json')
  const full = builtins.themes.find(theme => theme.id === 'default').colors
  assert.throws(() => service.writeTheme({ theme_schema_version: 1, id: 'partial-standalone', name: 'Partial Standalone', colors: { appBg: '#101010' } }), /complete color contract/i)
  const result = service.writeTheme({ theme_schema_version: 1, id: 'full-standalone', name: 'Full Standalone', based_on: null, colors: full })
  assert.equal(result.theme.based_on, null)
  assert.deepEqual(Object.keys(result.theme.resolved_colors).sort(), [...service.tokenKeys].sort())
})

test('inheritance cycles and missing bases are isolated as theme-file errors', () => {
  const dir = tempThemes()
  const themes = path.join(dir, 'themes')
  fs.mkdirSync(themes, { recursive: true })
  fs.writeFileSync(path.join(themes, 'one.json'), JSON.stringify({ theme_schema_version: 1, id: 'cycle-one', name: 'Cycle One', based_on: 'cycle-two', colors: {} }))
  fs.writeFileSync(path.join(themes, 'two.json'), JSON.stringify({ theme_schema_version: 1, id: 'cycle-two', name: 'Cycle Two', based_on: 'cycle-one', colors: {} }))
  fs.writeFileSync(path.join(themes, 'missing.json'), JSON.stringify({ theme_schema_version: 1, id: 'missing-base', name: 'Missing Base', based_on: 'does-not-exist', colors: {} }))
  const registry = service.loadRegistry()
  assert.equal(registry.themes.some(theme => theme.id === 'cycle-one' || theme.id === 'cycle-two' || theme.id === 'missing-base'), false)
  assert.ok(registry.errors.some(item => /cycle/i.test(item.error)))
  assert.ok(registry.errors.some(item => /was not found/i.test(item.error)))
  assert.equal(registry.themes.filter(theme => theme.built_in).length, 20)
})
