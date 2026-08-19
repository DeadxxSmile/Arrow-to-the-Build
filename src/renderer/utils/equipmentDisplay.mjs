export function liveEquipmentGroup(item = {}) {
  const slot = String(item.slotName || '').toLowerCase()
  if (slot.includes('ring') || slot.includes('neck')) return 'jewelry'
  if (slot.startsWith('front ') || slot.startsWith('back ') || slot.includes('weapon') || slot.includes('poison')) return 'weapons'
  return 'armor'
}

export function liveEquipmentOrder(item = {}) {
  const order = {
    head: 10,
    shoulders: 20,
    chest: 30,
    hands: 40,
    waist: 50,
    legs: 60,
    feet: 70,
    'front main hand': 10,
    'front off hand': 20,
    'front poison': 30,
    'back main hand': 40,
    'back off hand': 50,
    'back poison': 60,
    neck: 10,
    'ring 1': 20,
    'ring 2': 30
  }
  return order[String(item.slotName || '').toLowerCase()] ?? 999
}

export function buildLiveSetCoverage(items = []) {
  const bySet = new Map()
  for (const item of items) {
    if (liveEquipmentGroup(item) === 'weapons' || !item?.set?.hasSet || !item.set.name) continue
    const key = item.set.id || item.set.name
    const current = bySet.get(key) || { id: key, name: item.set.name, count: 0, max: 0 }
    current.count += 1
    current.max = Math.max(current.max, Number(item.set.maxEquipped || 0))
    bySet.set(key, current)
  }

  return [...bySet.values()]
    .map(set => ({ ...set, displayMax: set.max || (set.count >= 3 ? 5 : 0) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
