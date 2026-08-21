'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
require('./electron-stub')

const { validateBuild, createGuidedBuildData } = require('../src/main/ipc/buildHandlers')
const { resolveBundled, isPrivateHost, assertPublicHostname, resolve } = require('../src/main/ipc/imageHandlers')

const BUILD_FILE = path.join(__dirname, '../resources/builds/stamina_arcanist_solo_duo.json')
const CATALOG = path.join(__dirname, '../resources/data/eso-skill-catalog.json')
const TEMPLATE_FILE = path.join(__dirname, '../docs/reference/BUILD_TEMPLATE.json')
const base = () => JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'))
const errorsFor = mutate => { const b = base(); mutate(b); return validateBuild(b) }
const matches = (errors, pattern) => errors.some(e => pattern.test(e))

test('all bundled builds are valid', () => {
  for (const f of fs.readdirSync(path.dirname(BUILD_FILE)).filter(f => f.endsWith('.json'))) {
    const errors = validateBuild(JSON.parse(fs.readFileSync(path.join(path.dirname(BUILD_FILE), f), 'utf8')))
    assert.deepEqual(errors, [], `${f} should be valid`)
  }
})

test('the in-app exported blank template is a valid Schema 4 build', () => {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_FILE, 'utf8'))
  assert.equal(template.schema_version, 4)
  assert.deepEqual(validateBuild(template), [])
})

test('explicit permanent build ids keep valid dots and underscores', () => {
  const build = createGuidedBuildData({ id: 'talia.live_build', name: 'Talia Live Build', class_name: 'Arcanist' }, 'Tester')
  assert.equal(build.id, 'talia.live_build')
  assert.deepEqual(validateBuild(build), [])
})

test('the Mighty Seven bundle contains exactly one build for every ESO class', () => {
  const dir = path.dirname(BUILD_FILE)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const builds = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  const expected = ['Arcanist', 'Dragonknight', 'Necromancer', 'Nightblade', 'Sorcerer', 'Templar', 'Warden']
  const actual = builds.map(b => b.defaults.class).sort()
  assert.equal(builds.length, 7, 'the launch bundle should contain seven JSON builds')
  assert.deepEqual(actual, expected)
  assert.equal(new Set(actual).size, 7, 'each class is represented exactly once')
})

test('every Mighty Seven build recommends exactly two Class Mastery choices', () => {
  const dir = path.dirname(BUILD_FILE)
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    const rows = build.unlock_order.filter(item => item.line.endsWith('_mastery') && item.status === 'final')
    assert.equal(rows.length, 2, `${f} should recommend exactly two final Class Mastery choices`)
    assert.ok(rows.every(item => item.kind === 'Passive' && item.required_rank === 1), `${f} mastery rows should be rank-one passives`)
  }
})


test('the bundled builds declare flexible PvE metadata and a usable default loadout', () => {
  const dir = path.dirname(BUILD_FILE)
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    assert.equal(build.schema_version, 4)
    assert.ok(build.metadata.roles.includes('damage'), `${file} needs a damage role`)
    assert.ok(build.metadata.content.includes('overland') && build.metadata.content.includes('dungeons'), `${file} needs solo and group-friendly content tags`)
    assert.equal(build.default_loadout_id, 'flexible-pve')
    assert.ok(build.loadouts.some(loadout => loadout.id === 'flexible-pve' && loadout.available !== false))
  }
})

test('every bundled build carries current research sources when exported', () => {
  const dir = path.dirname(BUILD_FILE)
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    assert.equal(build.verified_date, '2026-08-20', `${file} should state the current review date`)
    assert.ok(Array.isArray(build.sources) && build.sources.length >= 4, `${file} needs class, official, and CP research sources`)
    const hyperioxes = build.sources.find(source => /hyperioxes/i.test(source.author || source.title))
    const patch = build.sources.find(source => /Update 50 Live Patch Notes/.test(source.title))
    const cp = build.sources.find(source => /ESO Decoded.*Champion Points/i.test(source.title))
    assert.ok(hyperioxes && hyperioxes.accessed === '2026-08-20', `${file} needs a freshly reviewed class-specific build reference`)
    assert.ok(patch && patch.accessed === '2026-08-20', `${file} needs the freshly reviewed official patch reference`)
    assert.ok(cp && cp.accessed === '2026-08-20', `${file} needs the current CP catalog cross-check`)
    assert.ok(build.sources.every(source => /^https:\/\//.test(source.url) && /^2026-\d{2}-\d{2}$/.test(source.accessed || '')), `${file} source URLs and access dates must be complete`)
  }
})

test('every bundled progression phase provides attainable ultimate guidance', () => {
  const dir = path.dirname(BUILD_FILE)
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    for (const phase of build.phases) {
      assert.ok(phase.front_bar.ultimate?.name, `${file}/${phase.id} needs a front-bar ultimate`)
      if (phase.min_level >= 15) assert.ok(phase.back_bar.ultimate?.name, `${file}/${phase.id} needs a back-bar ultimate after weapon swap unlocks`)
      else assert.equal(phase.back_bar.ultimate, null, `${file}/${phase.id} should not pretend the locked back bar is usable`)
    }
  }
})

test('Schema 4 validates metadata, class-line rules, Scribing recipes, and loadouts', () => {
  assert.ok(matches(errorsFor(build => { delete build.metadata }), /metadata must be an object/))
  assert.ok(matches(errorsFor(build => { delete build.class_configuration }), /class_configuration must be an object/))
  assert.ok(matches(errorsFor(build => { build.class_configuration.active_class_lines = [] }), /must contain exactly three class skill lines/))
  assert.ok(matches(errorsFor(build => { build.class_configuration.active_class_lines = build.class_configuration.active_class_lines.slice(0, 2) }), /must contain exactly three class skill lines/))
  assert.ok(matches(errorsFor(build => {
    build.class_configuration.active_class_lines = [
      { line_id: 'herald', source_class: 'Arcanist', mode: 'native' },
      { line_id: 'ardent_flame', source_class: 'Dragonknight', mode: 'mastered' },
      { line_id: 'draconic_power', source_class: 'Dragonknight', mode: 'mastered' }
    ]
  }), /cannot use two lines from foreign class/))
  assert.ok(matches(errorsFor(build => {
    build.relevant_lines = build.relevant_lines.filter(line => line.id !== build.class_configuration.active_class_lines[0].line_id)
  }), /must also appear in relevant_lines/))
  assert.ok(matches(errorsFor(build => {
    build.scribed_skills = [{ id: 'bad_recipe', name: 'Bad Recipe', grimoire: 'Wield Soul', focus_script: '', signature_script: 'Damage Over Time', affix_script: 'Breach' }]
  }), /needs focus_script/))
  assert.ok(matches(errorsFor(build => { build.default_loadout_id = 'missing' }), /does not exist in loadouts/))
})

test('Schema 4 requires structured hotbars and grouped individual equipment pieces', () => {
  const build = base()
  assert.equal(build.schema_version, 4)
  assert.ok(build.metadata && build.class_configuration)
  assert.ok(Array.isArray(build.loadouts) && build.loadouts.length)
  for (const phase of build.phases) {
    assert.ok(Array.isArray(phase.front_bar.slots) && phase.front_bar.slots.length <= 5)
    assert.ok(Array.isArray(phase.back_bar.slots) && phase.back_bar.slots.length <= 5)
    assert.ok(['sequence', 'priority'].includes(phase.rotation.type))
  }
  for (const stage of build.gear_stages) {
    assert.ok(stage.sets.length > 0)
    assert.ok(stage.sets.every(set => set.source && set.pieces.length > 0))
  }
})

test('Schema 4 validates temporary unlock retirement rules', () => {
  assert.deepEqual(errorsFor(b => {
    const row = b.unlock_order.find(item => item.status === 'temporary')
    row.retire_when = { type: 'character_level', level: 30 }
  }), [])
  assert.ok(matches(errorsFor(b => {
    const row = b.unlock_order.find(item => item.status === 'temporary')
    row.retire_when = { type: 'character_level', level: 51 }
  }), /character-level retirement/))
  assert.ok(matches(errorsFor(b => {
    const row = b.unlock_order.find(item => item.status === 'temporary')
    row.retire_when = { type: 'skill_line_rank', line: 'missing_line', rank: 20 }
  }), /retirement line/))
  assert.ok(matches(errorsFor(b => {
    const row = b.unlock_order.find(item => item.status === 'temporary')
    row.retire_when = { type: 'unlock_completed', unlock_id: 'missing_unlock' }
  }), /retires after/))
  assert.ok(matches(errorsFor(b => {
    const row = b.unlock_order.find(item => item.status === 'final')
    row.retire_when = { type: 'character_level', level: 30 }
  }), /only valid for temporary unlocks/))
})

test('Schema 4 validates phase ids, progression ranges, hotbar skills, rotations, and acquisition metadata', () => {
  assert.ok(matches(errorsFor(b => { b.phases[1].id = b.phases[0].id }), /Duplicate phases id/))
  assert.ok(matches(errorsFor(b => { b.phases[0].min_level = 0 }), /min_level must be a whole character level/))
  assert.ok(matches(errorsFor(b => { b.phases[0].max_level = 0 }), /max_level must be a whole progression value/))
  assert.ok(matches(errorsFor(b => { b.phases[0].front_bar.slots[0].catalog_skill_id = 'missing_skill' }), /references unknown skill/))
  assert.ok(matches(errorsFor(b => { b.phases[0].rotation.steps[0].catalog_skill_id = 'missing_rotation_skill' }), /rotation references unknown skill/))
  assert.ok(matches(errorsFor(b => { b.phases[0].rotation.steps[0].name = '' }), /rotation.steps\[0\] needs a name/))
  assert.ok(matches(errorsFor(b => { delete b.gear_stages[0].sets[0].source.location }), /source.location is required/))
  assert.ok(matches(errorsFor(b => { delete b.gear_stages[0].sets[0].source.type }), /source.type is required/))
})

test('older pre-release build schemas are rejected', () => {
  const old = base(); old.schema_version = 2
  assert.ok(matches(validateBuild(old), /schema_version must be 4/))
})

test('missing required sections produce readable errors, not crashes', () => {
  assert.deepEqual(validateBuild(null), ['Root must be a JSON object.'])
  assert.deepEqual(validateBuild([]), ['Root must be a JSON object.'])
  const errors = validateBuild({})
  assert.ok(errors.length >= 6)
  assert.ok(matches(errors, /Missing id/))
  assert.ok(matches(errors, /unlock_order must be a non-empty array/))
})

test('required progression sections must contain usable data', () => {
  assert.ok(matches(errorsFor(b => { b.relevant_lines = [] }), /relevant_lines must be a non-empty array/))
  assert.ok(matches(errorsFor(b => { b.unlock_order = [] }), /unlock_order must be a non-empty array/))
  assert.ok(matches(errorsFor(b => { b.gear_stages = [] }), /gear_stages must be a non-empty array/))
})

test('optional build notes are plain text and bounded for safe JSON sharing', () => {
  const valid = base(); valid.notes = 'First paragraph.\n\nSecond paragraph with \"quotes\".'
  assert.deepEqual(validateBuild(valid), [])
  assert.ok(matches(errorsFor(b => { b.notes = { rich: 'text' } }), /notes must be a string/))
  assert.ok(matches(errorsFor(b => { b.notes = 'x'.repeat(20001) }), /notes must be 20,000 characters or fewer/))
})

test('sections the UI iterates over must be arrays when present', () => {
  assert.ok(matches(errorsFor(b => { b.phases = {} }), /phases must be a non-empty array|phases must be an array/))
  assert.ok(matches(errorsFor(b => { b.tips = 'nope' }), /tips must be an array/))
  assert.ok(matches(errorsFor(b => { b.concepts = 5 }), /concepts must be an array/))
})

test('a build must define at least one progression phase', () => {
  // Phases drive the Skill Bars and Rotations page, so an empty or missing phases array is invalid.
  assert.ok(matches(errorsFor(b => { b.phases = [] }), /phases must be a non-empty array/))
  assert.ok(matches(errorsFor(b => { delete b.phases }), /phases must be a non-empty array/))
})

test('a variant with array overrides is rejected before it can erase the build', () => {
  const errors = errorsFor(b => { b.variants[0].overrides = [] })
  assert.ok(matches(errors, /overrides must be an object or null/))
  assert.deepEqual(errorsFor(b => { b.variants[0].overrides = null }), [])
  assert.deepEqual(errorsFor(b => { b.variants[0].overrides = { summary: 'x' } }), [])
})

test('a full variant override is validated as an effective build', () => {
  const errors = errorsFor(b => {
    b.variants[0].overrides = {
      summary: 'Complete alternate loadout',
      defaults: { attributes: { magicka: 0, health: 20, stamina: 44 } },
      relevant_lines: b.relevant_lines,
      unlock_order: b.unlock_order,
      cp_plans: b.cp_plans,
      phases: b.phases,
      gear_stages: b.gear_stages,
      consumables: b.consumables,
      tips: b.tips
    }
  })
  assert.deepEqual(errors, [])
})

test('bad data inside a variant override is rejected before the character can select it', () => {
  const badCp = errorsFor(b => {
    b.variants[0].overrides = { cp_plans: { warfare: { core: [{ id: 'broken_star', max_points: 0 }] } } }
  })
  assert.ok(matches(badCp, /variant "solo-duo" with loadout "flexible-pve" effective build: CP node "broken_star" is not in the bundled Update 50 Champion Point catalog/))

  const badSkill = errorsFor(b => {
    b.variants[0].overrides = {
      unlock_order: [{
        id: 'broken_skill', name: 'Broken Skill', line: 'herald', kind: 'Active',
        status: 'final', catalog_skill_id: 'not_a_real_catalog_id'
      }]
    }
  })
  assert.ok(matches(badSkill, /variant "solo-duo" with loadout "flexible-pve" effective build: broken_skill: catalog_skill_id "not_a_real_catalog_id"/))
})

test('variants can explicitly clear optional display sections', () => {
  assert.deepEqual(errorsFor(b => { b.variants[0].overrides = { tips: null, concepts: null, consumables: null } }), [])
})

test('duplicate ids are caught', () => {
  assert.ok(matches(errorsFor(b => b.unlock_order.push({ ...b.unlock_order[0] })), /Duplicate unlock_order id/))
  assert.ok(matches(errorsFor(b => b.relevant_lines.push({ ...b.relevant_lines[0] })), /Duplicate relevant_lines id/))
  assert.ok(matches(errorsFor(b => b.cp_plans.warfare.core.push({ ...b.cp_plans.warfare.core[0] })), /Duplicate CP node id/))
})

test('dangling and circular requires are reported by name', () => {
  const dangling = errorsFor(b => { b.unlock_order[1].requires = ['does_not_exist'] })
  assert.ok(matches(dangling, /requires "does_not_exist", which does not exist/))

  const cyclic = errorsFor(b => {
    b.unlock_order[0].requires = [b.unlock_order[1].id]
    b.unlock_order[1].requires = [b.unlock_order[0].id]
  })
  assert.ok(matches(cyclic, /circular requires chain/))
})

test('an unlock row pointing at an undeclared skill line is caught', () => {
  assert.ok(matches(errorsFor(b => { b.unlock_order[0].line = 'ghost_line' }), /not in relevant_lines/))
})

test('display-critical build rows have readable names and all three CP plans', () => {
  assert.ok(matches(errorsFor(b => { delete b.relevant_lines[0].name }), /relevant_lines .* needs a name/))
  assert.ok(matches(errorsFor(b => { delete b.unlock_order[0].name }), /unlock_order .* needs a name/))
  assert.ok(matches(errorsFor(b => { delete b.unlock_order[0].line }), /needs a valid line id/))
  assert.ok(matches(errorsFor(b => { delete b.gear_stages[0].name }), /gear_stages .* needs a name/))
  assert.ok(matches(errorsFor(b => { delete b.variants[0].name }), /variants .* needs a name/))
  assert.ok(matches(errorsFor(b => { delete b.cp_plans.craft }), /cp_plans\.craft must be an object/))
  assert.ok(matches(errorsFor(b => { delete b.cp_plans.warfare.flex[0].label }), /needs a label/))
})

test('CP plans use canonical star ids, valid strategy points, and no more than four unique real final slots', () => {
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.core[0].id = 'not_a_real_cp_star' }), /not in the bundled Update 50 Champion Point catalog/))
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.core[0].first_pass_points = 999 }), /first_pass_points must be a whole number from 1 to/))
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.core[0].first_pass_points = 50; b.cp_plans.warfare.core[0].target_points = 25 }), /first_pass_points cannot exceed target_points/))
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.final_slots = ['nowhere'] }), /which is not one of its authored build targets/))
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.final_slots = 'not-an-array' }), /final_slots must be an array/))
  assert.ok(matches(errorsFor(b => { const id = b.cp_plans.warfare.final_slots[0]; b.cp_plans.warfare.final_slots = [id, id] }), /must not contain duplicate stars/))
  assert.ok(matches(errorsFor(b => { b.cp_plans.warfare.final_slots = b.cp_plans.warfare.final_slots.concat(['a', 'b', 'c', 'd']) }), /no more than four stars/))
  assert.ok(matches(errorsFor(b => {
    b.cp_plans.warfare.core.push({ id: 'precision', first_pass_points: 10, target_points: 20 })
    b.cp_plans.warfare.final_slots = ['precision']
  }), /canonical ESO catalog marks it passive/))
})

test('bundled image refs cannot escape the builds folder', () => {
  assert.equal(resolveBundled('../../../../etc/passwd'), null)
  assert.equal(resolveBundled('/etc/passwd'), null)
  assert.equal(resolveBundled('assets/../../../package.json'), null)
  assert.equal(resolveBundled('assets/../../package.json'), null)
  // A real asset still resolves.
  assert.ok(resolveBundled('assets/templar-shooting-star-icon.webp'))
})

test('non-image extensions inside the builds folder are refused', () => {
  const dir = path.join(__dirname, '../resources/builds')
  const probe = path.join(dir, '__probe.txt')
  fs.writeFileSync(probe, 'secret')
  try { assert.equal(resolveBundled('__probe.txt'), null) } finally { fs.rmSync(probe) }
})

test('private and loopback hosts are blocked for remote images', () => {
  for (const host of ['localhost', 'example.localhost', '127.0.0.1', '0.0.0.0', '10.0.0.5', '100.64.0.1', '192.168.1.10', '172.16.4.4', '169.254.1.1', '198.18.0.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fd00::1', 'printer.local']) {
    assert.equal(isPrivateHost(host), true, `${host} should be blocked`)
  }
  for (const host of ['example.com', '8.8.8.8', 'cdn.eso-hub.com']) {
    assert.equal(isPrivateHost(host), false, `${host} should be allowed`)
  }
})

test('hostname validation rejects local names before any image request', async () => {
  await assert.rejects(() => assertPublicHostname('localhost'), /local or private/)
  await assert.rejects(() => assertPublicHostname('printer.local'), /local or private/)
  await assert.rejects(() => assertPublicHostname('127.0.0.1'), /local or private/)
})

test('remote image redirects are handled manually so every destination is revalidated', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/ipc/imageHandlers.js'), 'utf8')
  assert.match(source, /redirect: 'manual'/)
  assert.match(source, /return fetchImage\(new URL\(location, target\)\.toString\(\), signal, redirects \+ 1\)/)
  assert.match(source, /await assertPublicHostname\(target\.hostname\)/)
})

test('remote images are off until the setting is switched on', async () => {
  const dbModule = require('../src/main/database/db')
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-img-'))
  dbModule.initialize(path.join(dir, 'attb.db'))
  try {
    assert.equal(await resolve('https://example.com/icon.png'), null, 'returns nothing rather than reaching the network')
    dbModule.getDb().prepare("INSERT INTO settings(key,value) VALUES('remote_images','true')").run()
    await assert.rejects(() => resolve('http://example.com/icon.png'), /Only https/)
    await assert.rejects(() => resolve('https://127.0.0.1/icon.png'), /local or private/)
  } finally { dbModule.close() }
})

test('data URLs require a safe image type whose bytes match its declaration', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgo='
  assert.equal(await resolve(png), png)
  assert.equal(await resolve('data:image/jpeg;base64,iVBORw0KGgo='), null, 'PNG bytes cannot masquerade as JPEG')
  assert.equal(await resolve('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), null, 'active SVG content is not accepted')
  assert.equal(await resolve('data:text/html;base64,PHNjcmlwdD4='), null)
  assert.equal(await resolve(''), null)
  assert.equal(await resolve(null), null)
})

test('the catalog itself is internally consistent', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
  const byId = new Map()
  for (const line of catalog.lines) for (const skill of line.skills || []) {
    assert.equal(byId.has(skill.id), false, `duplicate catalog skill id ${skill.id}`)
    byId.set(skill.id, { line, skill })
  }
  assert.equal(new Set(catalog.lines.map(l => l.id)).size, catalog.lines.length, 'line ids are unique')

  for (const line of catalog.lines) for (const skill of line.skills || []) {
    for (const morphId of skill.morph_ids || []) {
      const morph = byId.get(morphId)
      assert.ok(morph, `${skill.id} points at missing morph ${morphId}`)
      assert.equal(morph.skill.base_id, skill.id, `${morphId} does not point back at its base`)
      assert.equal(morph.skill.type, 'Morph')
      assert.equal(morph.line.id, line.id, 'morphs stay inside their own line')
    }
    if (skill.base_id) {
      const parent = byId.get(skill.base_id)
      assert.ok(parent, `${skill.id} has a missing base ${skill.base_id}`)
      assert.ok((parent.skill.morph_ids || []).includes(skill.id))
    }
    if (skill.type === 'Morph') assert.ok(skill.base_id, `${skill.id} is a morph with no base`)
    assert.ok(Number(skill.max_points) >= 0)
    assert.ok(catalog.categories.includes(line.group), `${line.group} is not a declared category`)
  }
})

test('every bundled build row resolves to a real catalog skill', () => {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
  const lines = new Map(catalog.lines.map(l => [l.id, l]))
  const norm = v => String(v).normalize('NFKD').replace(/[’‘]/g, "'").replace(/\b(?:I|II|III|IV|V)\b$/i, '').replace(/[^a-z0-9]+/gi, '').toLowerCase()
  const dir = path.dirname(BUILD_FILE)
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    for (const line of build.relevant_lines) assert.ok(lines.has(line.id), `${f}: line ${line.id} is not in the catalog`)
    for (const item of build.unlock_order) {
      const line = lines.get(item.line)
      const hit = (line.skills || []).filter(s => norm(s.name) === norm(item.name))
      assert.ok(hit.length > 0, `${f}: "${item.name}" does not match any skill in ${item.line}`)
    }
  }
})

test('gear pieces in bundled builds have unique stable ids and complete jewelry slots', () => {
  const dir = path.dirname(BUILD_FILE)
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    for (const stage of build.gear_stages) {
      const pieces = stage.sets.flatMap(set => set.pieces)
      const ids = pieces.map(p => p.id)
      assert.ok(ids.every(Boolean), `${f}/${stage.id} has a piece without an id`)
      assert.equal(new Set(ids).size, ids.length, `${f}/${stage.id} has duplicate piece ids`)
      const slots = new Set(pieces.map(piece => piece.slot))
      assert.ok(slots.has('Necklace') && slots.has('Ring 1') && slots.has('Ring 2'), `${f}/${stage.id} tracks all jewelry separately`)
    }
  }
})

test('CP optional branches require a real boolean flag', () => {
  assert.ok(errorsFor(b => { b.cp_plans.warfare.flex[0].optional = 'sometimes' }).some(e => /optional must be true or false/.test(e)))
  assert.deepEqual(errorsFor(b => { b.cp_plans.warfare.flex[0].optional = true }), [])
})
