import { resolveProgressionScope } from '../../shared/progressionScope.mjs'

const SECTION_ROUTES = {
  overview: '/build-editor/overview',
  character: '/build-editor/character-setup',
  class: '/build-editor/class-configuration',
  skills: '/build-editor/skills',
  leveling: '/build-editor/leveling',
  equipment: '/build-editor/equipment',
  champion: '/build-editor/champion-points',
  companions: '/build-editor/companions',
  loadouts: '/build-editor/loadouts',
  review: '/build-editor/review'
}

function routeForMessage(message = '') {
  const text = String(message).toLowerCase()
  if (/cp_plans|champion|final_slots|constellation/.test(text)) return { section: 'Champion Points', route: SECTION_ROUTES.champion }
  if (/gear_stages|gear stage|equipment|piece|set\s|source\./.test(text)) return { section: 'Equipment', route: SECTION_ROUTES.equipment }
  if (/companion/.test(text)) return { section: 'Companions', route: SECTION_ROUTES.companions }
  if (/loadout|variant|default_loadout/.test(text)) return { section: 'Loadouts & Variants', route: SECTION_ROUTES.loadouts }
  if (/phase|front_bar|back_bar|ultimate|rotation|milestone/.test(text)) return { section: 'Build Phases', route: SECTION_ROUTES.leveling }
  if (/unlock_order|catalog_skill|morph|passive|scribed|skill line|relevant_lines/.test(text)) return { section: 'Skills & Passives', route: SECTION_ROUTES.skills }
  if (/class_configuration|active_class_lines|mastery|subclass|base class/.test(text)) return { section: 'Class Configuration', route: SECTION_ROUTES.class }
  if (/defaults|attribute|race|alliance|mundus|weapon|armor|transformation|consumable|quickslot|requirement/.test(text)) return { section: 'Character Setup', route: SECTION_ROUTES.character }
  if (/metadata|progression_scope|starting_point|leveling_content_required|summary|author|game_version|verified_date|missing id|missing name|schema_version/.test(text)) return { section: 'Overview', route: SECTION_ROUTES.overview }
  return { section: 'Review & Save', route: SECTION_ROUTES.review }
}

function issue(severity, code, message, routeInfo, detail = '') {
  return {
    severity,
    code,
    message,
    detail,
    section: routeInfo.section,
    route: routeInfo.route
  }
}

function skillReferences(data = {}) {
  const refs = []
  for (const row of data.unlock_order || []) if (row?.catalog_skill_id) refs.push({ id: row.catalog_skill_id, where: 'Unlock Plan' })
  for (const phase of data.phases || []) {
    for (const barName of ['front_bar', 'back_bar']) {
      const bar = phase?.[barName]
      for (const slot of bar?.slots || []) if (slot?.catalog_skill_id) refs.push({ id: slot.catalog_skill_id, where: `${phase.name || phase.id} ${barName}` })
      if (bar?.ultimate?.catalog_skill_id) refs.push({ id: bar.ultimate.catalog_skill_id, where: `${phase.name || phase.id} ${barName} ultimate` })
    }
    for (const group of ['opening', 'steps', 'execute']) for (const row of phase?.rotation?.[group] || []) if (row?.catalog_skill_id) refs.push({ id: row.catalog_skill_id, where: `${phase.name || phase.id} rotation` })
  }
  return refs
}

function parseUpdate(value = '') {
  const match = String(value).match(/update\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

function dateAgeDays(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.floor((now.getTime() - parsed.getTime()) / 86400000)
}

export function createBuildReview(data = {}, catalog = {}, validationErrors = [], options = {}) {
  const errors = [...new Set(validationErrors || [])].map((message, index) => {
    const routeInfo = routeForMessage(message)
    return issue('error', `validation-${index + 1}`, message, routeInfo)
  })
  const warnings = []
  const suggestions = []
  const seen = new Set(errors.map(item => `${item.severity}:${item.message}`))
  const add = target => {
    const key = `${target.severity}:${target.message}`
    if (!seen.has(key)) { seen.add(key); (target.severity === 'warning' ? warnings : suggestions).push(target) }
  }

  const progressionScope = resolveProgressionScope(data)
  const catalogVersion = catalog.game_version || ''
  const buildVersion = data.game_version || ''
  const buildUpdate = parseUpdate(buildVersion)
  const catalogUpdate = parseUpdate(catalogVersion)
  if (!buildVersion) add(issue('warning', 'missing-game-version', 'The build does not identify the ESO game update it was reviewed for.', { section: 'Overview', route: SECTION_ROUTES.overview }, 'Set the game version before sharing the build.'))
  else if (catalogVersion && buildVersion !== catalogVersion) {
    const relation = buildUpdate && catalogUpdate ? (buildUpdate < catalogUpdate ? 'older than' : 'newer than') : 'different from'
    add(issue('warning', 'game-version-mismatch', `The build targets ${buildVersion}, which is ${relation} the bundled catalog (${catalogVersion}).`, { section: 'Patch Compatibility', route: SECTION_ROUTES.review }, 'Review skills, class rules, equipment, Champion Points, and patch-sensitive notes before marking the build current.'))
  }

  const age = dateAgeDays(data.verified_date, options.now || new Date())
  if (age === null) add(issue('warning', 'missing-verified-date', 'The build has no valid YYYY-MM-DD verification date.', { section: 'Overview', route: SECTION_ROUTES.overview }))
  else if (age > 365) add(issue('warning', 'stale-verification', `The build was last verified ${age} days ago.`, { section: 'Patch Compatibility', route: SECTION_ROUTES.review }, 'A fresh review is recommended before presenting this as current.'))

  const attrs = data.defaults?.attributes || {}
  const attrTotal = ['magicka', 'health', 'stamina'].reduce((sum, key) => sum + (Number(attrs[key]) || 0), 0)
  if (attrTotal < 64) add(issue('warning', 'unspent-attributes', `The final attribute target assigns ${attrTotal}/64 points.`, { section: 'Character Setup', route: SECTION_ROUTES.character }, 'This may be intentional for a leveling-only build, but final builds normally account for all 64 points.'))

  const unlockIds = new Set((data.unlock_order || []).map(row => row?.catalog_skill_id).filter(Boolean))
  const barCount = Number(data.metadata?.bar_count) || 2
  for (const phase of data.phases || []) {
    const phaseLabel = phase.name || phase.id || 'Unnamed phase'
    const minLevel = Number(phase.min_level) || 1
    if (!phase.front_bar?.ultimate?.catalog_skill_id) add(issue('warning', `front-ultimate-${phase.id}`, `${phaseLabel} has no front-bar ultimate selected.`, { section: 'Build Phases', route: SECTION_ROUTES.leveling }))
    if (barCount > 1 && minLevel >= 15 && !phase.back_bar?.ultimate?.catalog_skill_id) add(issue('warning', `back-ultimate-${phase.id}`, `${phaseLabel} has no back-bar ultimate selected.`, { section: 'Build Phases', route: SECTION_ROUTES.leveling }))
    if (barCount > 1 && minLevel < 15 && ((phase.back_bar?.slots || []).some(slot => slot?.catalog_skill_id) || phase.back_bar?.ultimate?.catalog_skill_id)) add(issue('warning', `early-backbar-${phase.id}`, `${phaseLabel} uses the back bar before level 15.`, { section: 'Build Phases', route: SECTION_ROUTES.leveling }))
    const steps = [...(phase.rotation?.opening || []), ...(phase.rotation?.steps || []), ...(phase.rotation?.execute || [])]
    if (!steps.length) add(issue('suggestion', `rotation-${phase.id}`, `${phaseLabel} has no rotation or priority steps.`, { section: 'Build Phases', route: SECTION_ROUTES.leveling }))
    for (const ref of skillReferences({ phases: [phase] })) if (!unlockIds.has(ref.id)) add(issue('warning', `unplanned-${phase.id}-${ref.id}`, `${phaseLabel} references ${ref.id}, but that skill is not in the Unlock Plan.`, { section: 'Skills & Passives', route: SECTION_ROUTES.skills }))
  }

  const skillMap = new Map((catalog.lines || []).flatMap(line => (line.skills || []).map(skill => [skill.id, skill])))
  const lineMap = new Map((catalog.lines || []).map(line => [line.id, line]))
  const refs = skillReferences(data)
  const missingSkills = [...new Set(refs.map(ref => ref.id).filter(id => !skillMap.has(id)))]
  const missingLines = [...new Set((data.relevant_lines || []).map(row => row?.id).filter(id => id && !lineMap.has(id)))]
  if (missingSkills.length) add(issue('warning', 'catalog-missing-skills', `${missingSkills.length} referenced skill ID${missingSkills.length === 1 ? ' is' : 's are'} missing from the bundled catalog.`, { section: 'Skills & Passives', route: SECTION_ROUTES.skills }, missingSkills.slice(0, 8).join(', ')))
  if (missingLines.length) add(issue('warning', 'catalog-missing-lines', `${missingLines.length} skill-line ID${missingLines.length === 1 ? ' is' : 's are'} missing from the bundled catalog.`, { section: 'Class Configuration', route: SECTION_ROUTES.class }, missingLines.join(', ')))

  if (!String(data.summary || '').trim() || String(data.summary || '').trim().length < 60) add(issue('suggestion', 'short-summary', 'Add a clearer build summary describing role, resource, content, and intended player.', { section: 'Overview', route: SECTION_ROUTES.overview }))
  if (!String(data.author || '').trim() || String(data.author).trim().toLowerCase() === 'npc') add(issue('suggestion', 'default-author', 'Replace the default NPC author name before sharing the build.', { section: 'Overview', route: SECTION_ROUTES.overview }))
  if (!(data.sources || []).length) add(issue('suggestion', 'missing-sources', 'Add research or patch-note sources used to verify the build.', { section: 'Overview', route: SECTION_ROUTES.overview }))
  if (progressionScope.leveling_content_required && (data.gear_stages || []).length < 3) add(issue('suggestion', 'gear-progression', 'Consider adding separate leveling, CP160 starter, and final gear stages.', { section: 'Equipment', route: SECTION_ROUTES.equipment }))
  for (const [tree, plan] of Object.entries(data.cp_plans || {})) if ((plan?.final_slots || []).length < 4) add(issue('suggestion', `cp-slots-${tree}`, `${tree[0].toUpperCase() + tree.slice(1)} has fewer than four final Champion Bar stars.`, { section: 'Champion Points', route: SECTION_ROUTES.champion }))
  if (!(data.variants || []).length) add(issue('suggestion', 'no-variants', 'Add a variant when the build has a common defensive, no-DLC, solo, boss, or group adjustment.', { section: 'Loadouts & Variants', route: SECTION_ROUTES.loadouts }))
  if (!(data.tips || []).length) add(issue('suggestion', 'no-tips', 'Add practical gameplay tips or warnings for players following the build.', { section: 'Overview', route: SECTION_ROUTES.overview }))

  const compatibility = {
    status: missingSkills.length || missingLines.length ? 'blocked' : !buildVersion || (catalogVersion && buildVersion !== catalogVersion) ? 'review' : 'current',
    buildVersion,
    catalogVersion,
    checkedSkillReferences: refs.length,
    checkedSkillLines: (data.relevant_lines || []).length,
    missingSkills,
    missingLines,
    verifiedDate: data.verified_date || ''
  }

  return { errors, warnings, suggestions, compatibility, valid: errors.length === 0 }
}

function stableKey(value, index) {
  if (value && typeof value === 'object') return value.id || value.catalog_skill_id || value.name || String(index)
  return String(index)
}

function summarize(value) {
  if (value === undefined) return 'Not set'
  if (value === null) return 'None'
  if (typeof value === 'string') return value.length > 90 ? `${value.slice(0, 87)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? '' : 's'}`
}

export function compareBuildData(before = {}, after = {}) {
  const changes = []
  const visit = (left, right, path = '') => {
    if (JSON.stringify(left) === JSON.stringify(right)) return
    if (Array.isArray(left) || Array.isArray(right)) {
      const a = Array.isArray(left) ? left : []
      const b = Array.isArray(right) ? right : []
      const aMap = new Map(a.map((value, index) => [stableKey(value, index), value]))
      const bMap = new Map(b.map((value, index) => [stableKey(value, index), value]))
      for (const key of new Set([...aMap.keys(), ...bMap.keys()])) {
        if (!aMap.has(key)) changes.push({ path: `${path}[${key}]`, kind: 'added', before: 'Not present', after: summarize(bMap.get(key)) })
        else if (!bMap.has(key)) changes.push({ path: `${path}[${key}]`, kind: 'removed', before: summarize(aMap.get(key)), after: 'Removed' })
        else visit(aMap.get(key), bMap.get(key), `${path}[${key}]`)
      }
      return
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) visit(left[key], right[key], path ? `${path}.${key}` : key)
      return
    }
    changes.push({ path: path || 'build', kind: left === undefined ? 'added' : right === undefined ? 'removed' : 'changed', before: summarize(left), after: summarize(right) })
  }
  visit(before, after)
  const groups = {}
  for (const row of changes) {
    const top = row.path.split(/[.[]/)[0] || 'build'
    groups[top] = (groups[top] || 0) + 1
  }
  return { changes, groups, total: changes.length }
}

export { SECTION_ROUTES }
