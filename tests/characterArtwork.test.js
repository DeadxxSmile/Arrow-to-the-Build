'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { stub, state } = require('./electron-stub')
const { characterImageRef, characterIdFromRef, imageDimensionsFromBuffer, assertCharacterImageDimensions } = require('../src/main/ipc/imageHandlers')
const characterHandlers = require('../src/main/ipc/characterHandlers')
const dbModule = require('../src/main/database/db')
const themeService = require('../src/main/themeService')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('character screenshot references are opaque app-owned identifiers, not filesystem paths', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000'
  const ref = characterImageRef(id)
  assert.equal(ref, `character-image:${id}`)
  assert.equal(characterIdFromRef(ref), id)
  assert.equal(characterIdFromRef('character-image:../../Windows/System32'), null)
  assert.equal(characterIdFromRef('file:///C:/secret.png'), null)
})

test('character backup JSON intentionally excludes the local screenshot reference', () => {
  const backup = characterHandlers.cleanCharacterForBackup({
    name: 'Portrait Test', portrait_ref: 'character-image:123e4567-e89b-12d3-a456-426614174000',
    attributes: {}, skill_ranks: {}, completed: [], temporary_unlock_states: {}, gear: {}, tracked_skill_lines: [],
    skill_allocations: {}, companion_progress: {}, manual_action_bars: {}, notes: ''
  })
  assert.equal(Object.prototype.hasOwnProperty.call(backup, 'portrait_ref'), false)
})

test('screenshot import is main-process owned, signature checked, re-encoded, and stored outside JSON', () => {
  const handler = read('src/main/ipc/imageHandlers.js')
  const preload = read('src/main/preload.js')
  const migration = read('src/main/database/migrations/012_character_portrait.sql')
  assert.match(handler, /showOpenDialog/)
  assert.match(handler, /imageDimensionsFromBuffer\(sourceBuffer, detected\)/)
  assert.match(handler, /assertCharacterImageDimensions\(declaredSize\)/)
  assert.match(handler, /nativeImage\.createFromPath/)
  assert.match(handler, /\.toPNG\(\)/)
  assert.match(handler, /CharacterImages/)
  assert.match(handler, /crypto\.createHash\('sha256'\)/)
  assert.match(handler, /MAX_CHARACTER_IMAGE_BYTES/)
  assert.match(handler, /MAX_CHARACTER_IMAGE_PIXELS/)
  assert.match(handler, /UPDATE characters SET portrait_ref=/)
  assert.match(preload, /chooseCharacterImage/)
  assert.match(preload, /removeCharacterImage/)
  assert.match(migration, /portrait_ref/)
})


test('screenshot headers are dimension-checked before native image decoding', () => {
  const png = Buffer.alloc(24)
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png, 0)
  Buffer.from('IHDR').copy(png, 12)
  png.writeUInt32BE(1920, 16)
  png.writeUInt32BE(1080, 20)
  assert.deepEqual(imageDimensionsFromBuffer(png, 'image/png'), { width: 1920, height: 1080 })
  assert.deepEqual(assertCharacterImageDimensions({ width: 1920, height: 1080 }), { width: 1920, height: 1080 })
  assert.throws(() => assertCharacterImageDimensions({ width: 13000, height: 100 }), /unsupported image dimensions/)
  assert.throws(() => assertCharacterImageDimensions({ width: 10000, height: 6000 }), /unsupported image dimensions/)
})

test('Basic Info prefers the custom screenshot and Character Settings exposes choose/revert controls', () => {
  const setup = read('src/renderer/pages/SetupPage.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const css = read('src/renderer/styles/Character.css')
  assert.match(setup, /character\.portrait_ref \|\| build\.images\?\.hero/)
  assert.match(setup, /user-screenshot/)
  assert.match(settings, /Basic Info screenshot/)
  assert.match(settings, /Choose Screenshot/)
  assert.match(settings, /Use Build Artwork/)
  assert.match(settings, /not embedded in character-backup JSON/)
  assert.match(css, /character-artwork-settings-grid/)
  assert.match(css, /character-hero-image\.user-screenshot/)
})


test('character backups and theme definitions reject reserved prototype keys before processing', () => {
  const badBackup = JSON.parse('{"file_type":"attb-character-backup","build":{},"character":{"__proto__":{"polluted":true}}}')
  assert.throws(() => characterHandlers.importBackupData(badBackup), /reserved object key/)
  const badTheme = JSON.parse('{"theme_schema_version":1,"id":"safe-theme","name":"Safe","colors":{},"__proto__":{"polluted":true}}')
  assert.throws(() => themeService.cleanDefinition(badTheme), /reserved object key/)
  assert.equal(({}).polluted, undefined)
})


test('character screenshot import copies a decoded PNG into app data and can revert to build art', async () => {
  const os = require('node:os')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-portrait-'))
  const source = path.join(dir, 'source.png')
  const png = Buffer.alloc(24)
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png, 0)
  Buffer.from('IHDR').copy(png, 12)
  png.writeUInt32BE(1920, 16)
  png.writeUInt32BE(1080, 20)
  fs.writeFileSync(source, png)
  const id = '123e4567-e89b-12d3-a456-426614174000'
  const updates = []
  const originalGetDb = dbModule.getDb
  const originalCreate = stub.nativeImage.createFromPath
  state.userDataDir = dir
  state.openPaths = [source]
  dbModule.getDb = () => ({ prepare: sql => ({
    get: () => sql.startsWith('SELECT 1') ? { ok: 1 } : null,
    run: (...args) => { updates.push({ sql, args }); return { changes: 1 } }
  }) })
  const decoded = {
    isEmpty: () => false,
    getSize: () => ({ width: 1920, height: 1080 }),
    resize: () => ({ toPNG: () => png }),
    toPNG: () => png
  }
  stub.nativeImage.createFromPath = () => decoded
  try {
    const ref = await require('../src/main/ipc/imageHandlers').chooseCharacterImage(id)
    assert.equal(ref, `character-image:${id}`)
    assert.ok(updates.some(row => row.args[0] === ref && row.args[1] === id))
    const resolved = require('../src/main/ipc/imageHandlers').resolveCharacterImage(ref)
    assert.match(resolved, /^data:image\/png;base64,/)
    assert.ok(fs.existsSync(path.join(dir, 'CharacterImages')))
    require('../src/main/ipc/imageHandlers').removeCharacterImage(id)
    assert.ok(updates.some(row => row.args[0] === id && /portrait_ref=''/.test(row.sql)))
    assert.equal(require('../src/main/ipc/imageHandlers').resolveCharacterImage(ref), null)
  } finally {
    dbModule.getDb = originalGetDb
    stub.nativeImage.createFromPath = originalCreate
    state.openPaths = []
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
