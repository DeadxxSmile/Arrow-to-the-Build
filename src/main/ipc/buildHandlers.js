'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { dialog } = require('electron')
const buildStorage = require('../buildStorage')
const dbModule = require('../database/db')
const catalog = require('../catalog')
const { assertSafeJsonStructure } = require('../../shared/jsonSafety.cjs')

const MAX_JSON_BYTES = 8 * 1024 * 1024

function buildDir() { return path.join(__dirname, '../../../resources/builds') }


function markdownCell(value = '') {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

function buildSkillIdReferenceMarkdown(catalogData = {}) {
  const lines = Array.isArray(catalogData.lines) ? [...catalogData.lines] : []
  lines.sort((a, b) => String(a.group || '').localeCompare(String(b.group || '')) || String(a.class || '').localeCompare(String(b.class || '')) || String(a.name || '').localeCompare(String(b.name || '')))
  const output = [
    '# Searchable Skill-Line and Skill IDs',
    '',
    `This reference is generated from the exact catalog bundled with ATTB. It currently contains **${lines.length} skill lines** and **${lines.reduce((sum, line) => sum + (Array.isArray(line.skills) ? line.skills.length : 0), 0)} skills** for **${markdownCell(catalogData.game_version || 'the bundled ESO game version')}**.`,
    '',
    'Use the search field above the guide to find a display name, line ID, or `catalog_skill_id`.',
    '',
    '## Skill-line IDs',
    '',
    '| Line ID | Display name | Group | Class |',
    '|---|---|---|---|'
  ]
  for (const line of lines) output.push(`| \`${markdownCell(line.id)}\` | ${markdownCell(line.name)} | ${markdownCell(line.group)} | ${markdownCell(line.class || '-')} |`)
  for (const line of lines) {
    output.push('', `## ${markdownCell(line.name)}`, '', `Line ID: \`${markdownCell(line.id)}\` · ${markdownCell(line.group || 'Other')}${line.class ? ` · ${markdownCell(line.class)}` : ''}`, '', '| Skill ID | Display name | Type | Rank | Base skill |', '|---|---|---|---:|---|')
    const skills = Array.isArray(line.skills) ? line.skills : []
    for (const skill of skills) output.push(`| \`${markdownCell(skill.id)}\` | ${markdownCell(skill.name)} | ${markdownCell(skill.type)} | ${markdownCell(skill.required_rank ?? '-')} | ${skill.base_id ? `\`${markdownCell(skill.base_id)}\`` : '-'} |`)
  }
  return output.join('\n') + '\n'
}

function readJsonFile(file, label) {
  const stat = fs.statSync(file)
  if (!stat.isFile()) throw new Error(`${label} is not a file.`)
  if (stat.size > MAX_JSON_BYTES) throw new Error(`${label} is larger than 8 MB, which no ATTB file should be.`)
  let parsed
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (err) { throw new Error(`${label} is not valid JSON.\n${err.message}`) }
  assertSafeJsonStructure(parsed, { label })
  return parsed
}

const {
  validateBuild, normalizeBuild, planNodes, planSections,
  isObj, badId, CURRENT_SCHEMA_VERSION, CP_TREE_MAX
} = require('./buildValidation')

function upsertBuild(input, sourcePath = null, bundled = false, options = {}) {
  const { data, errors: normalizeErrors } = normalizeBuild(input)
  const errors = normalizeErrors.length ? normalizeErrors : validateBuild(data)
  if (errors.length) throw new Error(`Invalid ATTB build file:\n${[...new Set(errors)].join('\n')}`)
  const db = dbModule.getDb()
  const existing = db.prepare('SELECT is_bundled,origin_type,forked_from_build_id,last_saved_revision FROM builds WHERE id=?').get(data.id)
  if (existing?.is_bundled && !bundled) throw new Error('Bundled ATTB builds are read-only. Fork the build before editing it.')
  const originType = bundled ? 'bundled' : (options.originType || existing?.origin_type || 'imported')
  const forkedFrom = options.forkedFromBuildId ?? existing?.forked_from_build_id ?? null
  db.prepare(`
    INSERT INTO builds(id,name,short_name,class_name,game_version,verified_date,schema_version,source_path,is_bundled,data_json,origin_type,forked_from_build_id,last_saved_revision)
    VALUES(@id,@name,@short_name,@class_name,@game_version,@verified_date,@schema_version,@source_path,@is_bundled,@data_json,@origin_type,@forked_from_build_id,@last_saved_revision)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, short_name=excluded.short_name, class_name=excluded.class_name,
      game_version=excluded.game_version, verified_date=excluded.verified_date,
      schema_version=excluded.schema_version, source_path=excluded.source_path,
      is_bundled=excluded.is_bundled, data_json=excluded.data_json,
      origin_type=excluded.origin_type, forked_from_build_id=excluded.forked_from_build_id,
      updated_at=datetime('now')
  `).run({
    id: data.id,
    name: data.name,
    short_name: data.short_name || data.name,
    class_name: data.defaults?.class || '',
    game_version: data.game_version || '',
    verified_date: data.verified_date || '',
    schema_version: Number(data.schema_version) || 1,
    source_path: sourcePath,
    is_bundled: bundled ? 1 : 0,
    data_json: JSON.stringify(data),
    origin_type: originType,
    forked_from_build_id: forkedFrom,
    last_saved_revision: existing?.last_saved_revision || 0
  })
  return data.id
}

function seedBundled() {
  const dir = buildDir()
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const full = path.join(dir, file)
      try {
        upsertBuild(readJsonFile(full, file), full, true, { originType: 'bundled' })
      } catch (err) { console.error('[Build seed]', file, err.message) }
    }
  }
  // Imported builds from releases before revision history existed are already saved builds.
  // Give only those legacy imports an initial revision. New created/fork drafts intentionally
  // remain revision 0 until the author chooses Save Build.
  const legacyImports = dbModule.getDb().prepare(`SELECT id,data_json FROM builds
    WHERE is_bundled=0 AND origin_type='imported' AND last_saved_revision=0`).all()
  for (const row of legacyImports) {
    try { ensureInitialRevision(row.id, JSON.parse(row.data_json), 'Imported before Build Editor revision history') }
    catch (err) { console.error('[Build revision backfill]', row.id, err.message) }
  }
  // Saved user builds are mirrored to ordinary JSON files. A missing or unavailable folder must
  // never stop ATTB from opening because SQLite remains the recovery source of truth.
  try { buildStorage.syncAllSavedBuilds() }
  catch (err) { console.error('[Build file sync]', err.message) }
}

function rowToSummary(r) {
  const result = { ...r, is_bundled: !!r.is_bundled, has_draft: !!r.has_draft }
  if (r.data_json) {
    try {
      const data = JSON.parse(r.data_json)
      result.description = data.summary || data.description || ''
      result.author = data.author || ''
    } catch { result.description = ''; result.author = '' }
    delete result.data_json
  }
  return result
}

function slugify(value) {
  const slug = String(value || 'build').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'build'
}

function uniqueBuildId(seed) {
  const db = dbModule.getDb()
  const base = slugify(seed)
  let id = base
  let suffix = 2
  while (db.prepare('SELECT 1 FROM builds WHERE id=?').get(id)) id = `${base}-${suffix++}`
  return id
}

function requestedBuildId(seed, requested = '') {
  const id = String(requested || '').trim()
  if (!id) return uniqueBuildId(seed)
  if (badId(id)) throw new Error('Permanent build ID must use only letters, numbers, dot, dash, or underscore and cannot begin with punctuation.')
  if (dbModule.getDb().prepare('SELECT 1 FROM builds WHERE id=?').get(id)) {
    throw new Error(`Build ID "${id}" already exists. Choose a different permanent ID before creating the build.`)
  }
  return id
}

function getBuildRow(id) {
  const row = dbModule.getDb().prepare('SELECT * FROM builds WHERE id=?').get(String(id || ''))
  if (!row) throw new Error('Build not found.')
  return row
}

function draftPayload(row) {
  if (!row) return null
  const data = JSON.parse(row.data_json)
  const baseData = JSON.parse(row.base_data_json)
  return {
    id: row.id,
    build_id: row.build_id,
    data,
    base_data: baseData,
    dirty: row.data_json !== row.base_data_json,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function getDraftRowById(id) {
  return dbModule.getDb().prepare('SELECT * FROM build_editor_drafts WHERE id=?').get(String(id || ''))
}

function getDraftRowByBuild(buildId) {
  return dbModule.getDb().prepare('SELECT * FROM build_editor_drafts WHERE build_id=?').get(String(buildId || ''))
}


function assertDraftCanFollowSavedReplacement(buildId) {
  const draft = getDraftRowByBuild(buildId)
  if (draft && draft.data_json !== draft.base_data_json) {
    throw new Error('This build has unsaved Build Editor recovery changes. Open it in the Build Editor and save or discard those changes before replacing the saved JSON.')
  }
  return draft
}

function syncDraftToSaved(buildId, data) {
  const draft = getDraftRowByBuild(buildId)
  if (!draft) return
  const json = JSON.stringify(data)
  dbModule.getDb().prepare(`UPDATE build_editor_drafts SET data_json=?,base_data_json=?,updated_at=datetime('now') WHERE id=?`)
    .run(json, json, draft.id)
}

function openDraftForBuild(buildId) {
  const db = dbModule.getDb()
  const build = getBuildRow(buildId)
  if (build.is_bundled) throw new Error('Bundled ATTB builds are read-only. Fork the build to create an editable copy.')
  let draft = getDraftRowByBuild(build.id)
  if (!draft) {
    const id = `draft-${crypto.randomUUID()}`
    db.prepare(`INSERT INTO build_editor_drafts(id,build_id,data_json,base_data_json) VALUES(?,?,?,?)`)
      .run(id, build.id, build.data_json, build.data_json)
    draft = getDraftRowById(id)
  }
  return draftPayload(draft)
}


function guidanceFile() { return path.join(__dirname, '../../../resources/data/build-editor-guidance.json') }
function getBuildEditorGuidance() { return readJsonFile(guidanceFile(), 'Build Editor guidance') }
const { createGuidedBuildCreation } = require('./buildGuidedCreation')
const { normalClassLines, lineRecord, createGuidedBuildData } = createGuidedBuildCreation({
  catalog, CURRENT_SCHEMA_VERSION, readJsonFile, getBuildEditorGuidance, badId, uniqueBuildId, slugify, isObj
})

function createGuidedDraft(options = {}, author = 'NPC') {
  const data = createGuidedBuildData(options, author)
  const errors = validateBuild(data)
  if (errors.length) throw new Error(`The guided starter could not be created:\n${errors.join('\n')}`)
  upsertBuild(data, null, false, { originType: 'created' })
  return openDraftForBuild(data.id)
}

function createBlankDraft(author = 'NPC') {
  const file = path.join(__dirname, '../../../docs/reference/BUILD_TEMPLATE.json')
  const data = readJsonFile(file, 'ATTB build template')
  data.id = uniqueBuildId('untitled-build')
  data.name = 'Untitled Build'
  data.short_name = 'Untitled'
  data.author = String(author || '').trim() || 'NPC'
  data.game_version = catalog.getCatalog().game_version || data.game_version || ''
  data.verified_date = new Date().toISOString().slice(0, 10)
  data.summary = 'An editable ATTB build draft.'
  data.extensions = isObj(data.extensions) ? data.extensions : {}
  data.extensions.attb = { ...(isObj(data.extensions.attb) ? data.extensions.attb : {}), editor_origin: 'created' }
  upsertBuild(data, null, false, { originType: 'created' })
  return openDraftForBuild(data.id)
}

function forkBuild(sourceId, requestedName, author = 'NPC') {
  const source = getBuildRow(sourceId)
  const sourceDraft = source.is_bundled ? null : getDraftRowByBuild(source.id)
  const data = JSON.parse(sourceDraft?.data_json || source.data_json)
  const name = String(requestedName || '').trim() || `${data.name} Fork`
  const newId = uniqueBuildId(name)
  data.id = newId
  data.name = name
  data.short_name = name.length > 36 ? name.slice(0, 36).trim() : name
  data.author = String(author || '').trim() || 'NPC'
  data.extensions = isObj(data.extensions) ? data.extensions : {}
  data.extensions.attb = {
    ...(isObj(data.extensions.attb) ? data.extensions.attb : {}),
    editor_origin: 'fork',
    forked_from_build_id: source.id,
    forked_from_name: source.name
  }
  upsertBuild(data, null, false, { originType: 'fork', forkedFromBuildId: source.id })
  return openDraftForBuild(newId)
}


const { createCharacterBuildImport } = require('./buildCharacterImport')
const characterBuildImport = createCharacterBuildImport({
  catalog, isObj, slugify, normalClassLines, lineRecord, createGuidedBuildData, requestedBuildId, uniqueBuildId
})

function linkedCharacterStateOrThrow(characterId) {
  const state = require('../addon/integration').linkedState(String(characterId || ''))
  if (!state?.linked) throw new Error('This character is not linked to the ESO addon.')
  if (!state.live) throw new Error('ATTB does not have a usable ESO snapshot for this character yet. Sync the character first.')
  return state
}

function createBuildFromImportedState(state, author = 'NPC', options = {}) {
  return characterBuildImport.createBuildFromImportedState(state, author, options)
}

function createBuildFromImportedStateDraft(state, author = 'NPC', options = {}) {
  const data = createBuildFromImportedState(state, author, options)
  const errors = validateBuild(data)
  if (errors.length) throw new Error(`The character build draft could not be created:\n${[...new Set(errors)].join('\n')}`)
  upsertBuild(data, null, false, { originType: 'created' })
  return openDraftForBuild(data.id)
}

function createBuildFromCharacterData(characterId, author = 'NPC', options = {}) {
  return createBuildFromImportedState(linkedCharacterStateOrThrow(characterId), author, options)
}

function createBuildFromCharacter(characterId, author = 'NPC', options = {}) {
  return createBuildFromImportedStateDraft(linkedCharacterStateOrThrow(characterId), author, options)
}

function markImportedUnlockStatus(unlockOrder = [], live = {}) {
  return characterBuildImport.markImportedUnlockStatus(unlockOrder, live)
}

function adaptBuildToCharacterData(characterId, sourceId, requestedName, author = 'NPC') {
  const state = linkedCharacterStateOrThrow(characterId)
  const source = getBuildRow(sourceId)
  const sourceDraft = source.is_bundled ? null : getDraftRowByBuild(source.id)
  const sourceData = JSON.parse(sourceDraft?.data_json || source.data_json)
  return characterBuildImport.adaptBuildToImportedState(state, source, sourceData, requestedName, author)
}

function adaptBuildToCharacter(characterId, sourceId, requestedName, author = 'NPC') {
  const { data, source } = adaptBuildToCharacterData(characterId, sourceId, requestedName, author)
  const errors = validateBuild(data)
  if (errors.length) throw new Error(`The adapted build draft could not be created:\n${[...new Set(errors)].join('\n')}`)
  upsertBuild(data, null, false, { originType: 'fork', forkedFromBuildId: source.id })
  return openDraftForBuild(data.id)
}

function recordBuildRevision(buildId, data, note = '') {
  const db = dbModule.getDb()
  const next = db.prepare('SELECT COALESCE(MAX(revision_number),0)+1 AS n FROM build_revisions WHERE build_id=?').get(buildId).n || 1
  db.prepare(`INSERT INTO build_revisions(build_id,revision_number,name,game_version,schema_version,note,data_json)
              VALUES(?,?,?,?,?,?,?)`)
    .run(buildId, next, data.name, data.game_version || '', Number(data.schema_version) || CURRENT_SCHEMA_VERSION, String(note || '').trim(), JSON.stringify(data))
  db.prepare('UPDATE builds SET last_saved_revision=? WHERE id=?').run(next, buildId)
  return next
}

function ensureInitialRevision(buildId, data, note = 'Initial saved build') {
  const db = dbModule.getDb()
  const exists = db.prepare('SELECT 1 FROM build_revisions WHERE build_id=? LIMIT 1').get(buildId)
  if (exists) return null
  return recordBuildRevision(buildId, data, note)
}

function saveDraftData(draftId, input) {
  if (!isObj(input)) throw new Error('Draft data must be a JSON object.')
  const db = dbModule.getDb()
  const draft = getDraftRowById(draftId)
  if (!draft) throw new Error('Draft not found.')
  const build = getBuildRow(draft.build_id)
  if (build.is_bundled) throw new Error('Bundled ATTB builds cannot be edited.')
  if (String(input.id || '') !== build.id) throw new Error('A build ID cannot be changed after the draft is created. Duplicate or fork the build instead.')
  assertSafeJsonStructure(input, { label: 'Build draft' })
  const json = JSON.stringify(input)
  if (Buffer.byteLength(json, 'utf8') > MAX_JSON_BYTES) throw new Error('Draft is larger than 8 MB.')
  db.prepare(`UPDATE build_editor_drafts SET data_json=?,updated_at=datetime('now') WHERE id=?`).run(json, draft.id)
  return draftPayload(getDraftRowById(draft.id))
}

function saveBuildRevision(draftId, note = '') {
  const db = dbModule.getDb()
  const draft = getDraftRowById(draftId)
  if (!draft) throw new Error('Draft not found.')
  const build = getBuildRow(draft.build_id)
  if (build.is_bundled) throw new Error('Bundled ATTB builds cannot be edited.')
  const { data, errors: normalizeErrors } = normalizeBuild(JSON.parse(draft.data_json))
  const errors = normalizeErrors.length ? normalizeErrors : validateBuild(data)
  if (errors.length) throw new Error(`Build cannot be saved until validation errors are fixed:\n${[...new Set(errors)].join('\n')}`)
  if (data.id !== build.id) throw new Error('A build ID cannot be changed after the draft is created.')
  const saved = db.transaction(() => {
    const next = (db.prepare('SELECT COALESCE(MAX(revision_number),0)+1 AS n FROM build_revisions WHERE build_id=?').get(build.id).n || 1)
    db.prepare(`UPDATE builds SET name=?,short_name=?,class_name=?,game_version=?,verified_date=?,schema_version=?,data_json=?,source_path=NULL,last_saved_revision=?,updated_at=datetime('now') WHERE id=? AND is_bundled=0`)
      .run(data.name, data.short_name || data.name, data.defaults?.class || '', data.game_version || '', data.verified_date || '', Number(data.schema_version) || CURRENT_SCHEMA_VERSION, JSON.stringify(data), next, build.id)
    db.prepare(`INSERT INTO build_revisions(build_id,revision_number,name,game_version,schema_version,note,data_json)
                VALUES(?,?,?,?,?,?,?)`)
      .run(build.id, next, data.name, data.game_version || '', Number(data.schema_version) || CURRENT_SCHEMA_VERSION, String(note || '').trim(), JSON.stringify(data))
    db.prepare(`UPDATE build_editor_drafts SET data_json=?,base_data_json=?,updated_at=datetime('now') WHERE id=?`)
      .run(JSON.stringify(data), JSON.stringify(data), draft.id)
    return { draft: draftPayload(getDraftRowById(draft.id)), revision_number: next }
  })()
  return { ...saved, file_sync: buildStorage.syncSavedBuild(build.id) }
}

function listRevisions(buildId) {
  return dbModule.getDb().prepare(`SELECT id,build_id,revision_number,name,game_version,schema_version,note,created_at
                                   FROM build_revisions WHERE build_id=? ORDER BY revision_number DESC`).all(String(buildId || ''))
}

function getRevision(buildId, revisionNumber) {
  const row = dbModule.getDb().prepare(`SELECT id,build_id,revision_number,name,game_version,schema_version,note,created_at,data_json
                                       FROM build_revisions WHERE build_id=? AND revision_number=?`).get(String(buildId || ''), Number(revisionNumber))
  return row ? { ...row, data: JSON.parse(row.data_json) } : null
}

function restoreRevision(draftId, revisionNumber) {
  const db = dbModule.getDb()
  const draft = getDraftRowById(draftId)
  if (!draft) throw new Error('Draft not found.')
  const build = getBuildRow(draft.build_id)
  if (build.is_bundled) throw new Error('Bundled ATTB builds cannot be edited.')
  const revision = db.prepare('SELECT data_json FROM build_revisions WHERE build_id=? AND revision_number=?').get(build.id, Number(revisionNumber))
  if (!revision) throw new Error('Saved revision not found.')
  db.prepare(`UPDATE build_editor_drafts SET data_json=?,updated_at=datetime('now') WHERE id=?`).run(revision.data_json, draft.id)
  return draftPayload(getDraftRowById(draft.id))
}

function resetDraft(draftId) {
  const draft = getDraftRowById(draftId)
  if (!draft) throw new Error('Draft not found.')
  const build = getBuildRow(draft.build_id)
  if (build.is_bundled) throw new Error('Bundled ATTB builds cannot be edited.')
  dbModule.getDb().prepare(`UPDATE build_editor_drafts SET data_json=?,base_data_json=?,updated_at=datetime('now') WHERE id=?`)
    .run(build.data_json, build.data_json, draft.id)
  return draftPayload(getDraftRowById(draft.id))
}

function register(ipcMain) {
  ipcMain.handle('builds:getStorageInfo', () => buildStorage.getInfo())
  ipcMain.handle('builds:chooseStorageDirectory', () => buildStorage.chooseDirectory())
  ipcMain.handle('builds:restoreDefaultStorageDirectory', () => buildStorage.restoreDefaultDirectory())
  ipcMain.handle('builds:openStorageDirectory', () => buildStorage.openDirectory())
  ipcMain.handle('builds:syncStorageDirectory', () => buildStorage.syncAllSavedBuilds())
  ipcMain.handle('builds:list', () => dbModule.getDb().prepare(`
    SELECT b.*,
      EXISTS(SELECT 1 FROM build_editor_drafts d WHERE d.build_id=b.id) AS has_draft,
      (SELECT d.updated_at FROM build_editor_drafts d WHERE d.build_id=b.id) AS draft_updated_at
    FROM builds b ORDER BY b.is_bundled DESC,b.name`).all().map(rowToSummary))

  ipcMain.handle('builds:get', (_e, id) => {
    const row = dbModule.getDb().prepare('SELECT * FROM builds WHERE id=?').get(String(id || ''))
    if (!row) return null
    const raw = JSON.parse(row.data_json)
    const normalized = normalizeBuild(raw)
    return { ...rowToSummary(row), data: normalized.data, normalized: normalized.changed }
  })

  ipcMain.handle('builds:openDraft', (_e, buildId) => openDraftForBuild(buildId))
  ipcMain.handle('builds:getDraft', (_e, draftId) => draftPayload(getDraftRowById(draftId)))
  ipcMain.handle('builds:getRecentDraft', () => draftPayload(dbModule.getDb().prepare('SELECT * FROM build_editor_drafts ORDER BY updated_at DESC LIMIT 1').get()))
  ipcMain.handle('builds:createBlankDraft', (_e, author) => createBlankDraft(author))
  ipcMain.handle('builds:createGuidedDraft', (_e, options, author) => createGuidedDraft(options, author))
  ipcMain.handle('builds:fork', (_e, sourceId, name, author) => forkBuild(sourceId, name, author))
  ipcMain.handle('builds:createFromCharacter', (_e, characterId, author, options) => createBuildFromCharacter(characterId, author, options || {}))
  ipcMain.handle('builds:adaptFromCharacter', (_e, characterId, sourceId, name, author) => adaptBuildToCharacter(characterId, sourceId, name, author))
  ipcMain.handle('builds:saveDraft', (_e, draftId, data) => saveDraftData(draftId, data))
  ipcMain.handle('builds:saveBuild', (_e, draftId, note) => saveBuildRevision(draftId, note))
  ipcMain.handle('builds:resetDraft', (_e, draftId) => resetDraft(draftId))
  ipcMain.handle('builds:listRevisions', (_e, buildId) => listRevisions(buildId))
  ipcMain.handle('builds:getRevision', (_e, buildId, revisionNumber) => getRevision(buildId, revisionNumber))
  ipcMain.handle('builds:restoreRevision', (_e, draftId, revisionNumber) => restoreRevision(draftId, revisionNumber))
  ipcMain.handle('builds:delete', (_e, buildId) => {
    const db = dbModule.getDb()
    const build = getBuildRow(buildId)
    if (build.is_bundled) throw new Error('Bundled ATTB builds cannot be deleted.')
    const characters = db.prepare('SELECT COUNT(*) AS n FROM characters WHERE build_id=?').get(build.id).n
    if (characters) throw new Error(`This build is used by ${characters} character${characters === 1 ? '' : 's'}. Change those characters to another build before deleting it.`)
    const fileCleanup = buildStorage.removeManagedBuildFile(build)
    const deleted = db.prepare('DELETE FROM builds WHERE id=? AND is_bundled=0').run(build.id).changes > 0
    return { deleted, file_cleanup: fileCleanup }
  })

  ipcMain.handle('builds:import', async () => {
    const result = await dialog.showOpenDialog({ title: 'Import ATTB Build JSON', filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }], properties: ['openFile'] })
    if (result.canceled || !result.filePaths[0]) return null
    const file = result.filePaths[0]
    const raw = readJsonFile(file, path.basename(file))
    const { data, changed } = normalizeBuild(raw)
    const db = dbModule.getDb()
    const existing = db.prepare('SELECT is_bundled,origin_type FROM builds WHERE id=?').get(String(data.id || ''))
    if (existing?.is_bundled) {
      throw new Error(`Build id "${data.id}" belongs to an ATTB bundled build. Change the exported copy's id and name before importing it as your own build.`)
    }
    if (existing) assertDraftCanFollowSavedReplacement(data.id)
    const id = db.transaction(() => {
      const savedId = upsertBuild(data, file, false, { originType: existing?.origin_type || 'imported' })
      if (existing) recordBuildRevision(savedId, data, 'Re-imported build JSON')
      else ensureInitialRevision(savedId, data, 'Imported build')
      syncDraftToSaved(savedId, data)
      return savedId
    })()
    return { id, name: data.name, normalized: changed, file_sync: buildStorage.syncSavedBuild(id) }
  })

  ipcMain.handle('builds:validateData', (_e, input) => {
    const { data, errors: normalizeErrors, changed } = normalizeBuild(input)
    const errors = normalizeErrors.length ? normalizeErrors : validateBuild(data)
    return { valid: errors.length === 0, errors, normalized: changed, data }
  })

  ipcMain.handle('builds:exportData', async (_e, data, defaultName = 'ATTB-build.json') => {
    const normalized = normalizeBuild(data)
    const errors = normalized.errors.length ? normalized.errors : validateBuild(normalized.data)
    if (errors.length) throw new Error(`Cannot export an invalid ATTB build:\n${errors.join('\n')}`)
    data = normalized.data
    const result = await dialog.showSaveDialog({
      title: 'Export ATTB Build JSON', defaultPath: String(defaultName || 'ATTB-build.json'),
      filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    return result.filePath
  })

  ipcMain.handle('builds:exportById', async (_e, buildId) => {
    const row = getBuildRow(buildId)
    const draft = row.is_bundled ? null : getDraftRowByBuild(row.id)
    const raw = JSON.parse(draft?.data_json || row.data_json)
    const normalized = normalizeBuild(raw)
    const errors = normalized.errors.length ? normalized.errors : validateBuild(normalized.data)
    if (errors.length) throw new Error(`Cannot export this build until its recovery draft is valid:
${[...new Set(errors)].join('\n')}`)
    const data = normalized.data
    const result = await dialog.showSaveDialog({
      title: 'Export ATTB Build JSON', defaultPath: `${slugify(data.name)}.json`,
      filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    return result.filePath
  })

  ipcMain.handle('builds:getAuthoringGuide', () => {
    const dir = path.join(__dirname, '../../../docs/reference')
    const read = name => fs.readFileSync(path.join(dir, name), 'utf8')
    const catalogData = catalog.getCatalog()
    return {
      quick_start: read('BUILD_QUICK_START.md'),
      editor_guide: read('BUILD_EDITOR_GUIDE.md'),
      json_guide: read('BUILD_JSON_GUIDE.md'),
      ai_authoring: read('ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md'),
      format_and_ids: [read('BUILD_FORMAT.md'), read('SKILL_CATALOG.md'), buildSkillIdReferenceMarkdown(catalogData)].join('\n\n---\n\n'),
      validation_help: read('BUILD_VALIDATION_GUIDE.md'),
      addon_integration: read('ESO_ADDON_INTEGRATION.md'),
      schema_version: CURRENT_SCHEMA_VERSION,
      catalog_version: catalogData.catalog_version || '',
      game_version: catalogData.game_version || ''
    }
  })

  ipcMain.handle('builds:exportTemplate', async () => {
    const file = path.join(__dirname, '../../../docs/reference/BUILD_TEMPLATE.json')
    const template = readJsonFile(file, 'ATTB build template')
    const errors = validateBuild(template)
    if (errors.length) throw new Error(`The bundled ATTB template failed validation:\n${errors.join('\n')}`)
    const result = await dialog.showSaveDialog({
      title: 'Export Blank ATTB Build Template', defaultPath: 'ATTB-Schema-4-Build-Template.json',
      filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, JSON.stringify(template, null, 2) + '\n', 'utf8')
    return result.filePath
  })

  ipcMain.handle('builds:reloadForCharacter', async (_e, characterId) => {
    const row = dbModule.getDb().prepare(`SELECT b.* FROM builds b JOIN characters c ON c.build_id=b.id WHERE c.id=?`).get(String(characterId || ''))
    if (!row) throw new Error('Character build not found')
    let file = row.is_bundled ? row.source_path : (row.build_file_path || row.source_path)
    if (!file || !fs.existsSync(file)) {
      const result = await dialog.showOpenDialog({
        title: 'Reload Current Build from JSON',
        filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) return null
      file = result.filePaths[0]
    }
    const data = readJsonFile(file, path.basename(file))
    if (data.id !== row.id) throw new Error(`Build ID mismatch. Expected "${row.id}" but the selected JSON contains "${data.id}".`)
    const { data: normalized, changed } = normalizeBuild(data)
    const db = dbModule.getDb()
    if (!row.is_bundled) assertDraftCanFollowSavedReplacement(row.id)
    db.transaction(() => {
      upsertBuild(normalized, file, !!row.is_bundled, { originType: row.origin_type, forkedFromBuildId: row.forked_from_build_id })
      if (!row.is_bundled) {
        recordBuildRevision(row.id, normalized, 'Reloaded from build JSON')
        syncDraftToSaved(row.id, normalized)
      }
    })()
    const fileSync = row.is_bundled ? null : buildStorage.syncSavedBuild(normalized.id)
    return { id: normalized.id, name: normalized.name, file, normalized: changed, file_sync: fileSync }
  })
}

module.exports = {
  register, seedBundled, validateBuild, upsertBuild, normalizeBuild, readJsonFile, createGuidedBuildData,
  createBuildFromImportedState, createBuildFromImportedStateDraft, createBuildFromCharacterData, createBuildFromCharacter, adaptBuildToCharacterData, adaptBuildToCharacter, markImportedUnlockStatus,
  planNodes, planSections, MAX_JSON_BYTES, CURRENT_SCHEMA_VERSION, CP_TREE_MAX
}
