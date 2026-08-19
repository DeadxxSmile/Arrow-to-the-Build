'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const rendererRoot = path.join(root, 'src', 'renderer')
const entry = path.join(root, 'src', 'index.jsx')
const extensions = ['.js', '.jsx', '.mjs', '.cjs']
const read = file => fs.readFileSync(file, 'utf8')

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (extensions.includes(path.extname(entry.name))) files.push(full)
  }
  return files
}

function resolveLocal(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), specifier)
  if (path.extname(base)) return fs.existsSync(base) ? base : null
  for (const extension of extensions) if (fs.existsSync(`${base}${extension}`)) return `${base}${extension}`
  for (const extension of extensions) {
    const candidate = path.join(base, `index${extension}`)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function importsFor(file) {
  const source = read(file)
  const specs = []
  for (const pattern of [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  ]) {
    pattern.lastIndex = 0
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) specs.push(match[1])
  }
  return specs.map(spec => resolveLocal(file, spec)).filter(Boolean)
}

test('every renderer JavaScript module is reachable from the application entry point', () => {
  const seen = new Set()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop()
    if (seen.has(file)) continue
    seen.add(file)
    queue.push(...importsFor(file))
  }
  const dead = walk(rendererRoot)
    .filter(file => !seen.has(file))
    .map(file => path.relative(root, file))
    .sort()
  assert.deepEqual(dead, [], `unreachable renderer modules:\n${dead.join('\n')}`)
})

test('Build Editor no-draft pages share one actionable empty state', () => {
  const pages = [
    'BuildOverviewPage.jsx', 'BuildCharacterSetupPage.jsx', 'BuildClassConfigurationPage.jsx',
    'BuildSkillsPage.jsx', 'BuildLevelingPage.jsx', 'BuildEquipmentPage.jsx',
    'BuildChampionPointsPage.jsx', 'BuildCompanionsPage.jsx', 'BuildLoadoutsPage.jsx',
    'BuildReviewPage.jsx'
  ]
  for (const page of pages) {
    const source = read(path.join(rendererRoot, 'pages', page))
    assert.match(source, /BuildEditorEmptyState/)
    assert.doesNotMatch(source, /No editable build is currently open\./)
  }
  const shared = read(path.join(rendererRoot, 'components', 'BuildEditorEmptyState.jsx'))
  assert.match(shared, /Open Build Library/)
  assert.match(shared, /Create New Build/)
})

test('temporary notice timers are centralized in useFlashNotice', () => {
  const hook = read(path.join(rendererRoot, 'hooks', 'useFlashNotice.js'))
  assert.match(hook, /window\.setTimeout/)
  for (const page of ['SettingsPage.jsx', 'CharacterDataPage.jsx', 'BuildSetupGuidePage.jsx', 'BuildEditorImportExportPage.jsx']) {
    const source = read(path.join(rendererRoot, 'pages', page))
    assert.match(source, /useFlashNotice/)
    assert.doesNotMatch(source, /flashTimer/)
  }
})

test('Help reference pages keep contextual navigation instead of ending in dead ends', () => {
  const reference = read(path.join(rendererRoot, 'pages', 'BuildReferencePage.jsx'))
  const traits = read(path.join(rendererRoot, 'pages', 'TraitReferencePage.jsx'))
  const resources = read(path.join(rendererRoot, 'pages', 'ResourcesPage.jsx'))
  const guides = read(path.join(rendererRoot, 'pages', 'BuildSetupGuidePage.jsx'))
  assert.match(reference, /RelatedHelpTopics/)
  assert.match(traits, /RelatedHelpTopics/)
  assert.match(resources, /‹ Help &amp; Tools/)
  assert.match(guides, /helpContext/)
  assert.match(guides, /Build Setup Guide/)
  assert.match(guides, /ATTB Guides/)
})
