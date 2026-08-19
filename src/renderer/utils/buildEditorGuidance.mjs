import guidance from '#guidance' with { type: 'json' }
import { esoCatalog } from './catalogLogic.mjs'

export const buildEditorGuidance = guidance
export const classes = Object.keys(guidance.classes || {})
export const buildRoleOptions = ['damage', 'healer', 'tank', 'support', 'solo'].map(value => ({ value, label: guidance.roles?.[value]?.label || value }))
export const buildResourceOptions = [
  { value: 'magicka', label: 'Magicka' },
  { value: 'stamina', label: 'Stamina' },
  { value: 'health', label: 'Health-focused' },
  { value: 'hybrid', label: 'Hybrid' }
]
export const races = Object.keys(guidance.races || {})
export const normalClassLines = (esoCatalog.lines || []).filter(line => line.group === 'Class' && !/mastery/i.test(line.name))
export const classLines = className => normalClassLines.filter(line => line.class === className)
export const masteryLine = className => (esoCatalog.lines || []).find(line => line.group === 'Class' && line.class === className && /mastery/i.test(line.name))
export const resourceGuidance = resource => guidance.resources?.[resource] || guidance.resources?.hybrid || {}
export const roleGuidance = role => guidance.roles?.[role] || null
export const classGuidance = className => guidance.classes?.[className] || null
export const raceGuidance = race => guidance.races?.[race] || null
export const recommendedRace = (resource, role) => {
  const list = resourceGuidance(resource).races || []
  if (role === 'tank') return ['Nord', 'Imperial', 'Argonian'].find(name => list.includes(name)) || 'Nord'
  if (role === 'healer') return ['Breton', 'High Elf', 'Argonian', 'Khajiit'].find(name => races.includes(name)) || 'Breton'
  return list[0] || 'Dark Elf'
}
export function roleDefaults(role) { return guidance.role_defaults?.[role] || guidance.role_defaults?.damage || {} }
export function recommendedAttributes(resource) { return { magicka: 0, health: 0, stamina: 0, ...(resourceGuidance(resource).attributes || {}) } }
export function lineRecord(line) { return { id: line.id, name: line.name, max: Number(line.max_rank) || 50, group: line.group } }
function slug(value = '') { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'skill' }
function classStarterScaffold(className) {
  const lines = classLines(className)
  const activeSkills = lines.map(line => (line.skills || []).find(skill => skill.type === 'Active' && Number(skill.required_rank || 0) <= 1) || (line.skills || []).find(skill => skill.type === 'Active')).filter(Boolean)
  const ultimate = (lines[0]?.skills || []).find(skill => skill.type === 'Ultimate')
  return { lines, activeSkills, ultimate }
}
export function rebaseBuildClass(current, className) {
  const previousClass = current.defaults?.class || current.class_configuration?.base_class
  const oldLineIds = new Set(classLines(previousClass).map(line => line.id))
  const oldMastery = masteryLine(previousClass)?.id
  const { lines, activeSkills, ultimate } = classStarterScaffold(className)
  if (lines.length !== 3 || activeSkills.length !== 3 || !ultimate) throw new Error(`Cannot create a class scaffold for ${className}.`)
  const otherRelevant = (current.relevant_lines || []).filter(line => !oldLineIds.has(line.id) && line.id !== oldMastery)
  const otherUnlocks = (current.unlock_order || []).filter(row => !oldLineIds.has(row.line) && row.line !== oldMastery)
  const classUnlocks = [...activeSkills.map((skill, index) => ({
    id: slug(skill.name), name: skill.name, catalog_skill_id: skill.id, section: 'Class', line: lines[index].id,
    required_rank: Number(skill.required_rank) || 1, kind: 'Active', phase: 'Leveling', status: index === 0 ? 'final' : 'temporary',
    priority: (index + 1) * 10, notes: `Starter ${lines[index].name} skill after changing the base class.`, morph_from: null,
    image: null, requires: [], skill_point_cost: 1
  })), {
    id: slug(ultimate.name), name: ultimate.name, catalog_skill_id: ultimate.id, section: 'Class', line: lines[0].id,
    required_rank: Number(ultimate.required_rank) || 12, kind: 'Ultimate', phase: 'Leveling', status: 'temporary', priority: 40,
    notes: 'Starter class ultimate after changing the base class.', morph_from: null, image: null, requires: [], skill_point_cost: 1
  }]
  const slots = activeSkills.map(skill => ({ name: skill.name, catalog_skill_id: skill.id, temporary: true }))
  const ultimateRef = { name: ultimate.name, catalog_skill_id: ultimate.id, note: `Slot after ${lines[0].name} reaches rank ${Number(ultimate.required_rank) || 12}.`, temporary: true }
  const phases = (current.phases || []).map(phase => ({
    ...phase,
    front_bar: { ...(phase.front_bar || {}), slots, ultimate: ultimateRef },
    back_bar: phase.min_level >= 15 && Number(current.metadata?.bar_count || 2) === 2 ? { ...(phase.back_bar || {}), ultimate: { ...ultimateRef } } : { ...(phase.back_bar || {}), ultimate: null },
    rotation: { ...(phase.rotation || {}), steps: activeSkills.slice(0, 2).map(skill => ({ name: skill.name, catalog_skill_id: skill.id })) }
  }))
  return {
    ...current,
    defaults: { ...(current.defaults || {}), class: className },
    metadata: { ...(current.metadata || {}), class_style: 'pure_class' },
    class_configuration: {
      base_class: className,
      active_class_lines: lines.map(line => ({ line_id: line.id, source_class: className, mode: 'native', notes: [] })),
      class_mastery: { enabled: false, points_available: 2, choices: [], notes: ['Class Mastery is available only while all three active class lines are native.'] },
      notes: ['Class-specific starter fields were reset when the base class changed.']
    },
    relevant_lines: [...lines.map(lineRecord), ...otherRelevant].filter((line, index, rows) => rows.findIndex(row => row.id === line.id) === index),
    unlock_order: [...classUnlocks, ...otherUnlocks], phases
  }
}
