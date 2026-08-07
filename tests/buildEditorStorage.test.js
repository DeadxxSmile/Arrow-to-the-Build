'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { state, makeIpc } = require('./electron-stub')

const dbModule = require('../src/main/database/db')
const buildHandlers = require('../src/main/ipc/buildHandlers')
const characterHandlers = require('../src/main/ipc/characterHandlers')

function freshApp() {
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-editor-'))
  state.userDataDir = dir
  dbModule.initialize(path.join(dir, 'attb.db'))
  const ipc = makeIpc()
  buildHandlers.seedBundled()
  buildHandlers.register(ipc)
  characterHandlers.register(ipc)
  return { ipc, db: dbModule.getDb() }
}

test.afterEach(() => dbModule.close())

test('bundled builds cannot be opened as editable drafts or deleted', () => {
  const { ipc } = freshApp()
  assert.throws(() => ipc.call('builds:openDraft', 'stamina_arcanist_solo_duo'), /read-only/i)
  assert.throws(() => ipc.call('builds:delete', 'stamina_arcanist_solo_duo'), /cannot be deleted/i)
})

test('forking creates a distinct editable build with ancestry and a recovery draft', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:fork', 'stamina_arcanist_solo_duo', 'My Arcanist Fork', 'NPC')
  assert.notEqual(draft.build_id, 'stamina_arcanist_solo_duo')
  assert.equal(draft.data.name, 'My Arcanist Fork')
  assert.equal(draft.data.author, 'NPC')
  const row = ipc.call('builds:list').find(build => build.id === draft.build_id)
  assert.equal(row.is_bundled, false)
  assert.equal(row.origin_type, 'fork')
  assert.equal(row.forked_from_build_id, 'stamina_arcanist_solo_duo')
  assert.equal(row.has_draft, true)
})

test('blank builds use the configured author shape and can autosave invalid work in progress', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  assert.equal(draft.data.author, 'NPC')
  assert.equal(draft.data.name, 'Untitled Build')
  const invalid = { ...draft.data, name: '' }
  const saved = ipc.call('builds:saveDraft', draft.id, invalid)
  assert.equal(saved.data.name, '')
  assert.equal(saved.dirty, true)
  const reopened = ipc.call('builds:getDraft', draft.id)
  assert.equal(reopened.data.name, '')
  assert.throws(() => ipc.call('builds:saveBuild', draft.id, ''), /validation errors/i)
})

test('Save Build creates ordered immutable revisions and resets draft dirtiness', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  const firstData = { ...draft.data, name: 'Revision Test', short_name: 'Revision Test' }
  ipc.call('builds:saveDraft', draft.id, firstData)
  const first = ipc.call('builds:saveBuild', draft.id, 'First complete version')
  assert.equal(first.revision_number, 1)
  assert.equal(first.draft.dirty, false)

  const secondData = { ...first.draft.data, summary: 'Second version summary.' }
  ipc.call('builds:saveDraft', draft.id, secondData)
  const second = ipc.call('builds:saveBuild', draft.id, 'Updated summary')
  assert.equal(second.revision_number, 2)
  const revisions = ipc.call('builds:listRevisions', draft.build_id)
  assert.deepEqual(revisions.map(item => item.revision_number), [2, 1])
  assert.equal(revisions[0].note, 'Updated summary')
  assert.equal(ipc.call('builds:list').find(build => build.id === draft.build_id).last_saved_revision, 2)
})

test('restoring a revision changes only the draft until Save Build is used again', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  ipc.call('builds:saveBuild', draft.id, 'Initial')
  ipc.call('builds:saveDraft', draft.id, { ...draft.data, summary: 'Later summary' })
  ipc.call('builds:saveBuild', draft.id, 'Later')
  const restored = ipc.call('builds:restoreRevision', draft.id, 1)
  assert.equal(restored.dirty, true)
  assert.equal(restored.data.summary, draft.data.summary)
  const stored = ipc.call('builds:get', draft.build_id)
  assert.equal(stored.data.summary, 'Later summary', 'restoring does not overwrite the saved library build')
})

test('build IDs are immutable inside drafts and user builds in use cannot be deleted', () => {
  const { ipc } = freshApp()
  const draft = ipc.call('builds:createBlankDraft', 'NPC')
  assert.throws(() => ipc.call('builds:saveDraft', draft.id, { ...draft.data, id: 'changed-id' }), /cannot be changed/i)
  ipc.call('characters:create', { name: 'Uses Draft', build_id: draft.build_id })
  assert.throws(() => ipc.call('builds:delete', draft.build_id), /used by 1 character/i)
})

test('legacy imported builds receive an initial revision without promoting new created drafts', () => {
  const { ipc, db } = freshApp()
  const source = ipc.call('builds:get', 'stamina_arcanist_solo_duo').data
  const legacy = { ...source, id: 'legacy-import', name: 'Legacy Import', short_name: 'Legacy Import', author: 'NPC' }
  buildHandlers.upsertBuild(legacy, null, false, { originType: 'imported' })
  const created = ipc.call('builds:createBlankDraft', 'NPC')

  buildHandlers.seedBundled()

  assert.equal(db.prepare('SELECT last_saved_revision FROM builds WHERE id=?').get('legacy-import').last_saved_revision, 1)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM build_revisions WHERE build_id=?').get('legacy-import').n, 1)
  assert.equal(db.prepare('SELECT last_saved_revision FROM builds WHERE id=?').get(created.build_id).last_saved_revision, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM build_revisions WHERE build_id=?').get(created.build_id).n, 0)
})
