'use strict'

const { cleanText, clampInt, asArray, objectOrEmpty, decodeBridgeSnapshot, normalizeSnapshot } = require('./snapshotCodec')

// Merge helpers for enriching a fresh compact bridge snapshot with older durable archive metadata.
// These functions never read files or touch SQLite.

function enrichBridgeFromPrevious(raw, previousSnapshot, root) {
  if (!previousSnapshot || typeof previousSnapshot !== 'object') return raw
  const previous = normalizeSnapshot(previousSnapshot.characterKey || raw.identity?.characterKey || '', previousSnapshot, previousSnapshot)
  const dropped = new Set(asArray(root?.droppedSections).map(value => cleanText(value, 80)))
  const reduced = new Set(asArray(root?.reducedFields).map(value => cleanText(value, 80)))

  // Schema 2 is deliberately ID-first. The durable archive (or an earlier
  // enriched bridge snapshot) supplies human-readable metadata without ever
  // replacing fresher numeric/progression state from the bridge.
  raw.identity = raw.identity || {}
  raw.identity.class = { ...(raw.identity.class || {}), name: raw.identity.class?.name || previous.identity?.class?.name || '' }
  raw.identity.race = { ...(raw.identity.race || {}), name: raw.identity.race?.name || previous.identity?.race?.name || '' }
  raw.identity.alliance = { ...(raw.identity.alliance || {}), name: raw.identity.alliance?.name || previous.identity?.alliance?.name || '' }

  if (dropped.has('skills')) raw.skills = previous.skills
  else {
    const priorLines = previous.skills?.lines || []
    const priorLineById = new Map(priorLines.filter(line => line.skillLineId).map(line => [line.skillLineId, line]))
    const priorAbilityByProgression = new Map()
    const priorAbilityById = new Map()
    for (const line of priorLines) {
      for (const ability of line.abilities || []) {
        const entry = { ...ability, skillLineId: line.skillLineId }
        if (ability.progressionId) priorAbilityByProgression.set(ability.progressionId, entry)
        for (const id of [ability.abilityId, ability.baseAbilityId]) if (id) priorAbilityById.set(id, entry)
      }
    }

    raw.skills = raw.skills || { lines: [], actionBars: [], activeWeaponPair: {} }
    raw.skills.lines = (raw.skills.lines || []).map(line => {
      const priorLine = priorLineById.get(line.skillLineId)
      const abilities = (line.abilities || []).map(ability => {
        const priorAbility = (ability.progressionId && priorAbilityByProgression.get(ability.progressionId))
          || (ability.abilityId && priorAbilityById.get(ability.abilityId))
          || (ability.baseAbilityId && priorAbilityById.get(ability.baseAbilityId))
        return { ...ability, baseAbilityId: ability.baseAbilityId || priorAbility?.baseAbilityId || 0, passiveMaxRank: ability.passiveMaxRank ?? priorAbility?.passiveMaxRank ?? null, isPassive: ability.isPassive || priorAbility?.isPassive === true, isUltimate: ability.isUltimate || priorAbility?.isUltimate === true, name: ability.name || priorAbility?.name || '' }
      })
      return {
        ...line,
        skillTypeName: line.skillTypeName || priorLine?.skillTypeName || '',
        name: line.name || priorLine?.name || '',
        abilities
      }
    })

    const abilityByProgression = new Map()
    const abilityById = new Map()
    for (const line of raw.skills.lines || []) {
      for (const ability of line.abilities || []) {
        if (ability.progressionId) abilityByProgression.set(ability.progressionId, ability)
        for (const id of [ability.abilityId, ability.baseAbilityId]) if (id) abilityById.set(id, ability)
      }
    }
    const priorSlots = new Map()
    for (const bar of previous.skills?.actionBars || []) {
      for (const slot of bar.slots || []) priorSlots.set(`${bar.category}|${slot.position}`, slot)
    }
    raw.skills.actionBars = (raw.skills.actionBars || []).map(bar => ({
      ...bar,
      slots: (bar.slots || []).map(slot => {
        const ability = (slot.progressionId && abilityByProgression.get(slot.progressionId))
          || (slot.skillAbilityId && abilityById.get(slot.skillAbilityId))
          || (slot.abilityId && abilityById.get(slot.abilityId))
        const prior = priorSlots.get(`${bar.category}|${slot.position}`)
        const resolvedName = ability?.name || (slot.name && !/^Ability \d+$/.test(slot.name) ? slot.name : '') || prior?.name || (slot.abilityId ? `Ability ${slot.abilityId}` : 'Empty')
        return { ...slot, name: resolvedName }
      })
    }))
  }

  if (dropped.has('equipment')) raw.equipment = previous.equipment
  else {
    const priorItems = previous.equipment?.items || []
    raw.equipment = raw.equipment || { items: [] }
    raw.equipment.items = (raw.equipment.items || []).map(item => {
      // Equipment metadata belongs to a worn slot first, not to an item ID. Two
      // equipped copies of the same base item (for example matching dual-wield
      // daggers) legitimately share itemId, so matching by itemId first can
      // assign the front-hand label to both weapons. Prefer the exact equipSlot
      // and use itemId only as a compatibility fallback for snapshots that lack it.
      const hasEquipSlot = item.equipSlot !== null && item.equipSlot !== undefined && item.equipSlot !== ''
      const prior = (hasEquipSlot ? priorItems.find(candidate => candidate.equipSlot === item.equipSlot) : null)
        || priorItems.find(candidate => item.itemId && candidate.itemId === item.itemId)
      if (!prior) return item
      return {
        ...item,
        slotName: item.slotName && !/^Slot \d+$/.test(item.slotName) ? item.slotName : prior.slotName,
        name: item.name || prior.name,
        equipTypeName: item.equipTypeName || prior.equipTypeName,
        itemTypeName: item.itemTypeName || prior.itemTypeName,
        armorTypeName: item.armorTypeName || prior.armorTypeName,
        weaponTypeName: item.weaponTypeName || prior.weaponTypeName,
        trait: { ...item.trait, name: item.trait?.name || prior.trait?.name || '' },
        set: { ...item.set, name: item.set?.name || prior.set?.name || '' },
        enchantment: { ...item.enchantment, name: item.enchantment?.name || prior.enchantment?.name || '' }
      }
    })
  }

  raw.champion = raw.champion || { totalEarned: 0, disciplines: [], slotted: { supported: true, slots: [] } }
  if (dropped.has('champion-details')) {
    const priorByDiscipline = new Map((previous.champion?.disciplines || []).map(discipline => [discipline.disciplineId, discipline]))
    raw.champion.disciplines = (raw.champion.disciplines || []).map(discipline => ({
      ...discipline,
      stars: priorByDiscipline.get(discipline.disciplineId)?.stars || []
    }))
    raw.champion.slotted = previous.champion?.slotted || raw.champion.slotted
  } else {
    const priorStars = new Map()
    for (const discipline of asArray(previous.champion?.disciplines)) {
      for (const star of asArray(discipline?.stars)) if (star.skillId) priorStars.set(star.skillId, star)
    }
    for (const discipline of asArray(raw.champion.disciplines)) {
      discipline.stars = asArray(discipline.stars).map(star => ({ ...star, name: star.name || priorStars.get(star.skillId)?.name || '' }))
    }
    raw.champion.slotted = raw.champion.slotted || { supported: true, slots: [] }
    raw.champion.slotted.slots = asArray(raw.champion.slotted.slots).map(slot => ({
      ...slot,
      name: (slot.name && !/^Star \d+$/.test(slot.name) ? slot.name : '') || priorStars.get(slot.skillId)?.name || slot.name
    }))
  }

  // reduced is intentionally read even when the general metadata enrichment above
  // already restored names. Keeping these markers preserves compatibility with
  // schema-2 emergency reduction telemetry and future reduction stages.
  void reduced
  return raw
}

function bridgeRootAsArchive(root, previousSnapshot = null) {
  const decoded = decodeBridgeSnapshot(root)
  if (!decoded) return null
  const raw = enrichBridgeFromPrevious(decoded.raw, previousSnapshot, root)
  return {
    schemaVersion: 1,
    addonVersion: cleanText(root.addonVersion, 80),
    apiVersion: clampInt(root.apiVersion, 0, 999999, 0),
    revision: clampInt(root.revision, 0, Number.MAX_SAFE_INTEGER, 0),
    characters: { [decoded.characterKey]: raw }
  }
}


module.exports = { enrichBridgeFromPrevious, bridgeRootAsArchive }
