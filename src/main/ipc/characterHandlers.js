'use strict'
const { randomUUID } = require('crypto')
const { dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const dbModule = require('../database/db')
const { upsertBuild, readJsonFile, normalizeBuild } = require('./buildHandlers')
const catalogModule = require('../catalog')

const MAX_NAME = 60
const MAX_NOTES = 20000
// Per constellation. 3600 is the account-wide earned total, not what one tree can hold.
const CP_TREE_MAX = 1200
const ATTRIBUTE_KEYS = ['magicka', 'health', 'stamina']
const ATTRIBUTE_TOTAL_MAX = 64
const ESO_RACES = new Set(['High Elf','Argonian','Wood Elf','Breton','Dark Elf','Imperial','Khajiit','Nord','Orc','Redguard'])
const ESO_ALLIANCES = new Set(['Aldmeri Dominion','Daggerfall Covenant','Ebonheart Pact'])

const getCatalog = catalogModule.getCatalog
function catalogLineIds() { return new Set((getCatalog().lines || []).map(line => line.id)) }

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '')
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    if (!Array.isArray(fallback) && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) return fallback
    return parsed
  } catch { return fallback }
}
function clampInt(value, min, max, fallback = min) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}
function sanitizeAttributes(input, fallback = null) {
  const source = (input && typeof input === 'object' && !Array.isArray(input)) ? input : (fallback || {})
  const out = {}
  for (const key of ATTRIBUTE_KEYS) out[key] = clampInt(source[key], 0, ATTRIBUTE_TOTAL_MAX, 0)
  // Nothing in ESO gives more than 64 total, so a bad file gets trimmed from Stamina backwards.
  let total = ATTRIBUTE_KEYS.reduce((sum, key) => sum + out[key], 0)
  for (let i = ATTRIBUTE_KEYS.length - 1; i >= 0 && total > ATTRIBUTE_TOTAL_MAX; i--) {
    const take = Math.min(out[ATTRIBUTE_KEYS[i]], total - ATTRIBUTE_TOTAL_MAX)
    out[ATTRIBUTE_KEYS[i]] -= take
    total -= take
  }
  return out
}
function attributeTotal(attributes) { return ATTRIBUTE_KEYS.reduce((sum, key) => sum + (Number(attributes?.[key]) || 0), 0) }

function cleanName(value, fallback) {
  const name = String(value ?? '').trim().slice(0, MAX_NAME)
  return name || fallback
}

function legacyTrackedLines(row) {
  const tracked = parseJson(row.tracked_skill_lines_json, [])
  if (tracked.length) return tracked.filter(id => typeof id === 'string')
  const custom = parseJson(row.custom_skill_lines_json, [])
  if (!custom.length) return []
  return [...new Set(custom.map(line => catalogModule.lineIdForName(line?.name)).filter(Boolean))]
}

function parseRow(row) {
  if (!row) return null
  const custom = parseJson(row.custom_skill_lines_json, [])
  const ranks = parseJson(row.skill_ranks_json, {})
  if (custom.length) {
    for (const legacy of custom) {
      const id = catalogModule.lineIdForName(legacy?.name)
      if (id && ranks[id] === undefined) ranks[id] = clampInt(legacy?.rank, 0, 50, 0)
    }
  }
  const allocations = {}
  for (const [key, value] of Object.entries(parseJson(row.skill_allocations_json, {}))) {
    const points = clampInt(value, 0, 20, 0)
    if (points) allocations[key] = points
  }
  return {
    ...row,
    eso_plus: !!row.eso_plus,
    race: ESO_RACES.has(row.race) ? row.race : '',
    alliance: ESO_ALLIANCES.has(row.alliance) ? row.alliance : '',
    attributes: sanitizeAttributes(parseJson(row.attributes_json, {})),
    skill_ranks: ranks,
    completed: [...new Set(parseJson(row.completed_json, []).filter(x => typeof x === 'string'))],
    gear: parseJson(row.gear_json, {}),
    custom_skill_lines: custom,
    tracked_skill_lines: legacyTrackedLines(row),
    skill_allocations: allocations
  }
}

function migrateLegacyRow(row) {
  const parsed = parseRow(row)
  if (!parsed) return null
  const rawTracked = parseJson(row.tracked_skill_lines_json, [])
  if (parsed.custom_skill_lines.length && !rawTracked.length && parsed.tracked_skill_lines.length) {
    dbModule.getDb().transaction(() => {
      updateJson(row.id, 'tracked_skill_lines_json', parsed.tracked_skill_lines)
      updateJson(row.id, 'skill_ranks_json', parsed.skill_ranks)
      updateJson(row.id, 'custom_skill_lines_json', [])
    })()
    parsed.custom_skill_lines = []
  }
  return parsed
}

function getBuildData(buildId) {
  const row = dbModule.getDb().prepare('SELECT data_json FROM builds WHERE id=?').get(String(buildId || ''))
  if (!row) throw new Error('Build not found')
  return JSON.parse(row.data_json)
}

const JSON_COLUMNS = new Set([
  'attributes_json', 'skill_ranks_json', 'completed_json', 'gear_json',
  'custom_skill_lines_json', 'tracked_skill_lines_json', 'skill_allocations_json'
])
function updateJson(id, column, value) {
  if (!JSON_COLUMNS.has(column)) throw new Error('Invalid JSON column')
  dbModule.getDb().prepare(`UPDATE characters SET ${column}=?, updated_at=datetime('now') WHERE id=?`).run(JSON.stringify(value), id)
}

function requireCharacter(id) {
  const row = dbModule.getDb().prepare('SELECT * FROM characters WHERE id=?').get(String(id || ''))
  const parsed = parseRow(row)
  if (!parsed) throw new Error('Character not found')
  return parsed
}

function cleanCharacterForBackup(character) {
  return {
    name: character.name,
    variant_id: character.variant_id,
    race: character.race || '',
    alliance: character.alliance || '',
    level: character.level,
    attributes: character.attributes,
    cp_craft: character.cp_craft,
    cp_warfare: character.cp_warfare,
    cp_fitness: character.cp_fitness,
    skill_ranks: character.skill_ranks,
    completed: character.completed,
    gear: character.gear,
    tracked_skill_lines: character.tracked_skill_lines,
    skill_allocations: character.skill_allocations,
    notes: character.notes || ''
  }
}

function sanitizeRanks(input, build) {
  const known = catalogLineIds()
  const ranks = Object.fromEntries((build.relevant_lines || []).map(l => [l.id, 0]))
  for (const [lineId, value] of Object.entries(input || {})) {
    if (typeof lineId !== 'string') continue
    // Keep unknown ids only if the build itself declares them, so old catalog lines are not dropped.
    if (!known.has(lineId) && ranks[lineId] === undefined) continue
    ranks[lineId] = clampInt(value, 0, 50, 0)
  }
  return ranks
}

function sanitizeGear(input) {
  const gear = {}
  for (const [stageId, pieces] of Object.entries(input || {})) {
    if (typeof stageId !== 'string' || !pieces || typeof pieces !== 'object') continue
    const stage = {}
    for (const [key, done] of Object.entries(pieces)) if (done) stage[key] = true
    if (Object.keys(stage).length) gear[stageId] = stage
  }
  return gear
}

function insertCharacter(payload, build, forcedId = null) {
  const id = forcedId || randomUUID()
  const defaults = build.defaults || {}
  const legacyCustom = Array.isArray(payload.custom_skill_lines) ? payload.custom_skill_lines : []
  const ranks = sanitizeRanks(payload.skill_ranks, build)
  const legacyTracked = legacyCustom.map(line => catalogModule.lineIdForName(line?.name)).filter(Boolean)
  for (const legacy of legacyCustom) {
    const lineId = catalogModule.lineIdForName(legacy?.name)
    if (lineId && !ranks[lineId]) ranks[lineId] = clampInt(legacy?.rank, 0, 50, 0)
  }
  const known = catalogLineIds()
  const tracked = [...new Set([
    ...(Array.isArray(payload.tracked_skill_lines) ? payload.tracked_skill_lines : []),
    ...legacyTracked
  ])].filter(lineId => typeof lineId === 'string' && known.has(lineId))

  const allocations = {}
  for (const [key, value] of Object.entries(payload.skill_allocations || {})) {
    const points = clampInt(value, 0, 20, 0)
    if (typeof key === 'string' && points) allocations[key] = points
  }

  // Old backups stored only attribute_points; start from the build target when there is no split.
  const attributes = sanitizeAttributes(payload.attributes, defaults.attributes)

  const variantIds = new Set((build.variants || []).filter(v => v?.available !== false).map(v => v.id))
  const requested = payload.variant_id
  const variant = variantIds.has(requested) ? requested : (build.variants?.[0]?.id || 'solo-duo')

  dbModule.getDb().prepare(`
    INSERT INTO characters(
      id,name,build_id,variant_id,race,alliance,level,attribute_points,attributes_json,
      cp_craft,cp_warfare,cp_fitness,eso_plus,skill_ranks_json,completed_json,
      gear_json,custom_skill_lines_json,tracked_skill_lines_json,skill_allocations_json,
      skyshards_collected,other_skill_points,actual_unspent_skill_points,notes
    ) VALUES(
      @id,@name,@build_id,@variant_id,@race,@alliance,@level,@attribute_points,@attributes_json,
      @cp_craft,@cp_warfare,@cp_fitness,0,@skill_ranks_json,@completed_json,
      @gear_json,'[]',@tracked_skill_lines_json,@skill_allocations_json,
      0,0,0,@notes
    )
  `).run({
    id,
    name: cleanName(payload.name, defaults.class || 'New Character'),
    build_id: build.id,
    variant_id: variant,
    race: ESO_RACES.has(payload.race) ? payload.race : (ESO_RACES.has(defaults.race) ? defaults.race : 'Dark Elf'),
    alliance: ESO_ALLIANCES.has(payload.alliance) ? payload.alliance : (ESO_ALLIANCES.has(defaults.alliance) ? defaults.alliance : 'Ebonheart Pact'),
    level: clampInt(payload.level, 1, 50, 1),
    attribute_points: attributeTotal(attributes),
    attributes_json: JSON.stringify(attributes),
    cp_craft: clampInt(payload.cp_craft, 0, CP_TREE_MAX, 0),
    cp_warfare: clampInt(payload.cp_warfare, 0, CP_TREE_MAX, 0),
    cp_fitness: clampInt(payload.cp_fitness, 0, CP_TREE_MAX, 0),
    skill_ranks_json: JSON.stringify(ranks),
    completed_json: JSON.stringify([...new Set((Array.isArray(payload.completed) ? payload.completed : []).filter(x => typeof x === 'string'))]),
    gear_json: JSON.stringify(sanitizeGear(payload.gear)),
    tracked_skill_lines_json: JSON.stringify(tracked),
    skill_allocations_json: JSON.stringify(allocations),
    notes: String(payload.notes || '').slice(0, MAX_NOTES)
  })
  return id
}

function uniqueName(base) {
  const db = dbModule.getDb()
  const exists = n => !!db.prepare('SELECT 1 FROM characters WHERE lower(name)=lower(?)').get(n)
  let name = base
  let suffix = 2
  while (exists(name)) name = `${base} (${suffix++})`
  return name.slice(0, MAX_NAME)
}

function importBackupData(backup) {
  if (backup?.file_type !== 'attb-character-backup' || !backup?.build || !backup?.character) {
    throw new Error('This is not a valid ATTB character backup.')
  }
  const db = dbModule.getDb()
  const existing = db.prepare('SELECT id FROM builds WHERE id=?').get(String(backup.build.id || ''))
  return db.transaction(() => {
    // Never let a backup rewrite a build other characters already depend on. Old backups routinely
    // carry a stale copy of a bundled build.
    if (!existing) upsertBuild(backup.build, null, false)
    const build = getBuildData(backup.build.id)
    const name = uniqueName(cleanName(backup.character.name, 'Imported Character'))
    const id = insertCharacter({ ...backup.character, name }, build)
    return { id, name, build_id: build.id, build_reused: !!existing }
  })()
}

function register(ipcMain) {
  ipcMain.handle('characters:list', () => dbModule.getDb().prepare(`
    SELECT c.id,c.name,c.build_id,c.variant_id,c.race,c.alliance,c.level,c.cp_craft,c.cp_warfare,c.cp_fitness,c.eso_plus,
           b.name AS build_name,b.short_name,b.class_name
    FROM characters c JOIN builds b ON b.id=c.build_id ORDER BY c.created_at
  `).all().map(r => ({ ...r, eso_plus: !!r.eso_plus })))

  ipcMain.handle('characters:get', (_e, id) => migrateLegacyRow(dbModule.getDb().prepare('SELECT * FROM characters WHERE id=?').get(String(id || ''))))

  ipcMain.handle('characters:create', (_e, payload) => insertCharacter(payload || {}, getBuildData(payload?.build_id)))

  ipcMain.handle('characters:update', (_e, id, patch) => {
    const character = requireCharacter(id)
    const values = {}
    const source = patch && typeof patch === 'object' ? patch : {}
    if (source.name !== undefined) values.name = cleanName(source.name, character.name)
    if (source.notes !== undefined) values.notes = String(source.notes).slice(0, MAX_NOTES)
    if (source.race !== undefined && ESO_RACES.has(source.race)) values.race = source.race
    if (source.alliance !== undefined && ESO_ALLIANCES.has(source.alliance)) values.alliance = source.alliance
    if (source.level !== undefined) values.level = clampInt(source.level, 1, 50, character.level)
    if (source.attributes !== undefined) {
      const attributes = sanitizeAttributes(source.attributes, character.attributes)
      values.attributes_json = JSON.stringify(attributes)
      values.attribute_points = attributeTotal(attributes)
    }
    for (const key of ['cp_craft', 'cp_warfare', 'cp_fitness']) {
      if (source[key] !== undefined) values[key] = clampInt(source[key], 0, CP_TREE_MAX, character[key])
    }
    if (source.build_id !== undefined && String(source.build_id) !== character.build_id) {
      const nextBuild = getBuildData(source.build_id)
      const previousBuild = getBuildData(character.build_id)
      const sameClass = nextBuild.defaults?.class === previousBuild.defaults?.class
      const allowedLines = new Set((nextBuild.relevant_lines || []).map(line => line.id))
      const keptRanks = {}
      for (const [lineId, rank] of Object.entries(character.skill_ranks || {})) {
        const line = catalogModule.getLine(lineId)
        const isClassLine = line?.group === 'Class'
        if (!isClassLine || allowedLines.has(lineId)) keptRanks[lineId] = rank
      }
      for (const line of nextBuild.relevant_lines || []) if (keptRanks[line.id] === undefined) keptRanks[line.id] = 0
      const keptTrackedLines = (character.tracked_skill_lines || []).filter(lineId => {
        const line = catalogModule.getLine(lineId)
        return line?.group !== 'Class' || line?.class === nextBuild.defaults?.class
      })
      const keptAllocations = {}
      for (const [skillId, points] of Object.entries(character.skill_allocations || {})) {
        const hit = catalogModule.getSkill(skillId)
        const isClassSkill = hit?.line?.group === 'Class'
        if (!isClassSkill || hit?.line?.class === nextBuild.defaults?.class) keptAllocations[skillId] = points
      }
      const newUnlockIds = new Set((nextBuild.unlock_order || []).map(item => item.id))
      const keptCompleted = (character.completed || []).filter(id => newUnlockIds.has(id))
      const validGear = {}
      const stageMap = new Map((nextBuild.gear_stages || []).map(stage => [stage.id, new Set((stage.sets || []).flatMap(set => (set.pieces || []).map(piece => `id:${piece.id}`)))]))
      for (const [stageId, pieces] of Object.entries(character.gear || {})) {
        const allowed = stageMap.get(stageId)
        if (!allowed) continue
        const kept = Object.fromEntries(Object.entries(pieces).filter(([key, done]) => done && allowed.has(key)))
        if (Object.keys(kept).length) validGear[stageId] = kept
      }
      const nextVariants = (nextBuild.variants || []).filter(v => v?.available !== false)
      const nextVariantIds = new Set(nextVariants.map(variant => variant.id))
      values.build_id = nextBuild.id
      values.variant_id = nextVariantIds.has(source.variant_id) ? source.variant_id : (nextVariants[0]?.id || 'solo-duo')
      values.skill_ranks_json = JSON.stringify(keptRanks)
      values.tracked_skill_lines_json = JSON.stringify(keptTrackedLines)
      values.skill_allocations_json = JSON.stringify(keptAllocations)
      values.completed_json = JSON.stringify(keptCompleted)
      values.gear_json = JSON.stringify(sameClass ? validGear : {})
    }
    if (source.variant_id !== undefined && values.build_id === undefined) {
      const build = getBuildData(character.build_id)
      const ids = new Set((build.variants || []).filter(v => v?.available !== false).map(v => v.id))
      if (ids.has(source.variant_id)) values.variant_id = source.variant_id
    }
    const keys = Object.keys(values)
    if (!keys.length) return true
    values.id = id
    dbModule.getDb().prepare(`UPDATE characters SET ${keys.map(k => `${k}=@${k}`).join(',')}, updated_at=datetime('now') WHERE id=@id`).run(values)
    return true
  })

  ipcMain.handle('characters:setSkillRank', (_e, id, lineId, rank) => {
    const c = requireCharacter(id)
    if (typeof lineId !== 'string' || !lineId) throw new Error('Invalid skill line')
    c.skill_ranks[lineId] = clampInt(rank, 0, 50, 0)
    updateJson(id, 'skill_ranks_json', c.skill_ranks)
    return c.skill_ranks
  })

  ipcMain.handle('characters:setSkillTracking', (_e, id, allocations, completed) => {
    const c = requireCharacter(id)
    const safeAllocations = {}
    for (const [key, value] of Object.entries(allocations || {})) {
      const points = clampInt(value, 0, 20, 0)
      if (typeof key === 'string' && points) safeAllocations[key] = points
    }
    const safeCompleted = [...new Set(Array.isArray(completed) ? completed.filter(x => typeof x === 'string') : c.completed)]
    dbModule.getDb().transaction(() => {
      updateJson(id, 'skill_allocations_json', safeAllocations)
      updateJson(id, 'completed_json', safeCompleted)
    })()
    return { skill_allocations: safeAllocations, completed: safeCompleted }
  })

  ipcMain.handle('characters:addTrackedSkillLine', (_e, id, lineId) => {
    const c = requireCharacter(id)
    if (!(getCatalog().lines || []).some(x => x.id === lineId)) throw new Error('Skill line not found in the bundled catalog')
    const tracked = [...new Set([...(c.tracked_skill_lines || []), lineId])]
    const ranks = { ...c.skill_ranks }
    if (ranks[lineId] === undefined) ranks[lineId] = 0
    dbModule.getDb().transaction(() => {
      updateJson(id, 'tracked_skill_lines_json', tracked)
      updateJson(id, 'skill_ranks_json', ranks)
    })()
    return tracked
  })

  ipcMain.handle('characters:deleteTrackedSkillLine', (_e, id, lineId) => {
    const c = requireCharacter(id)
    const tracked = (c.tracked_skill_lines || []).filter(x => x !== lineId)
    updateJson(id, 'tracked_skill_lines_json', tracked)
    return tracked
  })

  ipcMain.handle('characters:setGearPiece', (_e, id, stageId, pieceKey, done) => {
    const c = requireCharacter(id)
    if (typeof stageId !== 'string' || typeof pieceKey !== 'string') throw new Error('Invalid gear piece')
    const gear = c.gear || {}
    gear[stageId] = gear[stageId] || {}
    if (done) gear[stageId][pieceKey] = true; else delete gear[stageId][pieceKey]
    updateJson(id, 'gear_json', gear)
    return gear
  })

  ipcMain.handle('characters:incrementCp', (_e, id, tree, amount = 1) => {
    const columns = { craft: 'cp_craft', warfare: 'cp_warfare', fitness: 'cp_fitness' }
    const column = columns[tree]
    if (!column) throw new Error('Invalid CP tree')
    const c = requireCharacter(id)
    const step = clampInt(amount, -CP_TREE_MAX, CP_TREE_MAX, 1)
    const value = clampInt(c[column] + step, 0, CP_TREE_MAX, c[column])
    dbModule.getDb().prepare(`UPDATE characters SET ${column}=?,updated_at=datetime('now') WHERE id=?`).run(value, id)
    return requireCharacter(id)
  })

  ipcMain.handle('characters:export', async (_e, id) => {
    const character = requireCharacter(id)
    const build = getBuildData(character.build_id)
    const result = await dialog.showSaveDialog({
      title: 'Export ATTB Character Backup',
      defaultPath: `${character.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'ATTB-Character'}-backup.json`,
      filters: [{ name: 'ATTB Character Backup', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    // Export the id-based form even if this build row predates the migration.
    const { data: normalized, errors } = normalizeBuild(build)
    if (errors.length) throw new Error(`This build cannot be exported yet:\n${errors.join('\n')}`)
    const backup = {
      file_type: 'attb-character-backup',
      schema_version: 4,
      exported_at: new Date().toISOString(),
      app_version: require('../../../package.json').version,
      catalog_version: getCatalog().catalog_version || null,
      build: normalized,
      character: cleanCharacterForBackup(character)
    }
    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2), 'utf8')
    return result.filePath
  })

  ipcMain.handle('characters:importBackup', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import ATTB Character Backup',
      filters: [{ name: 'ATTB Character Backup', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    const file = result.filePaths[0]
    return importBackupData(readJsonFile(file, path.basename(file)))
  })

  ipcMain.handle('characters:delete', (_e, id) => {
    const info = dbModule.getDb().prepare('DELETE FROM characters WHERE id=?').run(String(id || ''))
    return info.changes > 0
  })
}

module.exports = { register, parseRow, insertCharacter, importBackupData, cleanCharacterForBackup, clampInt }
