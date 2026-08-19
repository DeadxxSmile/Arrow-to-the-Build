'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const stylesDir = path.join(root, 'src/renderer/styles')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const componentStyles = fs.readdirSync(stylesDir)
  .filter(name => name.endsWith('.css') && name !== 'themes.css')
  .sort()

function ruleStream(source, context = 'top') {
  const rules = []
  let index = 0
  while (index < source.length) {
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2)
      index = end < 0 ? source.length : end + 2
      continue
    }
    if (/\s/.test(source[index] || '')) { index += 1; continue }
    const brace = source.indexOf('{', index)
    if (brace < 0) break
    const head = source.slice(index, brace).trim()
    let depth = 1
    let cursor = brace + 1
    while (cursor < source.length && depth) {
      if (source.startsWith('/*', cursor)) {
        const end = source.indexOf('*/', cursor + 2)
        cursor = end < 0 ? source.length : end + 2
        continue
      }
      if (source[cursor] === '{') depth += 1
      else if (source[cursor] === '}') depth -= 1
      cursor += 1
    }
    const body = source.slice(brace + 1, cursor - 1)
    if (/^@(media|supports)\b/.test(head)) {
      rules.push(...ruleStream(body, `${context}|${head}`))
    } else if (!head.startsWith('@')) {
      const declarations = new Set()
      for (const declaration of body.split(';')) {
        const colon = declaration.indexOf(':')
        if (colon > 0) declarations.add(declaration.slice(0, colon).trim())
      }
      for (const selector of head.split(',')) {
        rules.push({ context, selector: selector.trim(), declarations })
      }
    }
    index = cursor
  }
  return rules
}

test('renderer stylesheet layers load in the documented architecture order', () => {
  const index = read('src/index.jsx')
  const expected = [
    'themes.css',
    'tokens.css',
    'global.css',
    'App.css',
    'Workspace.css',
    'ThemeEditor.css',
    'Character.css',
    'Help.css',
    'BuildEditor.css',
    'Addon.css'
  ]
  let previous = -1
  for (const name of expected) {
    const position = index.indexOf(`./renderer/styles/${name}`)
    assert.ok(position > previous, `${name} should load after the previous stylesheet layer`)
    previous = position
  }
})

test('themes.css is the only renderer stylesheet containing literal color values', () => {
  const literalColor = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsla?\s*\(/
  const offenders = componentStyles.filter(name => literalColor.test(fs.readFileSync(path.join(stylesDir, name), 'utf8')))
  assert.deepEqual(offenders, [])
})

test('every built-in theme implements the Theme Schema 1 semantic color contract', () => {
  const schema = JSON.parse(read('resources/data/theme-schema.json'))
  const builtins = JSON.parse(read('resources/themes/builtin-themes.json'))
  const contract = schema.tokens.map(token => token.key).sort()
  assert.equal(schema.theme_schema_version, 1)
  assert.equal(builtins.theme_schema_version, 1)
  assert.equal(builtins.themes.length, 20)
  for (const theme of builtins.themes) {
    assert.equal(theme.theme_schema_version, 1, `${theme.id} should use Theme Schema 1`)
    assert.deepEqual(Object.keys(theme.colors).sort(), contract, `${theme.id} must implement the full theme color contract`)
  }
  const fallback = [...read('src/renderer/styles/themes.css').matchAll(/(--color-[\w-]+)\s*:/g)].map(match => match[1]).sort()
  const cssContract = schema.tokens.map(token => token.css_variable).sort()
  assert.deepEqual(fallback, cssContract, 'themes.css fallback must expose the same complete runtime contract')
})

test('legacy palette variable names cannot creep back into renderer styles', () => {
  const legacy = /var\(--(?:bg|surface|surface2|surface3|line|line2|text|muted|faint|accent|accent2|gold|red|orange|green|blue|purple|solid-text|shadow|backdrop|image-shadow)(?=[,)])/
  const offenders = componentStyles.filter(name => legacy.test(fs.readFileSync(path.join(stylesDir, name), 'utf8')))
  assert.deepEqual(offenders, [])
})

test('all CSS custom properties resolve and stable design tokens are actually used', () => {
  const sources = fs.readdirSync(stylesDir).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(stylesDir, name), 'utf8')).join('\n')
  const declared = new Set([...sources.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))
  const used = new Set([...sources.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]))
  assert.deepEqual([...used].filter(name => !declared.has(name) && name !== '--build-accent').sort(), [])

  const tokens = read('src/renderer/styles/tokens.css')
  const stableTokens = [...tokens.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1])
  const outsideTokens = componentStyles.filter(name => name !== 'tokens.css').map(name => fs.readFileSync(path.join(stylesDir, name), 'utf8')).join('\n')
  assert.deepEqual(stableTokens.filter(name => !outsideTokens.includes(`var(${name})`)), [])
})

test('the cascade has no repeated selector/property overrides inside a stylesheet context', () => {
  const conflicts = []
  for (const name of componentStyles.filter(name => name !== 'tokens.css')) {
    const grouped = new Map()
    for (const rule of ruleStream(fs.readFileSync(path.join(stylesDir, name), 'utf8'))) {
      const key = `${rule.context}\u0000${rule.selector}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(rule.declarations)
    }
    for (const [key, entries] of grouped) {
      if (entries.length < 2) continue
      const overlap = new Set()
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          for (const property of entries[i]) if (entries[j].has(property)) overlap.add(property)
        }
      }
      if (overlap.size) conflicts.push(`${name}: ${key.split('\u0000')[1]} -> ${[...overlap].sort().join(', ')}`)
    }
  }
  assert.deepEqual(conflicts, [])
})

test('important declarations are reserved for reduced-motion accessibility only', () => {
  const occurrences = []
  for (const name of componentStyles) {
    const source = fs.readFileSync(path.join(stylesDir, name), 'utf8')
    for (const match of source.matchAll(/!important/g)) occurrences.push(name)
  }
  assert.deepEqual(occurrences, ['App.css', 'App.css'])
  assert.match(read('src/renderer/styles/App.css'), /@media \(prefers-reduced-motion:reduce\)\{\s*\*\{transition:none!important;animation:none!important\}/)
})


test('secondary section-rail navigation keeps explicit link styling', () => {
  const app = read('src/renderer/App.jsx')
  const css = read('src/renderer/styles/App.css')
  assert.match(app, /section-rail-link/, 'App should render the secondary section rail links')
  assert.match(css, /\.section-rail-link\{[^}]*text-decoration:none/, 'section rail links must not fall back to browser anchor styling')
  assert.match(css, /\.section-rail-link\.active\{/, 'section rail links need an explicit active state')
  assert.match(css, /\.cp-rail \.section-rail-link\{/, 'Champion Point rail spacing must remain explicit')
})

test('companion portraits keep their explicit frame, fallback, and responsive layout', () => {
  const css = fs.readFileSync(path.join(root, 'src/renderer/styles/Character.css'), 'utf8')
  assert.match(css, /\.companion-portrait\{[^}]*width:68px[^}]*height:76px[^}]*overflow:hidden/)
  assert.match(css, /\.companion-portrait\.large\{[^}]*width:82px[^}]*height:92px/)
  assert.match(css, /\.companion-portrait-fallback\{[^}]*height:100%[^}]*display:grid/)
  assert.match(css, /@media\(max-width:680px\)\{[\s\S]*?\.v3-companion-selector\{grid-template-columns:1fr\}/)
})
