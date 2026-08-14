export const HELP_REFERENCE_TOPICS = [
  { id: 'gear-sets', title: 'Gear & Sets', icon: '◫', category: 'Gear', path: '/help/topic/gear-sets', blurb: 'Set bonuses, slot math, Mythics, Monster Sets, arena weapons, Perfected gear, and bar swapping.' },
  { id: 'shopping', title: 'Set Shopping Guide', icon: '⌕', category: 'Gear', path: '/help/topic/shopping', blurb: 'A practical order of operations for ESO-Hub and guild trader listings so you know what is worth fixing later.' },
  { id: 'traits', title: 'Equipment Traits', icon: '◇', category: 'Gear', path: '/help/topic/traits', blurb: 'Armor, weapon, and jewelry traits with a practical trader-shopping read.' },
  { id: 'enchantments', title: 'Enchantments & Glyphs', icon: '✦', category: 'Gear', path: '/help/topic/enchantments', blurb: 'What armor, weapon, and jewelry glyphs do and why a build picks one over another.' },
  { id: 'armor', title: 'Armor Weights', icon: '▥', category: 'Gear', path: '/help/topic/armor', blurb: 'Light, Medium, Heavy, mixed-weight setups, and why a build may deliberately wear one odd piece.' },
  { id: 'weapons', title: 'Weapon Roles', icon: '⚔', category: 'Gear', path: '/help/topic/weapons', blurb: 'Dual Wield, Two-Handed, Bow, staves, Sword & Board, and what front bar or back bar really means.' },
  { id: 'combat-stats', title: 'Combat Stats & Caps', icon: '◎', category: 'Combat', path: '/help/topic/combat-stats', blurb: 'Penetration, critical chance, critical damage, damage, resources, recovery, and resistance.' },
  { id: 'buffs-status', title: 'Buffs, Debuffs & Status Effects', icon: '✧', category: 'Combat', path: '/help/topic/buffs-status', blurb: 'Major and Minor effects, what stacks, and the damage-type status effects builds care about.' },
  { id: 'mundus', title: 'Mundus Stones', icon: '✺', category: 'Combat', path: '/help/topic/mundus', blurb: 'All 13 boons, what they change, and how Divines interacts with them.' },
  { id: 'consumables', title: 'Consumables', icon: '⚗', category: 'Combat', path: '/help/topic/consumables', blurb: 'Food, drinks, potions, poisons, buff uptime, and why Medicinal Use shows up in combat builds.' },
  { id: 'skills', title: 'Skills & Morphs', icon: '✦', category: 'Progression', path: '/help/topic/skills', blurb: 'Base abilities, ranks, morphs, passives, Ultimates, temporary unlocks, and Class Mastery.' },
  { id: 'champion-points', title: 'Champion Points', icon: '✥', category: 'Progression', path: '/help/topic/champion-points', blurb: 'Craft, Warfare, Fitness, path nodes, jump points, slottables, and the four-slot rule.' },
  { id: 'scribing', title: 'Scribing', icon: '✎', category: 'Progression', path: '/help/topic/scribing', blurb: 'Grimoires, Focus, Signature, Affix, Class Mastery Scripts, and why the exact recipe matters.' },
  { id: 'companions', title: 'Companion Builds & Traits', icon: '♟', category: 'Companions', path: '/help/topic/companions', blurb: 'Companion roles, gear traits, cooldowns, skill priority, taunts, and why companion gear follows different rules.' },
  { id: 'glossary', title: 'Build Glossary', icon: '?', category: 'Reference', path: '/help/topic/glossary', blurb: 'Spammable, execute, DoT, AoE, proc, bridge, flex, stat stick, front bar, back bar, and more.' }
]

export const HELP_NAV_SECTIONS = [
  { label: 'Start here', items: [
    { to: '/help', label: 'Help Home', icon: '⌂', end: true },
    { to: '/help/tips', label: 'Gameplay Tips', icon: '◆' }
  ] },
  { label: 'Gear', items: HELP_REFERENCE_TOPICS.filter(item => item.category === 'Gear').map(item => ({ to: item.path, label: item.title, icon: item.icon })) },
  { label: 'Combat', items: HELP_REFERENCE_TOPICS.filter(item => item.category === 'Combat').map(item => ({ to: item.path, label: item.title, icon: item.icon })) },
  { label: 'Progression', items: HELP_REFERENCE_TOPICS.filter(item => item.category === 'Progression').map(item => ({ to: item.path, label: item.title, icon: item.icon })) },
  { label: 'Companions', items: HELP_REFERENCE_TOPICS.filter(item => item.category === 'Companions').map(item => ({ to: item.path, label: item.title, icon: item.icon })) },
  { label: 'Reference', items: [
    ...HELP_REFERENCE_TOPICS.filter(item => item.category === 'Reference').map(item => ({ to: item.path, label: item.title, icon: item.icon })),
    { to: '/help/guides', label: 'ATTB Guides', icon: '▤' },
    { to: '/help/resources', label: 'Resources & Links', icon: '↗' }
  ] }
]

export const helpTopicById = id => HELP_REFERENCE_TOPICS.find(item => item.id === id) || null
