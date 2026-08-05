'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// These guard the properties a game update must not accidentally break. They read the shipped catalog
// directly, so they hold whether it was regenerated from the Python tool or hand-edited.
const catalogPath = path.join(__dirname, '../resources/data/eso-skill-catalog.json')
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const allSkills = catalog.lines.flatMap(line => (line.skills || []).map(skill => ({ line, skill })))
const byId = new Map(allSkills.map(({ skill }) => [skill.id, skill]))

test('the catalog states its version and the ESO update it reflects', () => {
  assert.ok(catalog.catalog_version, 'catalog_version is required so drift is visible')
  assert.ok(catalog.game_version, 'game_version is required so builds can be matched to a patch')
  assert.ok(catalog.verified_date, 'verified_date records when it was last checked')
})

test('every skill line id is unique', () => {
  const seen = new Set()
  for (const line of catalog.lines) {
    assert.ok(line.id, 'a skill line has no id')
    assert.equal(seen.has(line.id), false, `duplicate skill line id "${line.id}"`)
    seen.add(line.id)
  }
})

test('every skill id is unique and shaped like line__slug', () => {
  const seen = new Set()
  for (const { line, skill } of allSkills) {
    assert.equal(seen.has(skill.id), false, `duplicate skill id "${skill.id}"`)
    seen.add(skill.id)
    // Ids are the permanent contract with build files, so the shape must stay stable.
    assert.match(skill.id, /^[a-z0-9]+(?:_[a-z0-9]+)*__[a-z0-9]+(?:_[a-z0-9]+)*$/, `skill id "${skill.id}" is not line__slug`)
    assert.ok(skill.id.startsWith(line.id + '__'), `skill "${skill.id}" is not prefixed with its line "${line.id}"`)
  }
})

test('every morph points back at its base, and every base lists its morphs', () => {
  for (const { skill } of allSkills) {
    if (skill.base_id) {
      const base = byId.get(skill.base_id)
      assert.ok(base, `morph "${skill.id}" references missing base "${skill.base_id}"`)
      assert.ok((base.morph_ids || []).includes(skill.id), `base "${base.id}" does not list its morph "${skill.id}"`)
    }
    for (const morphId of skill.morph_ids || []) {
      const morph = byId.get(morphId)
      assert.ok(morph, `skill "${skill.id}" lists missing morph "${morphId}"`)
      assert.equal(morph.base_id, skill.id, `morph "${morphId}" does not point back at base "${skill.id}"`)
    }
  }
})

test('a base ability has either zero or exactly two morphs, as ESO uses', () => {
  for (const { skill } of allSkills) {
    const count = (skill.morph_ids || []).length
    assert.ok(count === 0 || count === 2, `"${skill.id}" has ${count} morphs; ESO abilities have 0 or 2`)
  }
})

test('every skill has a whole max_points, positive except tracking-only Scribing', () => {
  for (const { skill } of allSkills) {
    assert.ok(Number.isInteger(skill.max_points), `"${skill.id}" has a non-integer max_points`)
    // Scribing entries are tracking-only and cost no skill points, so 0 is expected there.
    if (skill.type === 'Scribing') assert.ok(skill.max_points >= 0, `"${skill.id}" max_points is negative`)
    else assert.ok(skill.max_points > 0, `"${skill.id}" needs a positive max_points`)
  }
})

test('every skill type is one the app understands', () => {
  const known = new Set(['Active', 'Ultimate', 'Morph', 'Passive', 'Scribing'])
  for (const { skill } of allSkills) {
    assert.ok(known.has(skill.type), `"${skill.id}" has unknown type "${skill.type}"`)
    // Only morphs carry a base; only actives and ultimates carry morphs.
    if (skill.type === 'Morph') assert.ok(skill.base_id, `morph "${skill.id}" has no base_id`)
    else assert.equal(skill.base_id, null, `${skill.type} "${skill.id}" should not have a base_id`)
    if ((skill.morph_ids || []).length) assert.ok(['Active', 'Ultimate'].includes(skill.type), `"${skill.id}" is a ${skill.type} but has morphs`)
  }
})

test('class lines declare their class so build switching can keep the right ones', () => {
  for (const line of catalog.lines) {
    if (line.group === 'Class') assert.ok(line.class, `class line "${line.id}" is missing its class name`)
  }
})

test('every bundled build resolves entirely against this catalog', () => {
  // The whole point of stable ids: a build must never reference a skill the catalog does not have.
  const buildsDir = path.join(__dirname, '../resources/builds')
  for (const file of fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(buildsDir, file), 'utf8'))
    for (const row of build.unlock_order || []) {
      assert.ok(byId.has(row.catalog_skill_id), `${file}: "${row.id}" references missing catalog id "${row.catalog_skill_id}"`)
    }
  }
})
