'use strict'

// SQLite-backed character discovery/linking/override behavior for addon snapshots.
// File watching, SavedVariables reads, and addon lifecycle stay in integration.js.
function createCharacterSyncStore(deps) {
  const {
    dbModule, getSetting, setSetting, boolSetting, parseJson, normalizeSnapshot, liveCharacterState,
    normalizeName, cleanText, clampInt, sessionPrompted, notifyRenderer, getStatus
  } = deps

  function overrideRows(characterId) {
    return dbModule.getDb().prepare('SELECT field_path,value_json FROM character_sync_overrides WHERE character_id=?').all(characterId)
      .map(row => ({ path: row.field_path, value: parseJson(row.value_json, null) }))
  }

  function overrideMap(characterId) { return new Map(overrideRows(characterId).map(row => [row.path, row.value])) }

  function valueWithOverride(overrides, pathName, live) { return overrides.has(pathName) ? overrides.get(pathName) : live }

  function normalizedStoredSnapshot(row) {
    if (!row) return null
    const parsed = parseJson(row.snapshot_json, null)
    return parsed ? normalizeSnapshot(row.character_key, parsed, parsed) : null
  }

  function applySnapshotToCharacter(characterId, snapshot = null) {
    const db = dbModule.getDb()
    const link = db.prepare(`SELECT l.character_key,s.snapshot_json FROM character_addon_links l JOIN addon_character_snapshots s ON s.character_key=l.character_key WHERE l.character_id=?`).get(characterId)
    if (!link) return false
    const snapshotInput = snapshot || parseJson(link.snapshot_json, null)
    if (!snapshotInput) return false
    // Re-normalize even stored snapshots before applying them. Storage normally
    // contains normalized JSON, but older snapshots can still have optional or sparse sections
    // should never be able to violate liveCharacterState's shape assumptions.
    const currentSnapshot = normalizeSnapshot(link.character_key, snapshotInput, snapshotInput)
    const live = liveCharacterState(currentSnapshot)
    const overrides = overrideMap(characterId)
    const current = db.prepare('SELECT skill_ranks_json,tracked_skill_lines_json,skill_allocations_json,completed_json FROM characters WHERE id=?').get(characterId)
    if (!current) return false

    const attributes = {
      magicka: clampInt(valueWithOverride(overrides, 'attributes.magicka', live.attributes.magicka), 0, 64, live.attributes.magicka),
      health: clampInt(valueWithOverride(overrides, 'attributes.health', live.attributes.health), 0, 64, live.attributes.health),
      stamina: clampInt(valueWithOverride(overrides, 'attributes.stamina', live.attributes.stamina), 0, 64, live.attributes.stamina)
    }
    const ranks = { ...live.skill_ranks }
    const allocations = { ...live.skill_allocations }
    for (const [key, value] of overrides) {
      if (key.startsWith('skill_ranks.')) ranks[key.slice('skill_ranks.'.length)] = clampInt(value, 0, 50, 0)
      if (key.startsWith('skill_allocations.')) {
        const id = key.slice('skill_allocations.'.length)
        const points = clampInt(value, 0, 20, 0)
        if (points) allocations[id] = points
        else delete allocations[id]
      }
    }
    const completed = new Set(Object.entries(allocations).filter(([, points]) => Number(points) > 0).map(([skillId]) => skillId))
    const trackedSet = new Set(live.tracked_skill_lines)
    for (const [key, value] of overrides) {
      if (!key.startsWith('tracked_skill_lines.')) continue
      const lineId = key.slice('tracked_skill_lines.'.length)
      if (value) trackedSet.add(lineId); else trackedSet.delete(lineId)
    }
    const tracked = [...trackedSet]
    const values = {
      id: characterId,
      name: live.name,
      race: live.race,
      alliance: live.alliance,
      level: clampInt(valueWithOverride(overrides, 'level', live.level), 1, 50, live.level),
      attribute_points: attributes.magicka + attributes.health + attributes.stamina,
      attributes_json: JSON.stringify(attributes),
      cp_craft: clampInt(valueWithOverride(overrides, 'cp_craft', live.cp_craft), 0, 1200, live.cp_craft),
      cp_warfare: clampInt(valueWithOverride(overrides, 'cp_warfare', live.cp_warfare), 0, 1200, live.cp_warfare),
      cp_fitness: clampInt(valueWithOverride(overrides, 'cp_fitness', live.cp_fitness), 0, 1200, live.cp_fitness),
      skill_ranks_json: JSON.stringify(ranks),
      tracked_skill_lines_json: JSON.stringify(tracked),
      skill_allocations_json: JSON.stringify(allocations),
      completed_json: JSON.stringify([...completed]),
      actual_unspent_skill_points: clampInt(valueWithOverride(overrides, 'actual_unspent_skill_points', live.actual_unspent_skill_points), 0, 10000, live.actual_unspent_skill_points),
      actual_unspent_attribute_points: clampInt(valueWithOverride(overrides, 'actual_unspent_attribute_points', live.actual_unspent_attribute_points), 0, 64, live.actual_unspent_attribute_points)
    }
    db.prepare(`UPDATE characters SET name=@name,race=@race,alliance=@alliance,level=@level,attribute_points=@attribute_points,
      attributes_json=@attributes_json,cp_craft=@cp_craft,cp_warfare=@cp_warfare,cp_fitness=@cp_fitness,
      skill_ranks_json=@skill_ranks_json,tracked_skill_lines_json=@tracked_skill_lines_json,
      skill_allocations_json=@skill_allocations_json,completed_json=@completed_json,actual_unspent_skill_points=@actual_unspent_skill_points,
      actual_unspent_attribute_points=@actual_unspent_attribute_points,
      updated_at=datetime('now') WHERE id=@id`).run(values)
    db.prepare(`UPDATE character_addon_links SET last_applied_at=datetime('now') WHERE character_id=?`).run(characterId)
    return true
  }

  function discoveredCharacters(includePrompted = true) {
    const db = dbModule.getDb()
    const profileRoot = getSetting('addon_profile_root')
    return db.prepare(`SELECT s.*,l.character_id,
      (SELECT c.id FROM characters c JOIN builds b ON b.id=c.build_id LEFT JOIN character_addon_links cl ON cl.character_id=c.id
        WHERE cl.character_id IS NULL AND lower(c.name)=lower(s.character_name)
          AND (s.class_name='' OR b.class_name='' OR lower(b.class_name)=lower(s.class_name))
        ORDER BY c.created_at LIMIT 1) AS possible_match_id,
      (SELECT c.name FROM characters c JOIN builds b ON b.id=c.build_id LEFT JOIN character_addon_links cl ON cl.character_id=c.id
        WHERE cl.character_id IS NULL AND lower(c.name)=lower(s.character_name)
          AND (s.class_name='' OR b.class_name='' OR lower(b.class_name)=lower(s.class_name))
        ORDER BY c.created_at LIMIT 1) AS possible_match_name
      FROM addon_character_snapshots s LEFT JOIN character_addon_links l ON l.character_key=s.character_key
      WHERE l.character_id IS NULL AND s.profile_root=? AND s.discovery_status IN ('new','prompted') ORDER BY s.captured_at DESC,s.character_name`).all(profileRoot)
      .filter(row => includePrompted || row.discovery_status === 'new')
      .map(row => {
        const snapshot = normalizedStoredSnapshot(row)
        const live = snapshot ? liveCharacterState(snapshot) : null
        return {
          character_key: row.character_key,
          name: row.character_name,
          account_name: row.account_name,
          world_name: row.world_name,
          eso_character_id: row.eso_character_id,
          class_name: row.class_name,
          race: row.race_name,
          alliance: row.alliance_name,
          level: row.level,
          champion_points: row.champion_points,
          attributes: live?.attributes || null,
          captured_at: row.captured_at,
          addon_version: row.addon_version,
          snapshot_schema: row.snapshot_schema,
          profile_root: row.profile_root,
          profile_active: row.profile_root === getSetting('addon_profile_root'),
          possible_match_id: row.possible_match_id || null,
          possible_match_name: row.possible_match_name || null
        }
      })
  }

  function snapshotCharacters() {
    const db = dbModule.getDb()
    const profileRoot = getSetting('addon_profile_root')
    if (!profileRoot) return []
    return db.prepare(`SELECT s.character_key,s.profile_root,s.account_name,s.world_name,s.eso_character_id,s.character_name,s.class_name,
      s.race_name,s.alliance_name,s.level,s.champion_points,s.addon_version,s.snapshot_schema,s.captured_at,s.discovery_status,
      l.character_id AS linked_character_id,c.name AS linked_character_name,c.build_id AS linked_build_id,b.name AS linked_build_name,b.class_name AS linked_build_class
      FROM addon_character_snapshots s
      LEFT JOIN character_addon_links l ON l.character_key=s.character_key
      LEFT JOIN characters c ON c.id=l.character_id
      LEFT JOIN builds b ON b.id=c.build_id
      WHERE s.profile_root=?
      ORDER BY CASE WHEN l.character_id IS NOT NULL THEN 0 WHEN s.discovery_status='dismissed' THEN 2 ELSE 1 END,s.captured_at DESC,s.character_name`).all(profileRoot)
      .map(row => ({
        character_key: row.character_key,
        account_name: row.account_name,
        world_name: row.world_name,
        eso_character_id: row.eso_character_id,
        name: row.character_name,
        class_name: row.class_name,
        race: row.race_name,
        alliance: row.alliance_name,
        level: row.level,
        champion_points: row.champion_points,
        addon_version: row.addon_version,
        snapshot_schema: row.snapshot_schema,
        captured_at: row.captured_at,
        discovery_status: row.discovery_status,
        linked: !!row.linked_character_id,
        linked_character_id: row.linked_character_id || null,
        linked_character_name: row.linked_character_name || '',
        linked_build_id: row.linked_build_id || '',
        linked_build_name: row.linked_build_name || '',
        linked_build_class: row.linked_build_class || '',
        profile_root: row.profile_root,
        profile_active: true
      }))
  }

  function snapshotRow(characterKey) {
    return dbModule.getDb().prepare('SELECT * FROM addon_character_snapshots WHERE character_key=?').get(characterKey)
  }

  function importCharacter(characterKey, options = {}) {
    const db = dbModule.getDb()
    const row = snapshotRow(characterKey)
    if (!row) throw new Error('That addon character snapshot is no longer available.')
    const activeProfileRoot = getSetting('addon_profile_root')
    if (!activeProfileRoot || row.profile_root !== activeProfileRoot) {
      throw new Error('That character belongs to a different ESO profile. Select its profile in Settings > ESO Addon & Sync before importing it.')
    }
    const existingLink = db.prepare('SELECT character_id FROM character_addon_links WHERE character_key=?').get(characterKey)
    if (existingLink) return { id: existingLink.character_id, linked: true, existing: true, character_key: characterKey }
    const snapshot = normalizedStoredSnapshot(row)
    if (!snapshot) throw new Error('The saved addon snapshot could not be read.')
    let characterId = String(options.link_character_id || '')
    let createdDraft = null
    if (characterId) {
      const existing = db.prepare('SELECT c.id,b.class_name FROM characters c JOIN builds b ON b.id=c.build_id WHERE c.id=?').get(characterId)
      if (!existing) throw new Error('The selected ATTB character no longer exists.')
      if (snapshot.identity.class.name && existing.class_name && normalizeName(snapshot.identity.class.name) !== normalizeName(existing.class_name)) throw new Error(`This ESO character is a ${snapshot.identity.class.name}, but the existing ATTB profile tracks a ${existing.class_name} build.`)
    } else {
      const live = liveCharacterState(snapshot)
      const { insertCharacter } = require('../ipc/characterHandlers')
      if (options.create_build && typeof options.create_build === 'object') {
        const buildHandlers = require('../ipc/buildHandlers')
        const state = {
          character_name: row.character_name || snapshot.identity?.characterName || live.name || 'ESO Character',
          class_name: row.class_name || snapshot.identity?.class?.name || '',
          race: row.race_name || snapshot.identity?.race?.name || live.race || '',
          alliance: row.alliance_name || snapshot.identity?.alliance?.name || live.alliance || '',
          world_name: row.world_name || snapshot.identity?.worldName || '',
          captured_at: Number(row.captured_at || snapshot.capturedAt || 0) || 0,
          live,
          observed: { identity: snapshot.identity, skills: snapshot.skills, equipment: snapshot.equipment, champion: snapshot.champion, metadata: snapshot.metadata, captureReason: snapshot.captureReason }
        }
        const createOptions = { ...options.create_build }
        const author = cleanText(createOptions.author || 'NPC', 80) || 'NPC'
        createdDraft = buildHandlers.createBuildFromImportedStateDraft(state, author, createOptions)
        characterId = insertCharacter({
          ...live,
          build_id: createdDraft.build_id,
          notes: `Synced from ESO addon: ${snapshot.identity.accountName} · ${snapshot.identity.worldName}`
        }, createdDraft.data)
      } else {
        const buildId = String(options.build_id || '')
        const buildRow = db.prepare('SELECT data_json FROM builds WHERE id=? AND (is_bundled=1 OR last_saved_revision>0)').get(buildId)
        if (!buildRow) throw new Error('Choose a saved build before importing this character.')
        const build = JSON.parse(buildRow.data_json)
        const buildClass = cleanText(build.defaults?.class || build.class_name, 80)
        if (snapshot.identity.class.name && buildClass && normalizeName(snapshot.identity.class.name) !== normalizeName(buildClass)) throw new Error(`Choose a saved build for the ${snapshot.identity.class.name} class.`)
        characterId = insertCharacter({
          ...live,
          build_id: buildId,
          loadout_id: options.loadout_id,
          variant_id: options.variant_id,
          notes: `Synced from ESO addon: ${snapshot.identity.accountName} · ${snapshot.identity.worldName}`
        }, build)
      }
    }
    db.transaction(() => {
      db.prepare('INSERT INTO character_addon_links(character_id,character_key) VALUES(?,?)').run(characterId, characterKey)
      db.prepare(`UPDATE addon_character_snapshots SET discovery_status='linked',updated_at=datetime('now') WHERE character_key=?`).run(characterKey)
      applySnapshotToCharacter(characterId, snapshot)
    })()
    sessionPrompted.delete(characterKey)
    return {
      id: characterId,
      linked: true,
      existing: !!options.link_character_id,
      character_key: characterKey,
      created_build: !!createdDraft,
      build_id: createdDraft?.build_id || null,
      draft_id: createdDraft?.id || null
    }
  }

  function dismissCharacter(characterKey) {
    dbModule.getDb().prepare(`UPDATE addon_character_snapshots SET discovery_status='dismissed',updated_at=datetime('now') WHERE character_key=?`).run(characterKey)
    sessionPrompted.delete(characterKey)
    return true
  }

  function rediscoverDismissed() {
    dbModule.getDb().prepare(`UPDATE addon_character_snapshots SET discovery_status='new' WHERE profile_root=? AND discovery_status='dismissed'`).run(getSetting('addon_profile_root'))
    sessionPrompted.clear()
    return discoveredCharacters(true)
  }

  function linkedState(characterId) {
    const db = dbModule.getDb()
    const row = db.prepare(`SELECT l.character_key,l.linked_at,l.last_applied_at,s.account_name,s.world_name,s.eso_character_id,s.character_name,
      s.class_name,s.race_name,s.alliance_name,s.level AS live_level,s.champion_points,s.captured_at,s.addon_version,s.snapshot_schema,s.snapshot_json,s.profile_root
      FROM character_addon_links l JOIN addon_character_snapshots s ON s.character_key=l.character_key WHERE l.character_id=?`).get(characterId)
    if (!row) return { linked: false, overrides: [] }
    const snapshot = normalizedStoredSnapshot(row)
    const live = snapshot ? liveCharacterState(snapshot) : null
    return {
      linked: true,
      character_key: row.character_key,
      account_name: row.account_name,
      world_name: row.world_name,
      eso_character_id: row.eso_character_id,
      character_name: row.character_name,
      class_name: row.class_name,
      race: row.race_name,
      alliance: row.alliance_name,
      captured_at: row.captured_at,
      addon_version: row.addon_version,
      snapshot_schema: row.snapshot_schema,
      profile_root: row.profile_root,
      profile_active: row.profile_root === getSetting('addon_profile_root'),
      linked_at: row.linked_at,
      last_applied_at: row.last_applied_at,
      live,
      observed: snapshot ? { identity: snapshot.identity, skills: snapshot.skills, equipment: snapshot.equipment, champion: snapshot.champion, metadata: snapshot.metadata, captureReason: snapshot.captureReason } : null,
      overrides: overrideRows(characterId)
    }
  }

  function overridesAllowed() { return boolSetting('addon_allow_overrides') }
  function isLinked(characterId) { return !!dbModule.getDb().prepare('SELECT 1 FROM character_addon_links WHERE character_id=?').get(characterId) }

  function liveValueForPath(characterId, fieldPath) {
    const state = linkedState(characterId)
    const live = state.live || {}
    if (fieldPath.startsWith('attributes.')) return live.attributes?.[fieldPath.slice('attributes.'.length)]
    if (fieldPath.startsWith('skill_ranks.')) return live.skill_ranks?.[fieldPath.slice('skill_ranks.'.length)] || 0
    if (fieldPath.startsWith('skill_allocations.')) return live.skill_allocations?.[fieldPath.slice('skill_allocations.'.length)] || 0
    if (fieldPath.startsWith('tracked_skill_lines.')) return live.tracked_skill_lines?.includes(fieldPath.slice('tracked_skill_lines.'.length)) || false
    return live[fieldPath]
  }

  function setOverride(characterId, fieldPath, value) {
    if (!isLinked(characterId)) return false
    if (!overridesAllowed()) throw new Error('Enable synced-data overrides in Settings > ESO Addon & Sync before changing synced ESO values.')
    const db = dbModule.getDb()
    const live = liveValueForPath(characterId, fieldPath)
    if (JSON.stringify(value) === JSON.stringify(live)) {
      db.prepare('DELETE FROM character_sync_overrides WHERE character_id=? AND field_path=?').run(characterId, fieldPath)
      return true
    }
    db.prepare(`INSERT INTO character_sync_overrides(character_id,field_path,value_json) VALUES(?,?,?)
      ON CONFLICT(character_id,field_path) DO UPDATE SET value_json=excluded.value_json,updated_at=datetime('now')`)
      .run(characterId, fieldPath, JSON.stringify(value))
    return true
  }

  function replaceOverridesByPrefix(characterId, prefix, values, liveValues = {}) {
    if (!isLinked(characterId)) return false
    if (!overridesAllowed()) throw new Error('Enable synced-data overrides in Settings > ESO Addon & Sync before changing synced ESO values.')
    const db = dbModule.getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM character_sync_overrides WHERE character_id=? AND field_path LIKE ?').run(characterId, `${prefix}%`)
      const insert = db.prepare(`INSERT INTO character_sync_overrides(character_id,field_path,value_json) VALUES(?,?,?)`)
      for (const [key, value] of Object.entries(values || {})) {
        if (JSON.stringify(value) === JSON.stringify(liveValues?.[key])) continue
        insert.run(characterId, `${prefix}${key}`, JSON.stringify(value))
      }
    })()
    return true
  }

  function clearOverride(characterId, fieldPath) {
    dbModule.getDb().prepare('DELETE FROM character_sync_overrides WHERE character_id=? AND field_path=?').run(characterId, fieldPath)
    applySnapshotToCharacter(characterId)
    return linkedState(characterId)
  }

  function setOverrideMode(enabled) {
    setSetting('addon_allow_overrides', enabled ? 'true' : 'false')
    if (!enabled) {
      const db = dbModule.getDb()
      const ids = db.prepare('SELECT character_id FROM character_addon_links').all().map(row => row.character_id)
      db.transaction(() => {
        db.prepare('DELETE FROM character_sync_overrides').run()
        for (const id of ids) applySnapshotToCharacter(id)
      })()
    }
    notifyRenderer({ type: 'override-mode', status: getStatus() })
    return getStatus()
  }

  function unlinkCharacter(characterId) {
    const db = dbModule.getDb()
    const link = db.prepare('SELECT character_key FROM character_addon_links WHERE character_id=?').get(characterId)
    if (!link) return false
    db.transaction(() => {
      db.prepare('DELETE FROM character_sync_overrides WHERE character_id=?').run(characterId)
      db.prepare('DELETE FROM character_addon_links WHERE character_id=?').run(characterId)
      db.prepare(`UPDATE addon_character_snapshots SET discovery_status='dismissed' WHERE character_key=?`).run(link.character_key)
    })()
    return true
  }

  return {
    applySnapshotToCharacter, discoveredCharacters, snapshotCharacters, importCharacter, dismissCharacter, rediscoverDismissed,
    linkedState, overridesAllowed, isLinked, setOverride, replaceOverridesByPrefix, clearOverride, setOverrideMode, unlinkCharacter
  }
}

module.exports = { createCharacterSyncStore }
