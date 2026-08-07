'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { state, makeIpc } = require('./electron-stub')

const dbModule = require('../src/main/database/db')
const buildHandlers = require('../src/main/ipc/buildHandlers')
const buildStorage = require('../src/main/buildStorage')

function freshApp() {
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-build-files-'))
  state.userDataDir = dir
  state.openPaths = []
  state.openedDirectory = null
  dbModule.initialize(path.join(dir, 'attb.db'))
  const ipc = makeIpc()
  buildHandlers.seedBundled()
  buildHandlers.register(ipc)
  return { ipc, db: dbModule.getDb(), dir }
}

function saveNewBuild(ipc, name = 'File Sync Test') {
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  ipc.call('builds:saveDraft', draft.id, { ...draft.data, name, short_name: name })
  return ipc.call('builds:saveBuild', draft.id, 'Initial saved file')
}

test.afterEach(() => dbModule.close())

test('recovery-only drafts stay in SQLite until Save Build creates a valid JSON mirror', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  assert.equal(ipc.call('builds:getStorageInfo').eligible_builds, 0)
  assert.equal(fs.existsSync(buildStorage.targetPathForBuild(draft.build_id)), false)

  const result = ipc.call('builds:saveBuild', draft.id, 'First save')
  assert.equal(result.file_sync.ok, true)
  assert.equal(fs.existsSync(result.file_sync.path), true)
  const written = JSON.parse(fs.readFileSync(result.file_sync.path, 'utf8'))
  assert.equal(written.id, draft.build_id)
  assert.equal(ipc.call('builds:getStorageInfo').synced_builds, 1)
})

test('bundled builds are never written into the user build folder', () => {
  const { ipc } = freshApp()
  const result = ipc.call('builds:syncStorageDirectory')
  assert.equal(result.total, 0)
  const directory = ipc.call('builds:getStorageInfo').directory
  const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(file => file.endsWith('.json')) : []
  assert.deepEqual(files, [])
})

test('choosing a custom folder copies every saved build before switching the setting', async () => {
  const { ipc, db, dir } = freshApp()
  const saved = saveNewBuild(ipc, 'Portable Build')
  const custom = path.join(dir, 'Cloud Builds')
  state.openPaths = [custom]
  const result = await ipc.call('builds:chooseStorageDirectory')
  assert.equal(result.changed, true)
  assert.equal(result.copied, 1)
  assert.equal(result.directory, custom)
  assert.equal(db.prepare("SELECT value FROM settings WHERE key='build_editor_storage_directory'").get().value, custom)
  assert.equal(fs.existsSync(path.join(custom, `${saved.draft.build_id}.json`)), true)
})

test('a failed folder choice leaves the current storage setting untouched', async () => {
  const { ipc, db, dir } = freshApp()
  saveNewBuild(ipc)
  const before = ipc.call('builds:getStorageInfo').directory
  const notDirectory = path.join(dir, 'not-a-folder')
  fs.writeFileSync(notDirectory, 'file')
  state.openPaths = [notDirectory]
  await assert.rejects(ipc.call('builds:chooseStorageDirectory'), /could not copy|EEXIST|directory/i)
  assert.equal(ipc.call('builds:getStorageInfo').directory, before)
  assert.equal(db.prepare("SELECT value FROM settings WHERE key='build_editor_storage_directory'").get(), undefined)
})

test('externally modified JSON is preserved while the SQLite revision still saves safely', () => {
  const { ipc } = freshApp()
  const first = saveNewBuild(ipc, 'External Change Test')
  const file = first.file_sync.path
  const externalText = fs.readFileSync(file, 'utf8').replace('External Change Test', 'Edited Outside ATTB')
  fs.writeFileSync(file, externalText, 'utf8')

  const updated = { ...first.draft.data, summary: 'A newer in-app revision.' }
  ipc.call('builds:saveDraft', first.draft.id, updated)
  const second = ipc.call('builds:saveBuild', first.draft.id, 'Second revision')
  assert.equal(second.revision_number, 2)
  assert.equal(second.file_sync.ok, false)
  assert.equal(second.file_sync.external_change, true)
  assert.equal(fs.readFileSync(file, 'utf8'), externalText)
  const info = ipc.call('builds:getStorageInfo')
  assert.equal(info.external_changes, 1)
  assert.equal(info.pending_builds, 1)
})

test('deleting a user build removes an unchanged managed JSON file', () => {
  const { ipc } = freshApp()
  const saved = saveNewBuild(ipc, 'Delete File Test')
  assert.equal(fs.existsSync(saved.file_sync.path), true)
  const result = ipc.call('builds:delete', saved.draft.build_id)
  assert.equal(result.deleted, true)
  assert.equal(result.file_cleanup.removed, true)
  assert.equal(fs.existsSync(saved.file_sync.path), false)
})

test('Open Folder uses the configured user build directory', async () => {
  const { ipc } = freshApp()
  const directory = await ipc.call('builds:openStorageDirectory')
  assert.equal(directory, ipc.call('builds:getStorageInfo').directory)
  assert.equal(state.openedDirectory, directory)
})
