'use strict'

const catalogModule = require('../catalog')

// Pure normalization for the ESO SavedVariables archive payload.

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
function normalizePower(value) {
  const power = objectOrEmpty(value)
  return {
    current: clampInt(power.current, 0, 1000000, 0),
    maximum: clampInt(power.maximum, 0, 1000000, 0),
    effectiveMaximum: clampInt(power.effectiveMaximum, 0, 1000000, 0)
  }
}

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
      zone: {
        name: cleanText(identity.zone?.name, 160),
        index: clampInt(identity.zone?.index, 0, 99999, 0)
      },
      progression: {
        availableAttributePoints: clampInt(progression.availableAttributePoints, 0, 64, 0),
        availableSkillPoints: clampInt(progression.availableSkillPoints, 0, 10000, 0)
      },
      attributes: {
        magicka: {
          spentPoints: clampInt(attributes.magicka?.spentPoints, 0, 64, 0),
          power: normalizePower(attributes.magicka?.power)
        },
        health: {
          spentPoints: clampInt(attributes.health?.spentPoints, 0, 64, 0),
          power: normalizePower(attributes.health?.power)
        },
        stamina: {
          spentPoints: clampInt(attributes.stamina?.spentPoints, 0, 64, 0),
          power: normalizePower(attributes.stamina?.power)
        }
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
      graphSchemaVersion: clampInt(snapshot.champion?.graphSchemaVersion, 0, 99, 0),
      // Coerce nested stars to an array too: an empty Lua stars table decodes to {} and the
      // reconciliation path iterates discipline.stars, so a bare object would throw there.
      disciplines: asArray(snapshot.champion?.disciplines).map(discipline => ({
        ...objectOrEmpty(discipline),
        stars: asArray(discipline?.stars).map(star => ({
          ...objectOrEmpty(star),
          // ESO serializes an empty Lua table as `{}`. Keep list-shaped Champion
          // fields arrays even when they are empty so renderer routing/map code
          // never receives a truthy-but-non-iterable object.
          linkedSkillIds: asArray(star?.linkedSkillIds),
          jumpPoints: asArray(star?.jumpPoints)
        }))
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
  const skillMaxPoints = {}
  const completed = new Set()

  for (const rawLine of snapshot.skills.lines || []) {
    const line = matchCatalogLine(rawLine, maps, identity.class.name)
    if (!line) continue
    skillRanks[line.id] = clampInt(rawLine.rank, 0, line.max_rank || 50, 0)
    trackedLines.push(line.id)
    for (const rawAbility of rawLine.abilities || []) {
      const skill = maps.skillsByLineAndName.get(`${line.id}|${normalizeName(rawAbility.name)}`)
      if (!skill) continue
      const passiveMax = rawAbility.isPassive && Number(rawAbility.passiveMaxRank) > 0
        ? clampInt(rawAbility.passiveMaxRank, 1, 20, 1)
        : (rawAbility.isPassive && Number(rawAbility.currentRank) === 0 && rawAbility.passiveRank == null ? 1 : 0)
      if (passiveMax) skillMaxPoints[skill.id] = passiveMax
      // The addon only serializes purchased abilities. ESO reports some granted/inherent passives
      // (racial starters, armor bonuses/penalties, guild unlocks, etc.) with rank 0 and no upgrade
      // metadata. Presence still means the passive is unlocked, so do not drop it as "0 points".
      let points = rawAbility.isPassive
        ? (Number(rawAbility.passiveRank) > 0 ? rawAbility.passiveRank
          : Number(rawAbility.currentRank) > 0 ? rawAbility.currentRank
          : 1)
        : 1
      points = clampInt(points, 0, passiveMax || skill.max_points || 1, 0)
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
    skill_max_points: skillMaxPoints,
    completed: [...completed],
    actual_unspent_skill_points: identity.progression.availableSkillPoints,
    actual_unspent_attribute_points: identity.progression.availableAttributePoints
  }
}


module.exports = {
  cleanText, clampInt, normalizeName, asArray, objectOrEmpty,
  normalizeSnapshot, liveCharacterState
}
