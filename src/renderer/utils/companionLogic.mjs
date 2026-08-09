export function companionPresets(catalog) {
  return (catalog?.companions || []).flatMap(companion => (companion.builds || []).map(build => ({ ...build, companion })))
}

export function companionPresetMap(catalog) {
  return new Map(companionPresets(catalog).map(entry => [entry.id, entry]))
}

export function presetToBuildCompanion(companion, preset) {
  return {
    id: preset.id,
    companion_id: companion.id,
    name: `${companion.short_name || companion.name} - ${preset.name}`,
    companion_name: companion.name,
    role: preset.role,
    summary: preset.summary || '',
    weapon: preset.weapon || '',
    armor_weight: preset.armor_weight || '',
    weapon_trait: preset.weapon_trait || '',
    armor_trait: preset.armor_trait || '',
    jewelry_trait: preset.jewelry_trait || '',
    skills: Array.isArray(preset.skills) ? [...preset.skills] : [],
    ultimate: preset.ultimate || '',
    equipment: Array.isArray(preset.equipment) ? [...preset.equipment] : [],
    notes: Array.isArray(preset.notes) ? [...preset.notes] : [],
    source_url: preset.source_url || '',
    preset_id: preset.id
  }
}

export function selectedCompanionTarget(character, companionId) {
  return character?.companion_progress?.targets?.[companionId] || ''
}

export function withCompanionTarget(progress, companionId, presetId) {
  const source = progress && typeof progress === 'object' && !Array.isArray(progress) ? progress : {}
  const targets = source.targets && typeof source.targets === 'object' && !Array.isArray(source.targets) ? source.targets : {}
  return { ...source, targets: { ...targets, [companionId]: presetId } }
}

export function buildCompanionTargets(build, companionId) {
  return (build?.companions || []).filter(entry => entry?.companion_id === companionId)
}
