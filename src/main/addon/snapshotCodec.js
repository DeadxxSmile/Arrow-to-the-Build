'use strict'

const catalogModule = require('../catalog')

// Pure decoding and normalization for the ESO SavedVariables bridge/archive payloads.
// Filesystem watching, database reconciliation, overrides, and IPC live in integration.js.

function cleanText(value, max = 200) { return String(value ?? '').replace(/\^...$/i, '').trim().slice(0, max) }
function clampInt(value, min, max, fallback = min) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback
}
function normalizeName(value) {
  return cleanText(value, 300).toLocaleLowerCase('en-US').normalize('NFKD')
    .replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}
function asArray(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).filter(([key]) => /^\d+$/.test(key)).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, item]) => item)
}
function objectOrEmpty(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {} }

function catalogMaps() {
  const catalog = catalogModule.getCatalog()
  const linesByName = new Map()
  const skillsByLineAndName = new Map()
  for (const line of catalog.lines || []) {
    const lineKey = normalizeName(line.name)
    if (!linesByName.has(lineKey)) linesByName.set(lineKey, [])
    linesByName.get(lineKey).push(line)
    for (const skill of line.skills || []) skillsByLineAndName.set(`${line.id}|${normalizeName(skill.name)}`, skill)
  }
  return { catalog, linesByName, skillsByLineAndName }
}

function matchCatalogLine(rawLine, maps, className) {
  const rawName = normalizeName(rawLine?.name)
  let candidates = maps.linesByName.get(rawName) || []
  // ESO exposes the system line as the generic "Class Mastery" name, while the ATTB catalog
  // keeps one stable line per class so builds and character progress cannot collide.
  if (!candidates.length && rawName === 'class mastery' && className) {
    candidates = maps.linesByName.get(normalizeName(`${className} Class Mastery`)) || []
  }
  if (candidates.length === 1) return candidates[0]
  const exactClass = candidates.find(line => !line.class || normalizeName(line.class) === normalizeName(className))
  return exactClass || candidates[0] || null
}


function packedFields(value) { return String(value ?? '').split('\t') }
function packedRows(value) {
  if (Array.isArray(value)) return value.map(row => String(row ?? '')).filter(Boolean)
  const text = String(value ?? '')
  return text ? text.split(/\r?\n/).filter(Boolean) : []
}
function packedInt(fields, index, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0) {
  return clampInt(fields[index], min, max, fallback)
}
function packedBool(fields, index) { return fields[index] === '1' || fields[index] === 'true' }
function packedOptionalInt(fields, index, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return fields[index] === '' || fields[index] == null ? null : clampInt(fields[index], min, max, 0)
}

function decodeBridgeSnapshotV1(root) {
  const characterKey = cleanText(root?.characterKey, 400)
  const character = objectOrEmpty(root?.character)
  if (!characterKey || !character.identity) return null

  const i = packedFields(character.identity)
  const skills = objectOrEmpty(character.skills)
  const champion = objectOrEmpty(character.champion)
  const raw = {
    snapshotSchemaVersion: 2,
    dataProfile: 'near-live-bridge',
    addonVersion: cleanText(root.addonVersion, 80),
    apiVersion: clampInt(root.apiVersion, 0, 999999, 0),
    capturedAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    captureReason: cleanText(root.captureReason || 'bridge', 120),
    identity: {
      characterKey,
      accountName: cleanText(i[0], 120),
      worldName: cleanText(i[1], 120),
      characterId: cleanText(i[2], 80),
      name: cleanText(i[3], 120),
      rawName: cleanText(i[3], 160),
      class: { id: packedInt(i, 4, 0, 9999), name: cleanText(i[5], 80) },
      race: { id: packedInt(i, 6, 0, 9999), name: cleanText(i[7], 80) },
      alliance: { id: packedInt(i, 8, 0, 9999), name: cleanText(i[9], 80) },
      level: packedInt(i, 10, 1, 50, 1),
      championPoints: packedInt(i, 11, 0, 10000),
      championPointsEarned: packedInt(i, 12, 0, 10000),
      progression: {
        availableAttributePoints: packedInt(i, 13, 0, 64),
        availableSkillPoints: packedInt(i, 14, 0, 10000)
      },
      attributes: {
        magicka: { spentPoints: packedInt(i, 15, 0, 64) },
        health: { spentPoints: packedInt(i, 16, 0, 64) },
        stamina: { spentPoints: packedInt(i, 17, 0, 64) }
      }
    },
    skills: {
      lines: asArray(skills.lines).map(line => {
        const h = packedFields(line?.header)
        return {
          skillType: packedInt(h, 0, 0, 99),
          skillTypeName: '',
          skillLineId: packedInt(h, 1, 0, 99999),
          name: cleanText(h[2], 120),
          rank: packedInt(h, 3, 0, 50),
          abilities: asArray(line?.abilities).map(record => {
            const a = packedFields(record)
            return {
              abilityId: packedInt(a, 0, 0, 9999999),
              baseAbilityId: packedInt(a, 1, 0, 9999999),
              progressionId: packedInt(a, 2, 0, 9999999),
              name: cleanText(a[3], 160),
              currentRank: packedInt(a, 4, 0, 20),
              currentMorph: packedInt(a, 5, 0, 2),
              passiveRank: packedOptionalInt(a, 6, 0, 20),
              passiveMaxRank: packedOptionalInt(a, 7, 0, 20),
              isPassive: packedBool(a, 8),
              isUltimate: packedBool(a, 9)
            }
          })
        }
      }),
      actionBars: asArray(skills.actionBars).map(bar => {
        const h = packedFields(bar?.header)
        return {
          category: packedInt(h, 0, 0, 99),
          label: cleanText(h[1], 80),
          slots: asArray(bar?.slots).map(record => {
            const a = packedFields(record)
            const slot = {
              position: packedInt(a, 0, 0, 20),
              abilityId: packedInt(a, 1, 0, 9999999),
              name: cleanText(a[2], 160),
              slotType: packedInt(a, 3, 0, 99),
              isUltimate: packedBool(a, 4)
            }
            if (a[5]) slot.skillAbilityId = packedInt(a, 5, 0, 9999999)
            if (a[6]) slot.progressionId = packedInt(a, 6, 0, 9999999)
            if (a[7]) slot.skillLineId = packedInt(a, 7, 0, 99999)
            if (a[8]) slot.currentMorph = packedInt(a, 8, 0, 2)
            if (a[9]) slot.currentRank = packedInt(a, 9, 0, 20)
            if (a[10]) slot.matchMethod = cleanText(a[10], 40)
            return slot
          })
        }
      }),
      activeWeaponPair: (() => {
        const a = packedFields(skills.activeWeaponPair)
        return { pair: packedInt(a, 0, 0, 9), locked: packedBool(a, 1) }
      })()
    },
    equipment: {
      items: asArray(character.equipment).map(record => {
        const a = packedFields(record)
        const setId = packedInt(a, 17, 0, 9999999)
        return {
          equipSlot: packedInt(a, 0, 0, 99),
          slotName: cleanText(a[1], 80),
          itemId: packedInt(a, 2, 0, 999999999),
          name: cleanText(a[3], 180),
          quality: packedInt(a, 4, 0, 10),
          requiredLevel: packedInt(a, 5, 0, 50),
          requiredChampionPoints: packedInt(a, 6, 0, 3600),
          equipType: packedInt(a, 7, 0, 99),
          equipTypeName: cleanText(a[8], 80),
          itemType: packedInt(a, 9, 0, 99),
          itemTypeName: cleanText(a[10], 80),
          armorType: packedInt(a, 11, 0, 99),
          armorTypeName: cleanText(a[12], 80),
          weaponType: packedInt(a, 13, 0, 99),
          weaponTypeName: cleanText(a[14] || 'None', 80),
          trait: { id: packedInt(a, 15, 0, 999), name: cleanText(a[16], 100) },
          set: { hasSet: setId > 0, id: setId, name: cleanText(a[18], 160) },
          enchantment: { name: cleanText(a[19], 160) }
        }
      })
    },
    champion: {
      totalEarned: clampInt(champion.totalEarned, 0, 10000, 0),
      disciplines: asArray(champion.disciplines).map(discipline => {
        const h = packedFields(discipline?.header)
        return {
          disciplineId: packedInt(h, 0, 0, 99),
          name: cleanText(h[1], 80),
          spent: packedInt(h, 2, 0, 1200),
          unspent: packedInt(h, 3, 0, 1200),
          stars: asArray(discipline?.stars).map(record => {
            const a = packedFields(record)
            return {
              skillId: packedInt(a, 0, 0, 9999999),
              name: cleanText(a[1], 160),
              points: packedInt(a, 2, 0, 500),
              maximumPoints: packedInt(a, 3, 0, 500),
              skillType: packedInt(a, 4, 0, 99),
              slottable: packedBool(a, 5)
            }
          })
        }
      }),
      slotted: {
        supported: true,
        slots: asArray(champion.slots).map(record => {
          const a = packedFields(record)
          return {
            position: packedInt(a, 0, 0, 20),
            disciplineId: packedInt(a, 1, 0, 99),
            disciplineName: cleanText(a[2], 80),
            skillId: packedInt(a, 3, 0, 9999999),
            name: cleanText(a[4] || 'Empty', 160)
          }
        })
      }
    },
    metadata: {
      firstSeenAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      lastSeenAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      captureCount: 0,
      capturedSections: asArray(root.capturedSections).map(value => cleanText(value, 40))
    },
    diagnostics: { warnings: [], errors: [] },
    completeness: { isComplete: true }
  }
  return { characterKey, raw }
}


const CHAMPION_DISCIPLINE_NAMES = { 1: 'Warfare', 2: 'Fitness', 3: 'Craft' }

function decodeBridgeSnapshotV2(root) {
  const characterKey = cleanText(root?.characterKey, 400)
  const character = objectOrEmpty(root?.character)
  if (!characterKey || !character.identity) return null

  const i = packedFields(character.identity)
  const skills = objectOrEmpty(character.skills)
  const champion = objectOrEmpty(character.champion)

  const linesById = new Map()
  const lines = packedRows(skills.lines).map(record => {
    const h = packedFields(record)
    const line = {
      skillType: packedInt(h, 0, 0, 99),
      skillTypeName: '',
      skillLineId: packedInt(h, 1, 0, 99999),
      name: '',
      rank: packedInt(h, 2, 0, 50),
      abilities: []
    }
    if (line.skillLineId) linesById.set(line.skillLineId, line)
    return line
  })

  for (const record of packedRows(skills.abilities)) {
    const a = packedFields(record)
    const skillLineId = packedInt(a, 0, 0, 99999)
    const flags = packedInt(a, 6, 0, 3)
    const ability = {
      abilityId: packedInt(a, 1, 0, 9999999),
      baseAbilityId: 0,
      progressionId: packedInt(a, 2, 0, 9999999),
      name: '',
      currentRank: packedInt(a, 3, 0, 20),
      currentMorph: packedInt(a, 4, 0, 2),
      passiveRank: packedOptionalInt(a, 5, 0, 20),
      passiveMaxRank: null,
      isPassive: (flags & 1) !== 0,
      isUltimate: (flags & 2) !== 0
    }
    let line = linesById.get(skillLineId)
    if (!line && skillLineId) {
      line = { skillType: 0, skillTypeName: '', skillLineId, name: '', rank: 0, abilities: [] }
      linesById.set(skillLineId, line)
      lines.push(line)
    }
    if (line) line.abilities.push(ability)
  }

  const abilityByProgression = new Map()
  const abilityById = new Map()
  for (const line of lines) {
    for (const ability of line.abilities || []) {
      const enriched = { ...ability, skillLineId: line.skillLineId }
      if (ability.progressionId) abilityByProgression.set(ability.progressionId, enriched)
      for (const id of [ability.abilityId, ability.baseAbilityId]) if (id) abilityById.set(id, enriched)
    }
  }

  const actionBarsByCategory = new Map()
  for (const record of packedRows(skills.actionBars)) {
    const a = packedFields(record)
    const category = packedInt(a, 0, 0, 99)
    if (!actionBarsByCategory.has(category)) actionBarsByCategory.set(category, { category, label: category === 1 ? 'Backup' : 'Primary', slots: [] })
    const slot = {
      position: packedInt(a, 1, 0, 20),
      abilityId: packedInt(a, 2, 0, 9999999),
      slotType: packedInt(a, 3, 0, 99),
      isUltimate: packedBool(a, 4)
    }
    if (a[5]) slot.skillAbilityId = packedInt(a, 5, 0, 9999999)
    if (a[6]) slot.progressionId = packedInt(a, 6, 0, 9999999)
    if (a[7]) slot.skillLineId = packedInt(a, 7, 0, 99999)
    if (a[8]) slot.currentMorph = packedInt(a, 8, 0, 2)
    if (a[9]) slot.currentRank = packedInt(a, 9, 0, 20)
    const matched = (slot.progressionId && abilityByProgression.get(slot.progressionId))
      || (slot.skillAbilityId && abilityById.get(slot.skillAbilityId))
      || (slot.abilityId && abilityById.get(slot.abilityId))
    slot.name = matched?.name || (slot.abilityId ? `Ability ${slot.abilityId}` : 'Empty')
    slot.matchMethod = matched
      ? (slot.progressionId && abilityByProgression.has(slot.progressionId) ? 'progression-id'
        : slot.skillAbilityId && abilityById.has(slot.skillAbilityId) ? 'skill-ability-id' : 'ability-id')
      : ''
    actionBarsByCategory.get(category).slots.push(slot)
  }
  const actionBars = [...actionBarsByCategory.values()]
    .sort((a, b) => a.category - b.category)
    .map(bar => ({ ...bar, slots: bar.slots.sort((a, b) => a.position - b.position) }))

  const championById = new Map()
  const championDisciplines = packedRows(champion.disciplines).map(record => {
    const h = packedFields(record)
    const disciplineId = packedInt(h, 0, 0, 99)
    const discipline = {
      disciplineId,
      name: CHAMPION_DISCIPLINE_NAMES[disciplineId] || `Tree ${disciplineId || '?'}`,
      spent: packedInt(h, 1, 0, 1200),
      unspent: packedInt(h, 2, 0, 1200),
      stars: []
    }
    if (disciplineId) championById.set(disciplineId, discipline)
    return discipline
  })
  for (const record of packedRows(champion.stars)) {
    const a = packedFields(record)
    const disciplineId = packedInt(a, 0, 0, 99)
    const star = {
      skillId: packedInt(a, 1, 0, 9999999),
      name: '',
      points: packedInt(a, 2, 0, 500),
      maximumPoints: packedInt(a, 3, 0, 500),
      skillType: packedInt(a, 4, 0, 99),
      slottable: packedBool(a, 5)
    }
    let discipline = championById.get(disciplineId)
    if (!discipline && disciplineId) {
      discipline = { disciplineId, name: CHAMPION_DISCIPLINE_NAMES[disciplineId] || `Tree ${disciplineId}`, spent: 0, unspent: 0, stars: [] }
      championById.set(disciplineId, discipline)
      championDisciplines.push(discipline)
    }
    if (discipline) discipline.stars.push(star)
  }
  const championStars = new Map()
  for (const discipline of championDisciplines) for (const star of discipline.stars || []) if (star.skillId) championStars.set(star.skillId, star)

  const reducedFields = asArray(root.reducedFields).map(value => cleanText(value, 80))
  const droppedSections = asArray(root.droppedSections).map(value => cleanText(value, 80))
  const raw = {
    snapshotSchemaVersion: 2,
    dataProfile: 'near-live-bridge-v2',
    addonVersion: cleanText(root.addonVersion, 80),
    apiVersion: clampInt(root.apiVersion, 0, 999999, 0),
    capturedAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    captureReason: cleanText(root.captureReason || 'bridge', 120),
    identity: {
      characterKey,
      accountName: cleanText(i[0], 120),
      worldName: cleanText(i[1], 120),
      characterId: cleanText(i[2], 80),
      name: cleanText(i[3], 120),
      rawName: cleanText(i[3], 160),
      class: { id: packedInt(i, 4, 0, 9999), name: cleanText(i[5], 80) },
      race: { id: packedInt(i, 6, 0, 9999), name: cleanText(i[7], 80) },
      alliance: { id: packedInt(i, 8, 0, 9999), name: cleanText(i[9], 80) },
      level: packedInt(i, 10, 1, 50, 1),
      championPoints: packedInt(i, 11, 0, 10000),
      championPointsEarned: packedInt(i, 12, 0, 10000),
      progression: {
        availableAttributePoints: packedInt(i, 13, 0, 64),
        availableSkillPoints: packedInt(i, 14, 0, 10000)
      },
      attributes: {
        magicka: { spentPoints: packedInt(i, 15, 0, 64) },
        health: { spentPoints: packedInt(i, 16, 0, 64) },
        stamina: { spentPoints: packedInt(i, 17, 0, 64) }
      }
    },
    skills: {
      lines,
      actionBars,
      activeWeaponPair: (() => {
        const a = packedFields(skills.activeWeaponPair)
        return { pair: packedInt(a, 0, 0, 9), locked: packedBool(a, 1) }
      })()
    },
    equipment: {
      items: packedRows(character.equipment).map(record => {
        const a = packedFields(record)
        const setId = packedInt(a, 11, 0, 9999999)
        return {
          equipSlot: packedInt(a, 0, 0, 99),
          slotName: `Slot ${packedInt(a, 0, 0, 99)}`,
          itemId: packedInt(a, 1, 0, 999999999),
          name: cleanText(a[2], 180),
          quality: packedInt(a, 3, 0, 10),
          requiredLevel: packedInt(a, 4, 0, 50),
          requiredChampionPoints: packedInt(a, 5, 0, 3600),
          equipType: packedInt(a, 6, 0, 99),
          equipTypeName: '',
          itemType: packedInt(a, 7, 0, 99),
          itemTypeName: '',
          armorType: packedInt(a, 8, 0, 99),
          armorTypeName: '',
          weaponType: packedInt(a, 9, 0, 99),
          weaponTypeName: packedInt(a, 9, 0, 99) ? '' : 'None',
          trait: { id: packedInt(a, 10, 0, 999), name: '' },
          set: { hasSet: setId > 0, id: setId, name: cleanText(a[12], 160) },
          enchantment: { name: cleanText(a[13], 160) }
        }
      })
    },
    champion: {
      totalEarned: clampInt(champion.totalEarned, 0, 10000, 0),
      disciplines: championDisciplines,
      slotted: {
        supported: true,
        slots: packedRows(champion.slots).map(record => {
          const a = packedFields(record)
          const disciplineId = packedInt(a, 1, 0, 99)
          const skillId = packedInt(a, 2, 0, 9999999)
          return {
            position: packedInt(a, 0, 0, 20),
            disciplineId,
            disciplineName: CHAMPION_DISCIPLINE_NAMES[disciplineId] || `Tree ${disciplineId || '?'}`,
            skillId,
            name: championStars.get(skillId)?.name || (skillId ? `Star ${skillId}` : 'Empty')
          }
        })
      }
    },
    metadata: {
      firstSeenAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      lastSeenAt: clampInt(root.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      captureCount: 0,
      capturedSections: asArray(root.capturedSections).map(value => cleanText(value, 40))
    },
    diagnostics: { warnings: [], errors: [] },
    completeness: {
      isComplete: root.truncated !== true,
      source: 'near-live-bridge',
      truncated: root.truncated === true,
      budgetStatus: cleanText(root.budgetStatus, 40),
      estimatedBytes: clampInt(root.estimatedBytes, 0, 1024 * 1024, 0),
      budgetBytes: clampInt(root.budgetBytes, 0, 1024 * 1024, 0),
      reducedFields,
      droppedSections
    }
  }
  return { characterKey, raw }
}

function decodeBridgeSnapshot(root) {
  const schema = clampInt(root?.schemaVersion, 0, 999, 0)
  if (schema === 1) return decodeBridgeSnapshotV1(root)
  if (schema === 2) return decodeBridgeSnapshotV2(root)
  return null
}

function normalizeSnapshot(characterKey, raw, topLevel) {
  const safeCharacterKey = cleanText(characterKey, 400)
  const snapshot = objectOrEmpty(raw)
  const identity = objectOrEmpty(snapshot.identity)
  const progression = objectOrEmpty(identity.progression)
  const attributes = objectOrEmpty(identity.attributes)
  const classInfo = objectOrEmpty(identity.class)
  const raceInfo = objectOrEmpty(identity.race)
  const allianceInfo = objectOrEmpty(identity.alliance)
  const metadata = objectOrEmpty(snapshot.metadata)
  return {
    characterKey: safeCharacterKey,
    addonVersion: cleanText(snapshot.addonVersion || topLevel.addonVersion, 80),
    snapshotSchemaVersion: clampInt(snapshot.snapshotSchemaVersion, 0, 999, 0),
    dataProfile: cleanText(snapshot.dataProfile, 40),
    apiVersion: clampInt(snapshot.apiVersion || topLevel.apiVersion, 0, 999999, 0),
    capturedAt: clampInt(snapshot.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    captureReason: cleanText(snapshot.captureReason, 120),
    identity: {
      characterKey: safeCharacterKey,
      accountName: cleanText(identity.accountName, 120),
      worldName: cleanText(identity.worldName, 120),
      characterId: cleanText(identity.characterId, 80),
      name: cleanText(identity.name || identity.rawName, 120),
      rawName: cleanText(identity.rawName, 160),
      class: { id: clampInt(classInfo.id, 0, 9999, 0), name: cleanText(classInfo.name, 80) },
      race: { id: clampInt(raceInfo.id, 0, 9999, 0), name: cleanText(raceInfo.name, 80) },
      alliance: { id: clampInt(allianceInfo.id, 0, 9999, 0), name: cleanText(allianceInfo.name, 80) },
      level: clampInt(identity.level, 1, 50, 1),
      championPoints: clampInt(identity.championPoints, 0, 10000, 0),
      championPointsEarned: clampInt(identity.championPointsEarned, 0, 10000, 0),
      progression: {
        availableAttributePoints: clampInt(progression.availableAttributePoints, 0, 64, 0),
        availableSkillPoints: clampInt(progression.availableSkillPoints, 0, 10000, 0)
      },
      attributes: {
        magicka: { spentPoints: clampInt(attributes.magicka?.spentPoints, 0, 64, 0) },
        health: { spentPoints: clampInt(attributes.health?.spentPoints, 0, 64, 0) },
        stamina: { spentPoints: clampInt(attributes.stamina?.spentPoints, 0, 64, 0) }
      }
    },
    skills: {
      lines: asArray(snapshot.skills?.lines).map(line => ({
        skillType: clampInt(line?.skillType, 0, 99, 0),
        skillTypeName: cleanText(line?.skillTypeName, 80),
        skillLineId: clampInt(line?.skillLineId, 0, 99999, 0),
        name: cleanText(line?.name, 120),
        rank: clampInt(line?.rank, 0, 50, 0),
        abilities: asArray(line?.abilities).map(ability => ({
          abilityId: clampInt(ability?.abilityId, 0, 9999999, 0),
          baseAbilityId: clampInt(ability?.baseAbilityId, 0, 9999999, 0),
          progressionId: clampInt(ability?.progressionId, 0, 9999999, 0),
          name: cleanText(ability?.name, 160),
          currentRank: clampInt(ability?.currentRank, 0, 20, 0),
          currentMorph: clampInt(ability?.currentMorph, 0, 2, 0),
          passiveRank: ability?.passiveRank == null ? null : clampInt(ability.passiveRank, 0, 20, 0),
          passiveMaxRank: ability?.passiveMaxRank == null ? null : clampInt(ability.passiveMaxRank, 0, 20, 0),
          isPassive: ability?.isPassive === true,
          isUltimate: ability?.isUltimate === true
        }))
      })),
      actionBars: asArray(snapshot.skills?.actionBars),
      activeWeaponPair: objectOrEmpty(snapshot.skills?.activeWeaponPair)
    },
    equipment: { items: asArray(snapshot.equipment?.items) },
    champion: {
      totalEarned: clampInt(snapshot.champion?.totalEarned, 0, 10000, 0),
      // Coerce nested stars to an array too: an empty Lua stars table decodes to {} and the
      // reconciliation path iterates discipline.stars, so a bare object would throw there.
      disciplines: asArray(snapshot.champion?.disciplines).map(discipline => ({
        ...objectOrEmpty(discipline),
        stars: asArray(discipline?.stars)
      })),
      slotted: (() => {
        const slotted = objectOrEmpty(snapshot.champion?.slotted)
        return { ...slotted, slots: asArray(slotted.slots) }
      })()
    },
    metadata: {
      firstSeenAt: clampInt(metadata.firstSeenAt, 0, Number.MAX_SAFE_INTEGER, 0),
      lastSeenAt: clampInt(metadata.lastSeenAt, 0, Number.MAX_SAFE_INTEGER, 0),
      captureCount: clampInt(metadata.captureCount, 0, Number.MAX_SAFE_INTEGER, 0),
      capturedSections: asArray(metadata.capturedSections).map(value => cleanText(value, 40))
    },
    diagnostics: objectOrEmpty(snapshot.diagnostics),
    completeness: objectOrEmpty(snapshot.completeness)
  }
}

function liveCharacterState(snapshot) {
  const maps = catalogMaps()
  const identity = snapshot.identity
  const attributes = {
    magicka: identity.attributes.magicka.spentPoints,
    health: identity.attributes.health.spentPoints,
    stamina: identity.attributes.stamina.spentPoints
  }
  const skillRanks = {}
  const trackedLines = []
  const allocations = {}
  const completed = new Set()

  for (const rawLine of snapshot.skills.lines || []) {
    const line = matchCatalogLine(rawLine, maps, identity.class.name)
    if (!line) continue
    skillRanks[line.id] = clampInt(rawLine.rank, 0, line.max_rank || 50, 0)
    trackedLines.push(line.id)
    for (const rawAbility of rawLine.abilities || []) {
      const skill = maps.skillsByLineAndName.get(`${line.id}|${normalizeName(rawAbility.name)}`)
      if (!skill) continue
      let points = rawAbility.isPassive ? (rawAbility.passiveRank ?? rawAbility.currentRank ?? 0) : 1
      points = clampInt(points, 0, skill.max_points || 1, 0)
      if (!points) continue
      allocations[skill.id] = points
      completed.add(skill.id)
      if (skill.type === 'Morph' && skill.base_id) {
        allocations[skill.base_id] = Math.max(1, allocations[skill.base_id] || 0)
        completed.add(skill.base_id)
      }
    }
  }

  const cpById = new Map(asArray(snapshot.champion.disciplines).map(item => [Number(item?.disciplineId), item]))
  const treeTotal = id => {
    const item = cpById.get(id)
    return clampInt((Number(item?.spent) || 0) + (Number(item?.unspent) || 0), 0, 1200, 0)
  }

  return {
    name: identity.name || 'ESO Character',
    race: identity.race.name,
    alliance: identity.alliance.name,
    level: identity.level,
    attributes,
    cp_craft: treeTotal(3),
    cp_warfare: treeTotal(1),
    cp_fitness: treeTotal(2),
    skill_ranks: skillRanks,
    tracked_skill_lines: [...new Set(trackedLines)],
    skill_allocations: allocations,
    completed: [...completed],
    actual_unspent_skill_points: identity.progression.availableSkillPoints,
    actual_unspent_attribute_points: identity.progression.availableAttributePoints
  }
}


module.exports = {
  cleanText, clampInt, normalizeName, asArray, objectOrEmpty,
  decodeBridgeSnapshot, normalizeSnapshot, liveCharacterState
}
