'use strict'

const path = require('path')
const { scopeForStartingPoint } = require('../../shared/progressionScope.cjs')

// Pure guided-build scaffold generation. Draft persistence and IPC remain in buildHandlers.js.
// Runtime dependencies are injected so this module stays independent of SQLite and Electron.
function createGuidedBuildCreation(deps) {
  const { catalog, CURRENT_SCHEMA_VERSION, readJsonFile, getBuildEditorGuidance, badId, uniqueBuildId, slugify, isObj } = deps

  function normalClassLines(className) {
    return (catalog.getCatalog().lines || []).filter(line => line.group === 'Class' && line.class === className && !/mastery/i.test(line.name))
  }
  function lineRecord(line) { return { id: line.id, name: line.name, max: Number(line.max_rank) || 50, group: line.group } }
  function weaponLineId(name = '') {
    if (/dual/i.test(name)) return 'dual_wield'
    if (/two.?hand/i.test(name)) return 'two_handed'
    if (/bow/i.test(name)) return 'bow'
    if (/shield/i.test(name)) return 'one_hand_and_shield'
    if (/restoration/i.test(name)) return 'restoration_staff'
    if (/staff/i.test(name)) return 'destruction_staff'
    return null
  }
  function createGuidedBuildData(options = {}, author = 'NPC') {
    const template = readJsonFile(path.join(__dirname, '../../../docs/reference/BUILD_TEMPLATE.json'), 'ATTB build template')
    const guidance = getBuildEditorGuidance()
    const className = String(options.class_name || 'Arcanist')
    const lines = normalClassLines(className)
    if (lines.length !== 3) throw new Error(`The bundled catalog does not contain exactly three normal class lines for ${className}.`)
    const role = String(options.primary_role || 'damage')
    const legacyScope = String(options.leveling_scope || '')
    const startingPoint = String(options.starting_point || (legacyScope === 'endgame' ? 'cp160_plus' : 'new_character'))
    const scopeDescriptions = {
      new_character: 'Designed to guide a character from initial leveling through the final target.',
      level_50: 'Designed for an existing Level 50 character transitioning toward CP160 and the final target.',
      cp160_plus: 'Designed for an existing Level 50 / CP160+ character changing or refining an established build; 1-50 leveling content is intentionally not required.'
    }
    const progressionScope = scopeForStartingPoint(startingPoint, String(options.progression_scope_description || scopeDescriptions[startingPoint] || scopeDescriptions.new_character))
    const roleDefaults = guidance.role_defaults?.[role] || guidance.role_defaults?.damage || {}
    const resource = String(options.resource || roleDefaults.resource || 'stamina')
    const resourceHelp = guidance.resources?.[resource] || guidance.resources?.hybrid || {}
    const name = String(options.name || '').trim() || `${className} ${role} Build`
    const requestedId = String(options.id || '').trim()
    if (requestedId && badId(requestedId)) throw new Error('Permanent build ID must use only letters, numbers, dot, dash, or underscore and cannot begin with punctuation.')
    const id = requestedId || uniqueBuildId(name)
    const race = String(options.race || resourceHelp.races?.[0] || 'Dark Elf')
    const alliance = String(options.alliance || guidance.races?.[race]?.alliance || 'Any Alliance')
    const frontWeapon = String(options.front_weapon || resourceHelp.front_weapons?.[0] || 'Dual Daggers')
    const backWeapon = Number(options.bar_count || roleDefaults.bar_count || 2) === 1 ? 'One-bar setup' : String(options.back_weapon || resourceHelp.back_weapons?.[0] || 'Inferno Staff')
    const attributes = { magicka: 0, health: 0, stamina: 0, ...(resourceHelp.attributes || {}) }
    const content = Array.isArray(options.content) && options.content.length ? options.content : (roleDefaults.content || ['overland', 'dungeons'])
    const groupSizes = Array.isArray(options.group_sizes) && options.group_sizes.length ? options.group_sizes : (roleDefaults.group_sizes || ['solo', '4-player'])
    const barCount = Number(options.bar_count || roleDefaults.bar_count || 2) === 1 ? 1 : 2
    const activeSkills = lines.map(line => (line.skills || []).find(skill => skill.type === 'Active' && Number(skill.required_rank || 0) <= 1) || (line.skills || []).find(skill => skill.type === 'Active')).filter(Boolean)
    const ultimate = (lines[0].skills || []).find(skill => skill.type === 'Ultimate')
    if (activeSkills.length !== 3 || !ultimate) throw new Error(`The bundled catalog cannot seed starter skills for ${className}.`)
    const scaffoldPhaseLabel = progressionScope.leveling_content_required ? 'Leveling' : 'Build scaffold'
    const unlocks = [...activeSkills.map((skill, index) => ({
      id: slugify(skill.name), name: skill.name, catalog_skill_id: skill.id, section: 'Class', line: lines[index].id,
      required_rank: Number(skill.required_rank) || 1, kind: 'Active', phase: scaffoldPhaseLabel, status: index === 0 ? 'final' : 'temporary',
      priority: (index + 1) * 10, notes: `Starter ${lines[index].name} skill. Replace or morph it as the build develops.`, morph_from: null,
      image: null, requires: [], skill_point_cost: 1
    })), {
      id: slugify(ultimate.name), name: ultimate.name, catalog_skill_id: ultimate.id, section: 'Class', line: lines[0].id,
      required_rank: Number(ultimate.required_rank) || 12, kind: 'Ultimate', phase: scaffoldPhaseLabel, status: 'temporary', priority: 40,
      notes: 'Starter class ultimate. Replace it when the final build has a better ultimate plan.', morph_from: null, image: null,
      requires: [], skill_point_cost: 1
    }]
    const slots = activeSkills.map(skill => ({ name: skill.name, catalog_skill_id: skill.id, temporary: true }))
    const ultimateRef = { name: ultimate.name, catalog_skill_id: ultimate.id, note: `Slot after ${lines[0].name} reaches rank ${Number(ultimate.required_rank) || 12}.`, temporary: true }
    const firstRotation = activeSkills.slice(0, 2).map(skill => ({ name: skill.name, catalog_skill_id: skill.id }))
    template.id = id
    template.name = name
    template.short_name = String(options.short_name || name).slice(0, 60)
    template.author = String(author || options.author || '').trim() || 'NPC'
    template.game_version = catalog.getCatalog().game_version || 'Update 50'
    template.verified_date = new Date().toISOString().slice(0, 10)
    template.summary = String(options.summary || `A guided ${resource} ${role} build for ${className}, ready for detailed skill, phase, gear, and Champion Point planning.`)
    template.progression_scope = progressionScope
    template.defaults = {
      ...(template.defaults || {}), class: className, race, alliance, eso_plus: !!options.eso_plus, attributes,
      mundus: String(options.mundus || roleDefaults.mundus || resourceHelp.mundus?.[0] || 'The Thief'), front_weapon: frontWeapon,
      back_weapon: backWeapon,
      leveling_armor: String(options.leveling_armor || (progressionScope.leveling_content_required ? (resourceHelp.armor || 'Mixed training armor') : (resourceHelp.armor || 'Use current gear while assembling permanent pieces'))),
      endgame_armor: String(options.endgame_armor || resourceHelp.armor || 'Role-appropriate armor'),
      leveling_trait: String(options.leveling_trait || (progressionScope.leveling_content_required ? 'Training' : 'Match the final gear target on permanent pieces')),
      gear_cap: progressionScope.starting_point === 'cp160_plus' ? 'CP160+' : 'Level 50 / CP160', role, resource, curse: 'none'
    }
    template.metadata = {
      roles: [...new Set([role, ...(role === 'damage' ? [] : ['support'])])], content: [...new Set(content)], group_sizes: [...new Set(groupSizes)],
      resource, bar_count: barCount, class_style: String(options.class_style || 'pure_class'), playstyles: ['guided', progressionScope.starting_point === 'new_character' ? 'progression' : progressionScope.starting_point === 'level_50' ? 'level-50-transition' : 'endgame'],
      difficulty: ['normal', 'veteran'], platforms: ['PC', 'Xbox', 'PlayStation'], language: 'en',
      tags: [...new Set([slugify(className), resource, role, 'guided-build'])]
    }
    template.class_configuration = {
      base_class: className,
      active_class_lines: lines.map(line => ({ line_id: line.id, source_class: className, mode: 'native', notes: [] })),
      class_mastery: { enabled: false, points_available: 2, choices: [], notes: ['Class Mastery is available only while all three active class lines are native.'] },
      notes: [options.class_style === 'flexible' ? 'Pure-class scaffold created for a build that may add subclass alternatives later.' : 'Pure-class guided starting configuration.']
    }
    const extraLineIds = [weaponLineId(frontWeapon), weaponLineId(backWeapon), resource === 'magicka' ? 'light_armor' : resource === 'health' ? 'heavy_armor' : 'medium_armor'].filter(Boolean)
    template.relevant_lines = [...lines.map(lineRecord), ...extraLineIds.map(id => catalog.getLine(id)).filter(Boolean).map(lineRecord)]
      .filter((line, index, rows) => rows.findIndex(item => item.id === line.id) === index)
    template.unlock_order = unlocks
    if (progressionScope.starting_point === 'new_character') {
      template.phases = [{
        id: '1-14', label: 'Levels 1-14', min_level: 1, max_level: 14,
        overview: 'Open all three class lines, learn the starter resource loop, and begin training the chosen front-bar weapon.',
        attributes: { ...attributes }, recommended_gear_stage_ids: ['leveling'], milestones: ['Keep one skill from each active class line on the bar when experience is awarded.'],
        front_bar: { weapon: frontWeapon, slots, ultimate: ultimateRef },
        back_bar: { weapon: backWeapon, locked: 'Unlocks at character level 15', slots: [], ultimate: null },
        rotation: { type: 'priority', title: 'Starter priority', summary: 'Use the starter skills while learning their resources and effects.', opener: [], steps: firstRotation, execute: [], notes: ['Replace this with the final rotation as the build develops.'] }
      }, {
        id: '15-plus', label: 'Level 15+', min_level: 15, max_level: 9999,
        overview: barCount === 1 ? 'Continue the one-bar setup and begin replacing temporary starter skills.' : 'Unlock weapon swapping, establish both bars, and begin replacing temporary starter skills.',
        attributes: { ...attributes }, recommended_gear_stage_ids: ['leveling', 'cp160-starter'], milestones: barCount === 1 ? ['Confirm the build intentionally remains one bar.'] : ['Unlock weapon swapping and train the back-bar weapon line.'],
        front_bar: { weapon: frontWeapon, slots, ultimate: ultimateRef },
        back_bar: barCount === 1 ? { weapon: 'One-bar setup', locked: 'This build intentionally uses one active bar', slots: [], ultimate: null } : { weapon: backWeapon, slots: [], ultimate: { ...ultimateRef } },
        rotation: { type: 'priority', title: 'Developing priority', summary: 'Maintain important effects, then use the build’s main repeatable action.', opener: [], steps: firstRotation, execute: [], notes: ['Add final skills and a complete priority or sequence in the Build Phases editor.'] }
      }]
    } else {
      const level50Transition = progressionScope.starting_point === 'level_50'
      template.gear_stages = (template.gear_stages || []).filter(stage => stage.id !== 'leveling')
      const targetStage = (template.gear_stages || []).find(stage => stage.id === 'cp160-starter')
      if (targetStage) targetStage.name = level50Transition ? 'Level 50 / CP160 Transition' : 'CP160+ Target'
      template.phases = [{
        id: level50Transition ? '50-cp160' : 'cp160-plus',
        label: level50Transition ? 'Level 50 / CP160 Transition' : 'CP160+ Target',
        min_level: 50, max_level: 9999,
        min_cp: level50Transition ? 0 : 160, max_cp: level50Transition ? 159 : 3600,
        overview: level50Transition
          ? 'Start from an existing Level 50 character, finish the CP160 transition, and replace scaffold choices with the authored target.'
          : 'Start from an existing CP160+ character and author only the transition, bridge, or final setup this build actually needs.',
        attributes: { ...attributes }, recommended_gear_stage_ids: ['cp160-starter'],
        milestones: level50Transition ? ['Reach CP160 before investing heavily in permanent gear.'] : ['Replace scaffold choices with the final build target.'],
        front_bar: { weapon: frontWeapon, slots, ultimate: ultimateRef },
        back_bar: barCount === 1 ? { weapon: 'One-bar setup', locked: 'This build intentionally uses one active bar', slots: [], ultimate: null } : { weapon: backWeapon, slots: [], ultimate: { ...ultimateRef } },
        rotation: { type: 'priority', title: level50Transition ? 'Transition priority' : 'Target priority', summary: 'Maintain important effects, then use the build’s main repeatable action.', opener: [], steps: firstRotation, execute: [], notes: ['Replace scaffold skills and combat notes with the authored target.'] }
      }]
    }
    const enchantment = resource === 'magicka' ? 'Max Magicka' : resource === 'health' ? 'Max Health' : resource === 'hybrid' ? 'Tri-Stat' : 'Max Stamina'
    for (const stage of template.gear_stages || []) for (const set of stage.sets || []) for (const piece of set.pieces || []) {
      if (piece.enchantment && /Max (?:Stamina|Magicka|Health)/i.test(piece.enchantment)) piece.enchantment = enchantment
    }
    template.concepts = [
      { title: 'Primary role', text: guidance.roles?.[role]?.summary || `This build is planned as ${role}.` },
      { title: 'Primary resource', text: resourceHelp.summary || `This build is planned around ${resource}.` }
    ]
    template.tips = ['Use the contextual guidance as a starting point, not a rule.', progressionScope.leveling_content_required ? 'Replace temporary starter skills as the final build takes shape.' : 'Replace scaffold choices with the existing character’s actual target rather than inventing 1-50 history.', 'Keep the game version and verification date current when sharing the build.']
    template.loadouts = [{ id: 'base', name: 'Base Setup', summary: 'The primary guided setup.', roles: [role], content: [...new Set(content)], available: true, conditions: [], overrides: {} }]
    template.default_loadout_id = 'base'
    template.variants = [{ id: 'base', name: 'Base', summary: 'The primary guided setup.', available: true, overrides: null, loadout_ids: ['base'] }]
    template.extensions = isObj(template.extensions) ? template.extensions : {}
    template.extensions.attb = { ...(isObj(template.extensions.attb) ? template.extensions.attb : {}), editor_origin: 'guided', guidance_version: guidance.schema_version || 1 }
    return template
  }

  return { normalClassLines, lineRecord, createGuidedBuildData }
}

module.exports = { createGuidedBuildCreation }
