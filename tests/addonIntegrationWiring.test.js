'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const integrationPath = path.join(root, 'src', 'main', 'addon', 'integration.js')
const constantsPath = path.join(root, 'src', 'main', 'addon', 'addonConstants.js')

function namesFromList(text) {
  return new Set(text.split(',').map(item => item.trim()).filter(Boolean))
}

test('addon integration imports every addonConstants symbol it references', () => {
  const integration = fs.readFileSync(integrationPath, 'utf8')
  const constants = fs.readFileSync(constantsPath, 'utf8')

  const exportedMatch = constants.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/)
  assert.ok(exportedMatch, 'addonConstants.js must expose a module.exports object')
  const exported = namesFromList(exportedMatch[1].replace(/\n/g, ' '))

  const importMatch = integration.match(/const\s*\{([^{}]*?)\}\s*=\s*require\(['"]\.\/addonConstants['"]\)/)
  assert.ok(importMatch, 'integration.js must destructure addonConstants explicitly')
  const imported = namesFromList(importMatch[1].replace(/\n/g, ' '))

  const missing = [...exported].filter(name => {
    const used = new RegExp(`\\b${name}\\b`, 'g').test(integration)
    return used && !imported.has(name)
  })

  assert.deepEqual(missing, [], `integration.js references addon constants without importing them: ${missing.join(', ')}`)
  assert.ok(imported.has('SAVED_VARIABLES_FILE'))
  assert.ok(imported.has('BUNDLED_ADDON_VERSION'))
})

test('v2.1.3 wires a one-time verified bridge reset before the addon watcher starts', () => {
  const integration = fs.readFileSync(integrationPath, 'utf8')
  const profileManager = fs.readFileSync(path.join(root, 'src', 'main', 'addon', 'profileManager.js'), 'utf8')
  const main = fs.readFileSync(path.join(root, 'src', 'main', 'main.js'), 'utf8')

  assert.match(integration, /POST_UPDATE_CLEANUP_KEY/)
  assert.match(integration, /runPostUpdateAddonCleanup/)
  assert.match(main, /addonIntegration\.runPostUpdateAddonCleanup\(\)[\s\S]*addonIntegration\.startWatching\(\)/)
  assert.match(profileManager, /ArrowToTheBuildBridgeSavedVariables/)
  assert.match(profileManager, /fs\.rmSync\(retiredBridgeSavedVariablesPath\(root\)/)
  assert.match(profileManager, /fs\.rmSync\(savedVariablesPath\(root\)/)
  assert.match(profileManager, /fs\.rmSync\(mainFolder, \{ recursive: true, force: true \}\)/)
  assert.match(profileManager, /installAddon\(root, \{ force: true \}\)/)
})
