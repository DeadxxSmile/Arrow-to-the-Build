'use strict'
const fs = require('fs')
const path = require('path')

let cache = null
function getCatalog() {
  if (cache) return cache
  try {
    cache = JSON.parse(fs.readFileSync(path.join(__dirname, '../../resources/data/eso-skill-catalog.json'), 'utf8'))
  } catch {
    cache = { lines: [], categories: [] }
  }
  return cache
}

function normalizeLineName(value = '') {
  return String(value).normalize('NFKD').replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/gi, '').toLowerCase()
}
// Ranked passives are written "Fated Fortune I" / "II", so the numeral is not part of the identity.
function normalizeSkillName(value = '') {
  return String(value).normalize('NFKD').replace(/[’‘]/g, "'")
    .replace(/\b(?:I|II|III|IV|V)\b$/i, '').replace(/[^a-z0-9]+/gi, '').toLowerCase()
}

let indexes = null
function getIndexes() {
  if (indexes) return indexes
  const catalog = getCatalog()
  const lineById = new Map()
  const lineIdByName = new Map()
  const skillById = new Map()
  const skillsByLineAndName = new Map()
  for (const line of catalog.lines || []) {
    lineById.set(line.id, line)
    lineIdByName.set(normalizeLineName(line.name), line.id)
    for (const skill of line.skills || []) {
      skillById.set(skill.id, { line, skill })
      const key = `${line.id}::${normalizeSkillName(skill.name)}`
      const list = skillsByLineAndName.get(key) || []
      list.push(skill)
      skillsByLineAndName.set(key, list)
    }
  }
  indexes = { lineById, lineIdByName, skillById, skillsByLineAndName }
  return indexes
}

function getLine(lineId) { return getIndexes().lineById.get(lineId) || null }
function getSkill(skillId) { return getIndexes().skillById.get(skillId) || null }
function lineIdForName(name) { return getIndexes().lineIdByName.get(normalizeLineName(name)) || null }

const KIND_TO_TYPE = { Active: 'Active', Ultimate: 'Ultimate', Morph: 'Morph', Passive: 'Passive', Scribing: 'Scribing' }

/**
 * Resolve one unlock row to a catalog skill. Returns { skill, source } or { error }.
 * `source` is 'id' when the row already carried catalog_skill_id and 'name' when it had to be
 * matched by display text, which is what tells the caller a legacy file needs normalizing.
 */
function resolveUnlockRow(row) {
  const label = row?.id || row?.name || 'unlock row'
  if (!getCatalog().lines?.length) return { error: 'The bundled skill catalog could not be read.' }
  const line = getLine(row?.line)
  if (!line) return { error: `${label}: skill line "${row?.line}" is not in the bundled catalog.` }

  if (row.catalog_skill_id) {
    const hit = getSkill(row.catalog_skill_id)
    if (!hit) return { error: `${label}: catalog_skill_id "${row.catalog_skill_id}" does not exist in the bundled catalog.` }
    if (hit.line.id !== line.id) return { error: `${label}: catalog_skill_id "${row.catalog_skill_id}" belongs to skill line "${hit.line.id}", not "${line.id}".` }
    const want = KIND_TO_TYPE[row.kind]
    if (want && hit.skill.type !== want) return { error: `${label}: kind "${row.kind}" does not match catalog type "${hit.skill.type}".` }
    return { skill: hit.skill, line: hit.line, source: 'id' }
  }

  // Old files only had display text. Match it once here so it can be saved back as an id.
  const matches = getIndexes().skillsByLineAndName.get(`${line.id}::${normalizeSkillName(row?.name)}`) || []
  if (!matches.length) return { error: `${label}: "${row?.name}" does not match any skill in "${line.id}", and the row has no catalog_skill_id.` }
  if (matches.length > 1) return { error: `${label}: "${row?.name}" is ambiguous in "${line.id}" (${matches.map(m => m.id).join(', ')}). Add catalog_skill_id to say which one.` }
  const want = KIND_TO_TYPE[row.kind]
  if (want && matches[0].type !== want) return { error: `${label}: "${row?.name}" resolves to a ${matches[0].type} in the catalog, but the row says kind "${row.kind}".` }
  return { skill: matches[0], line, source: 'name' }
}

module.exports = { getCatalog, getLine, getSkill, lineIdForName, resolveUnlockRow, normalizeSkillName, normalizeLineName, KIND_TO_TYPE }
