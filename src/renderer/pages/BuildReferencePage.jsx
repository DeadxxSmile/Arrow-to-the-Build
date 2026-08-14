import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { helpTopicById } from '../utils/helpReference.mjs'

const sourceUrls = {
  'gear-sets': ['ESO-Hub Sets', 'https://eso-hub.com/en/sets/all'],
  traits: ['ESO-Hub Traits', 'https://eso-hub.com/en/traits'],
  enchantments: ['ESO-Hub Enchantments', 'https://eso-hub.com/en/enchanting-runes-and-glyphs'],
  'combat-stats': ['ESO-Hub Combat Help', 'https://eso-hub.com/en/ingame-help/combat'],
  'buffs-status': ['ESO-Hub Buffs & Debuffs', 'https://eso-hub.com/en/buffs-debuffs'],
  armor: ['ESO-Hub Armor Skills', 'https://eso-hub.com/en/skills/armor'],
  weapons: ['ESO-Hub Weapon Skills', 'https://eso-hub.com/en/skills/weapon'],
  shopping: ['ESO-Hub Sets', 'https://eso-hub.com/en/sets/all'],
  mundus: ['ESO-Hub Mundus Stones', 'https://eso-hub.com/en/mundus-stones'],
  'champion-points': ['ESO-Hub Champion Points', 'https://eso-hub.com/en/champion-points'],
  skills: ['ESO-Hub Skills', 'https://eso-hub.com/en/skills'],
  scribing: ['ESO-Hub Scribing', 'https://eso-hub.com/en/scribing'],
  consumables: ['ESO-Hub Food & Drinks', 'https://eso-hub.com/en/food-drinks'],
  glossary: ['ESO-Hub Builds', 'https://eso-hub.com/en/builds'],
  companions: ['ESO-Hub Companion Traits', 'https://eso-hub.com/en/companion-traits']
}

function Table({ columns, rows, className = '' }) {
  return <div className={`reference-table-wrap ${className}`}><table className="reference-table"><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
}

function Cards({ items }) {
  return <div className="reference-card-grid">{items.map(([title, body, tag]) => <article key={title} className="reference-info-card"><div>{tag && <span className="reference-tag">{tag}</span>}<h3>{title}</h3></div><p>{body}</p></article>)}</div>
}

function Note({ title, children }) {
  return <div className="reference-note"><b>{title}</b><p>{children}</p></div>
}

const mundusRows = [
  ['The Apprentice', '+238 Spell Damage', 'Magicka-flavored damage stat. Follow the build target rather than assuming it beats crit or penetration.'],
  ['The Atronach', '+310 Magicka Recovery', 'Sustain when Magicka recovery is the limiting problem.'],
  ['The Lady', '+2,744 Physical and Spell Resistance', 'Straight defense. More common in defensive, solo, or PvP contexts.'],
  ['The Lord', '+2,225 Maximum Health', 'A larger Health pool for survivability and some Health-scaling builds.'],
  ['The Lover', '+2,744 Physical and Spell Penetration', 'Useful when you are short on penetration. Loses value when group debuffs already cover the target.'],
  ['The Mage', '+2,023 Maximum Magicka', 'Larger Magicka pool. Can support sustain and abilities that scale from max resource.'],
  ['The Ritual', '+8% Healing Effectiveness', 'Healing-focused setups.'],
  ['The Serpent', '+310 Stamina Recovery', 'Stamina sustain.'],
  ['The Shadow', '+11% Critical Damage and Healing', 'Strong when your crit chance is healthy and you are not already crowding the Critical Damage cap.'],
  ['The Steed', '+10% run speed and +238 Health Recovery', 'Movement, farming, PvP, or quality-of-life setups.'],
  ['The Thief', '+1,333 Critical Strike Rating', 'A common PvE damage choice because it raises Critical Chance and scales well with Divines.'],
  ['The Tower', '+2,023 Maximum Stamina', 'Larger Stamina pool.'],
  ['The Warrior', '+238 Weapon Damage', 'Stamina-flavored damage stat. Follow the authored build target.']
]

const statusRows = [
  ['Burning', 'Flame', 'Damage over time for 4 seconds.', 'Reliable extra damage from Flame sources.'],
  ['Chilled', 'Frost', 'Instant damage plus Minor Maim. Can also apply Minor Brittle while a Frost Staff is active.', 'Damage reduction on the target and group crit-damage support in Frost setups.'],
  ['Concussed', 'Shock', 'Instant damage and Minor Vulnerability.', 'Makes the target take more damage.'],
  ['Diseased', 'Disease', 'Instant damage, splash damage, and Minor Defile.', 'Healing reduction and PvP pressure.'],
  ['Hemorrhaging', 'Bleed', 'Bleed over time that can stack up to three times.', 'Sustained bleed damage.'],
  ['Overcharged', 'Magic', 'Instant damage, restores Magicka, and applies Minor Magickasteal.', 'Small resource support from Magic damage.'],
  ['Poisoned', 'Poison', 'Poison damage over time with execute-style scaling.', 'Common Stamina damage pressure.'],
  ['Sundered', 'Physical', 'Instant damage and a short Weapon and Spell Damage bonus to the attacker.', 'Physical damage can feed a small offensive buff.']
]

const companionTraitRows = [
  ['Aggressive', 'Increases companion damage done.', 'Damage builds'],
  ['Augmented', 'Increases duration of companion buffs and debuffs.', 'Support and utility'],
  ['Bolstered', 'Reduces damage taken by the companion.', 'Tank durability'],
  ['Focused', 'Increases companion Critical Strike Rating.', 'Damage or healing crit'],
  ['Prolific', 'Increases companion Ultimate generation.', 'Ultimate-focused setups'],
  ['Quickened', 'Reduces companion ability cooldowns.', 'Broadly useful, especially tanks and healers'],
  ['Shattering', 'Increases companion Penetration.', 'Damage against armored targets'],
  ['Soothing', 'Increases companion healing done.', 'Healers'],
  ['Vigorous', 'Increases companion Maximum Health.', 'Tank and survival setups']
]

function GearSets() {
  return <>
    <Cards items={[
      ['2 / 3 / 4 / 5-piece bonuses', 'Most normal sets turn on more bonuses as you equip more pieces. The 5-piece effect is usually the reason the set is in the build.', 'Set math'],
      ['Two-handed weapons count as two set pieces', 'Bows, staves, and two-handed melee weapons occupy both weapon slots for set counting. One equipped two-hander can therefore supply two pieces of its set.', 'Weapons'],
      ['Front-bar and back-bar sets', 'A weapon set can be active only on the bar where those weapons are equipped. Bar swapping can deliberately turn a 5-piece effect on or off.', 'Bar swap'],
      ['Monster Sets', 'Usually a two-piece Head + Shoulder set. Builds may use both pieces, one piece for its 1-piece bonus, or neither when a Mythic or other slot plan wins.', '2 pieces'],
      ['Mythics', 'Special one-piece items with a powerful unique effect. A Mythic occupies a normal gear slot, so the rest of the set math must be built around it.', '1 piece'],
      ['Arena weapons', 'Special weapon sets built around a weapon skill. A two-handed arena weapon fills both weapon slots on that bar.', 'Weapons'],
      ['Perfected gear', 'A Perfected version adds an extra stat bonus compared with the normal version. The normal version can still carry the defining set effect and may be perfectly usable while you farm.', 'Upgrade path'],
      ['Mixed set sources', 'Crafted, Overland, Dungeon, Trial, Arena, PvP, Monster, Mythic, and Class sets have different acquisition rules. Trader availability depends heavily on the source.', 'Where it comes from']
    ]} />
    <section className="panel"><div className="section-head"><div><span className="eyebrow">Why bars matter</span><h2>Twelve active set slots, but set math is not twelve simple pieces</h2></div></div><p>Seven armor slots and three jewelry slots are always equipped. Your active weapon bar then contributes its weapon slots. Dual Wield contributes two one-handed pieces; a two-handed weapon contributes two set slots by itself. When you swap bars, the weapon pieces from the old bar stop counting and the new bar starts counting.</p><Note title="Practical build read">If a build says a set is <b>front-bar only</b>, that is intentional. Do not assume the set is broken when the 5-piece bonus disappears on the back bar.</Note></section>
    <Table columns={['Set type', 'Typical source', 'Trader shopping?', 'Build implication']} rows={[
      ['Crafted', 'Crafting station / player crafter', 'Yes', 'Often the easiest deterministic starter gear. Trait can be crafted correctly if the crafter has it researched.'],
      ['Overland', 'Zone drops, quests, world activities', 'Usually yes', 'Good trader target because many pieces are tradeable.'],
      ['Dungeon', '4-player dungeons', 'No guild-trader path', 'Farm the activity; eligible group drops can have a limited trade window, then collection/reconstruction becomes the long-term path.'],
      ['Trial', '12-player trials', 'No guild-trader path', 'Eligible group drops can have a limited trade window. Normal and Perfected variants may exist; Perfected is usually the later chase.'],
      ['Arena', 'Solo or group arenas', 'No guild-trader path', 'Often weapon-focused and tied to a specific skill; plan to earn these from the activity rather than shop guild traders.'],
      ['Monster', 'Dungeon head + Undaunted shoulder sources', 'Not a normal trader purchase', 'Two slots compete directly with Mythics and one-piece bonuses.'],
      ['Mythic', 'Antiquities / leads', 'No', 'One powerful item can reshape the entire gear layout.'],
      ['PvP', 'PvP vendors / rewards / regional sources', 'Varies', 'Some are tradeable and some have specialized PvP value.'],
      ['Class', 'Class-focused activity/source', 'Usually activity-specific', 'Designed around a class mechanic and not interchangeable across every class.']
    ]} />
  </>
}

function Enchantments() {
  return <>
    <Cards items={[
      ['Trait and enchantment are different', 'Infused is a trait. Max Stamina is an enchantment. A listing can have the right set and trait but still carry a glyph you plan to replace.', 'Do not mix these up'],
      ['Big armor pieces get more value', 'Chest, legs, and head receive the full armor glyph value. Hands, feet, shoulders, and waist receive a reduced value, so large pieces are common homes for expensive tri-stat glyphs.', 'Armor'],
      ['Weapon enchants proc during combat', 'Damage, Crusher, Weakening, Absorb, and Weapon Damage enchants are chosen for the effect and uptime. Infused is popular when the enchantment itself is the point of the back bar.', 'Weapons'],
      ['Jewelry glyphs shape the build', 'Weapon/Spell Damage, recovery, cost reduction, and defensive glyphs can turn the same ring into a very different piece. Jewelry Infused amplifies that glyph.', 'Jewelry']
    ]} />
    <Table columns={['Armor glyph', 'Effect', 'Common build use']} rows={[
      ['Health', 'Raises Maximum Health.', 'Tanks, survival, or a build with a specific Health target.'],
      ['Magicka', 'Raises Maximum Magicka.', 'Magicka-heavy builds and some hybrid utility.'],
      ['Stamina', 'Raises Maximum Stamina.', 'Stamina-heavy builds.'],
      ['Prismatic Defense / Tri-stat', 'Raises Health, Magicka, and Stamina together.', 'Tanks and builds that genuinely use all three pools. Expensive, so build guides often prioritize it on big pieces.']
    ]} />
    <Table columns={['Weapon glyph', 'What it does', 'Why a build uses it']} rows={[
      ['Weapon Damage', 'Temporarily increases Weapon and Spell Damage when the enchantment fires.', 'Very common on an Infused back bar for broad offensive uptime.'],
      ['Flame / Frost / Shock', 'Deals elemental damage and can contribute to the matching status effect.', 'Damage plus status-effect interaction.'],
      ['Poison / Foulness', 'Deals Poison or Disease damage.', 'Martial damage and status pressure.'],
      ['Crushing', 'Reduces the target\'s Physical and Spell Resistance.', 'Group penetration support, often on tanks or support bars.'],
      ['Weakening', 'Reduces the target\'s Weapon and Spell Damage.', 'Defensive support.'],
      ['Absorb Health / Magicka / Stamina', 'Deals damage and returns the named resource.', 'Sustain or specialized setups.'],
      ['Hardening', 'Grants a damage shield.', 'Defensive builds.'],
      ['Prismatic Onslaught', 'Special prismatic weapon enchantment.', 'Specialized use rather than a generic default.']
    ]} />
    <Table columns={['Jewelry glyph', 'What it changes', 'Common use']} rows={[
      ['Increase Physical / Magical Harm', 'Adds Weapon or Spell Damage.', 'Damage and healing builds that want raw power.'],
      ['Magicka / Stamina / Health Recovery', 'Adds resource recovery.', 'Sustain.'],
      ['Reduce Spell / Feat / Skill Cost', 'Reduces ability costs.', 'Sustain when cost reduction fits the rotation better than recovery.'],
      ['Bracing / Bashing', 'Changes block or bash performance.', 'Tank and bash-focused setups.'],
      ['Prismatic Recovery', 'Multi-resource recovery.', 'Hybrid or tank utility.'],
      ['Resistance glyphs', 'Adds resistance against specific damage types or general categories.', 'Niche defensive and PvP use.']
    ]} />
  </>
}

function CombatStats() {
  return <>
    <section className="reference-cap-strip"><article><span>125%</span><b>Critical Damage ceiling</b><p>Your total Critical Damage cannot keep scaling forever. Group buffs can push you into the cap, so solo and trial targets may differ.</p></article><article><span>18,200</span><b>Common organized PvE penetration target</b><p>Dungeon/trial monsters are commonly planned around 18,200 total penetration plus resistance debuffs. It is a context target, not a universal character-sheet goal.</p></article><article><span>4</span><b>Slottable CP stars per tree</b><p>You can invest in more stars than you slot. Only slottable stars placed on the Champion Bar provide their slotted effect.</p></article></section>
    <Table columns={['Stat', 'What it means', 'Build-specific read']} rows={[
      ['Weapon & Spell Damage', 'A core offensive/healing scaling stat.', 'More is generally useful, but sets, crit, penetration, and resource scaling can beat raw damage depending on the build.'],
      ['Critical Chance', 'Chance for eligible damage or healing to critically strike.', 'More crit makes Critical Damage bonuses more valuable. The Thief and Precise often live here.'],
      ['Critical Damage', 'How much extra damage your critical hits deal.', 'ESO caps the total modifier at 125%, so organized groups may need less self-supplied Critical Damage than solo builds.'],
      ['Offensive Penetration', 'Ignores an equal amount of enemy resistance.', 'Excellent until the enemy\'s remaining resistance is covered. After that, extra penetration does nothing for that hit.'],
      ['Physical & Spell Resistance', 'Reduces incoming damage before other mitigation.', 'Useful defense, but do not chase resistance at the expense of the actual role requirements.'],
      ['Maximum Magicka / Stamina', 'Resource pools used to cast abilities and contribute to scaling.', 'The primary pool matters, but hybrid builds can spend both resources. A Stamina build can still use Magicka utility.'],
      ['Maximum Health', 'Your survivability pool.', 'Damage dealers need enough to live; tanks and some abilities care much more about it.'],
      ['Recovery', 'How quickly Health, Magicka, or Stamina naturally recovers.', 'Sustain stat. Recovery is not identical to cost reduction or resource-return effects.'],
      ['Armor / mitigation buffs', 'Temporary or permanent damage reduction sources.', 'Major Resolve, Minor Protection, blocking, CP, sets, and role mechanics stack in different categories.'],
      ['Critical Resistance', 'Reduces incoming critical damage from players.', 'Primarily a PvP stat. Monsters do not make it a normal PvE DPS target.']
    ]} />
    <Note title="Penetration is encounter math, not a fashion score">If your tank and group debuffs already strip the target to zero effective resistance, adding more personal penetration does not increase that hit. Solo players usually need to bring more of their own than organized trial damage dealers.</Note>
  </>
}

function BuffsStatus() {
  return <>
    <Cards items={[
      ['Same Major does not stack', 'Major Resolve + Major Resolve gives one Major Resolve. The longer/current application wins rather than doubling the value.', 'Stacking'],
      ['Major + Minor does stack', 'Major Resolve and Minor Resolve are different named categories and can be active together.', 'Stacking'],
      ['Different named buffs stack', 'Major Resolve and Major Evasion can coexist because they are different effects.', 'Stacking'],
      ['Unique effects can stack too', 'A set or skill may provide a named or unique effect outside the standard Major/Minor pair system.', 'Read the tooltip']
    ]} />
    <Table columns={['Common buff/debuff', 'Current effect', 'Why builds mention it']} rows={[
      ['Major / Minor Resolve', 'Raises Physical and Spell Resistance.', 'Core defensive buff pair.'],
      ['Major / Minor Protection', 'Reduces damage taken by 10% / 5%.', 'Direct mitigation.'],
      ['Major / Minor Berserk', 'Increases damage done by 10% / 5%.', 'Broad damage amplification.'],
      ['Major / Minor Brutality & Sorcery', 'Raises Weapon / Spell Damage by 20% / 10%.', 'Standard offensive self/group buff family.'],
      ['Major / Minor Force', 'Raises Critical Damage by 20% / 10%.', 'Important when crit is a meaningful part of the build.'],
      ['Major / Minor Breach', 'Reduces target Physical and Spell Resistance.', 'Group penetration and one reason your personal penetration target changes.'],
      ['Major / Minor Vulnerability', 'Increases damage taken by 10% / 5%.', 'Group damage amplification on the target.'],
      ['Major / Minor Maim', 'Reduces target damage done by 10% / 5%.', 'Tank and survival utility.'],
      ['Major / Minor Defile', 'Reduces healing received and damage-shield strength.', 'Mostly PvP or specialized debuffing.'],
      ['Minor Slayer', 'Increases damage dealt to dungeon, trial, and arena monsters by 5%.', 'Common 3-piece trial-set bonus and an example of content-specific damage.']
    ]} />
    <div className="section-head reference-subhead"><div><span className="eyebrow">Damage types</span><h2>Status effects</h2><p>Each damage type has a matching status effect. Skills, enchants, sets, poisons, and other mechanics can apply them.</p></div></div>
    <Table columns={['Status', 'Damage type', 'What it does', 'Why you care']} rows={statusRows} />
  </>
}

function Armor() {
  return <>
    <Cards items={[
      ['Light Armor', 'Generally supports Magicka-oriented offense, penetration, critical, and Magicka efficiency through its skill-line passives. A damage build may wear one Light piece for a useful per-piece passive.', 'Offense / Magicka'],
      ['Medium Armor', 'Generally supports Stamina-oriented offense, critical damage, Weapon/Spell Damage, movement, and Stamina efficiency. Many PvE damage builds lean heavily Medium.', 'Offense / Stamina'],
      ['Heavy Armor', 'Generally supports survivability, Health, resources when taking damage, blocking, and tank-oriented durability. Tanks commonly wear several Heavy pieces.', 'Defense / tanking'],
      ['Mixed weights', 'A build may deliberately run 6 Medium / 1 Light, 5 Heavy / 1 Medium / 1 Light, or another mix because some passives reward each equipped weight or each individual piece.', 'Intentional mix']
    ]} />
    <Table columns={['Question', 'Answer', 'Practical consequence']} rows={[
      ['Does armor weight change the set?', 'Not always. Some sets exist in a fixed weight; crafted sets can usually be made in the weight you choose.', 'Do not assume the set name alone tells you the correct weight.'],
      ['Why one Light piece on a Stamina build?', 'Per-piece Light Armor passives can add useful penetration/crit while the rest of the build stays Medium.', 'That odd piece can be intentional, not a mistake.'],
      ['Why one Medium/Light piece on a tank?', 'Mixed weights can support Undaunted Mettle and bring useful per-piece bonuses.', 'Follow the authored weight by slot rather than buying seven Heavy pieces automatically.'],
      ['Does the slot matter?', 'Yes. Chest has more base Armor than a belt, and large armor pieces also receive stronger stat enchantments.', 'Traits such as Reinforced and Infused can be more valuable on specific slots.'],
      ['Can I level an armor line with one piece?', 'Wearing the armor and earning XP advances its line; exact passive benefits vary by equipped-piece requirements.', 'Leveling builds often wear mixed weights early even if the final build is more focused.']
    ]} />
  </>
}

function Weapons() {
  return <>
    <Table columns={['Weapon line', 'Typical build role', 'What to remember']} rows={[
      ['Dual Wield', 'High-pressure melee damage, flexible one-handed weapon bonuses.', 'Two separate weapons means two traits/enchants and two set pieces. Dagger vs sword vs axe vs mace can matter through weapon passives.'],
      ['Two-Handed', 'Melee damage, execute, burst, shields, movement.', 'One physical weapon counts as two set slots.'],
      ['Bow', 'Ranged Stamina damage and back-bar damage-over-time tools.', 'A two-handed weapon for set math.'],
      ['Destruction Staff', 'Elemental damage, ranged pressure, back-bar ground effects, debuffs.', 'Inferno, Frost, and Lightning staves can change passive behavior and build purpose. A Stamina build can still use a staff because modern scaling is hybrid.'],
      ['Restoration Staff', 'Healing, shields, sustain, group support.', 'Mostly healer/support focused; passives depend on having the staff active.'],
      ['One Hand and Shield', 'Taunting, blocking, debuffing, tank control.', 'One weapon + one shield gives two separately traited/enchanted gear pieces and two set slots.']
    ]} />
    <Cards items={[
      ['Front bar', 'Usually the bar where you spend the most time dealing damage or using your primary abilities. Weapon-specific passives and front-bar-only set pieces are active here.', 'Active bar'],
      ['Back bar', 'Usually maintains longer-duration effects, buffs, debuffs, arena weapon effects, or support tools before swapping back.', 'Setup bar'],
      ['Stat stick', 'A weapon can be valuable because of the stats, trait, enchantment, or set bonus it provides even if you barely use ordinary weapon attacks.', 'Build slang'],
      ['Bar swap', 'Swapping changes the active weapon, weapon passives, weapon enchant access, and which weapon-set pieces count toward set bonuses.', 'Core ESO mechanic']
    ]} />
    <Note title="Why does my Stamina build have an Inferno Staff?">Because ESO ability scaling is largely hybrid and the staff may be there for its skill, enchantment, set, or passive behavior. Resource type does not force every weapon choice to match an old-school Stamina/Magicka split.</Note>
  </>
}

function Shopping() {
  return <>
    <section className="panel reference-shopping-flow"><div className="section-head"><div><span className="eyebrow">Trader checklist</span><h2>Check these in this order</h2><p>Do not pay a giant premium for a property you can cheaply fix later.</p></div></div><ol>{[
      ['1', 'Correct set', 'If the set is wrong, none of the other details matter.'],
      ['2', 'Correct slot and item type', 'Chest vs shoulders, dagger vs sword, Inferno vs Frost Staff, ring vs necklace, and armor weight can be build-defining.'],
      ['3', 'Correct level', 'Permanent player gear starts at Level 50 / CP160. Do not spend endgame gold on an under-cap item.'],
      ['4', 'Trait', 'A correct trait is convenient and can save Transmute Crystals, but an off-trait item may still be a great buy if you have the desired trait researched.'],
      ['5', 'Quality', 'Quality can be upgraded on many items. Gold weapons often matter more than immediately golding every armor piece. Jewelry upgrades can be expensive.'],
      ['6', 'Enchantment', 'Usually the easiest property to replace. Do not reject an otherwise perfect item just because the glyph is wrong.'],
      ['7', 'Price', 'Now compare listings. You are comparing equivalent items instead of paying extra for a cosmetic difference in the listing.']
    ].map(([n, title, body]) => <li key={n}><span>{n}</span><div><b>{title}</b><p>{body}</p></div></li>)}</ol></section>
    <Cards items={[
      ['Usually expensive to fix', 'Wrong item type/slot, wrong source, missing Perfected version, or buying a piece you cannot reconstruct yet.', 'Think first'],
      ['Usually fixable', 'Trait via transmutation when researched, glyph via enchanting, and often quality via crafting materials.', 'Do not overpay'],
      ['Collection matters', 'Once a set piece is collected, reconstruction can become the cleaner path for account-bound gear.', 'Sticker book'],
      ['Bind rules matter', 'Transmuting binds the item to your account. Some activity drops also have trade windows or account-bound rules.', 'Before buying']
    ]} />
  </>
}

function Mundus() {
  return <>
    <Cards items={[
      ['One boon at a time', 'A normal character has one Mundus boon active until another stone replaces it. Twice-Born Star is the notable set exception.', 'Persistent buff'],
      ['Divines amplifies it', 'Each Divines armor trait increases the effect of the active Mundus, which is why a Divines-heavy damage build gets more value from the chosen stone.', 'Trait synergy'],
      ['Build target beats generic advice', 'The Thief may be excellent for one damage build while Lover, Shadow, Atronach, or another stone solves the actual limiting stat for another.', 'Follow the plan']
    ]} />
    <Table columns={['Mundus', 'Base effect', 'Practical read']} rows={mundusRows} />
    <Note title="Reference values">These are the current base values before Divines. ESO-Hub lists the corresponding seven-Divines values, but your actual result depends on how many Divines pieces and what item quality you wear.</Note>
  </>
}

function ChampionPoints() {
  return <>
    <Cards items={[
      ['Craft', 'Utility, movement, gathering, economy, food duration, treasure, and crafting-oriented stars.', 'Green'],
      ['Warfare', 'Damage, healing, mitigation, penetration, crit, and combat-specialization stars.', 'Blue'],
      ['Fitness', 'Health, sustain, movement, blocking, dodging, break free, and survival stars.', 'Red'],
      ['Four slottables per tree', 'You can buy many slottable stars, but only four slotted stars in each constellation are active at once.', 'Champion Bar']
    ]} />
    <Table columns={['Term', 'Meaning', 'Why ATTB shows it']} rows={[
      ['Passive star', 'Takes effect from invested points without occupying a Champion Bar slot.', 'You may spend here even when the final bar has four other stars.'],
      ['Slottable star', 'Must be purchased and placed on the Champion Bar to provide its slotted effect.', 'ATTB can recommend the points and separately show the final four slots.'],
      ['Path / connector', 'Some stars must receive enough points before linked stars become available.', 'A build can tell you to buy a boring connector because it opens the star you actually want.'],
      ['Jump point', 'The amount of investment where the star grants its next stage of effect.', 'Spending 17/50 may do nothing beyond the previous stage if the next useful breakpoint is 20 or 25.'],
      ['Core vs flex branch', 'Core spending opens or supports the plan; flex branches let a build adapt to damage, defense, farming, or quality-of-life priorities.', 'ATTB separates route-building from optional preference.'],
      ['Account-wide CP pool', 'Champion Points are earned account-wide, but each character can allocate them for its own build.', 'A fresh level-50 character can immediately benefit from the account\'s existing CP.']
    ]} />
  </>
}

function Skills() {
  return <Table columns={['Term', 'What it means', 'ATTB implication']} rows={[
    ['Skill line rank', 'Progress of the whole line, such as Herald of the Tome 42/50.', 'Controls when abilities and passive ranks become purchasable.'],
    ['Ability rank I-IV', 'A purchased active ability levels separately while it is gaining XP.', 'The base ability usually must reach Rank IV before a morph can be chosen.'],
    ['Base ability', 'The original skill purchased from the line.', 'Morph ownership still depends on the base purchase. Do not reclaim a base point while a used morph depends on it.'],
    ['Morph', 'One of two upgraded versions selected after the base ability reaches morph readiness.', 'ATTB treats the chosen morph as its own target and keeps opposing morphs mutually exclusive.'],
    ['Passive rank', 'A purchasable passive can have Rank I, II, III, etc., each with its own line-rank gate and Skill Point cost.', 'ATTB tracks each purchase separately rather than treating the passive as one checkbox.'],
    ['Ultimate', 'A powerful ability that consumes Ultimate instead of Magicka/Stamina.', 'Builds may slot one for active use or for passive bonuses from its skill line.'],
    ['Temporary', 'A build unlock used only for leveling or a bridge stage.', 'The build can define when it is done, and the player can retire it early or keep it active manually.'],
    ['Optional', 'Useful but not required for the main target.', 'It should not be confused with final-build completion.'],
    ['Final', 'A lasting target purchase for the authored build.', 'Part of the destination rather than a leveling filler.'],
    ['Class Mastery', 'A class-specific system available when its requirements are met.', 'ATTB keeps it separate from ordinary Skill Point accounting where the game does not use a normal Skill Point purchase.'],
    ['Scribing skill', 'A Grimoire configured with a Focus, Signature, and Affix Script.', 'The exact recipe matters, not just the Grimoire name.']
  ]} />
}

function Scribing() {
  return <>
    <Cards items={[
      ['Grimoire', 'The base framework of the Scribed Skill. Think of it as the ability shell you are customizing.', 'Base skill'],
      ['Focus Script', 'Defines the main function and can determine damage type, target behavior, resource cost, or another central mechanic.', 'Main job'],
      ['Signature Script', 'Adds a secondary mechanic or interaction. Class Mastery is a Signature Script.', 'Extra behavior'],
      ['Affix Script', 'Adds a buff or debuff suited to the resulting skill and its target.', 'Buff / debuff'],
      ['Luminous Ink', 'The resource consumed when you scribe or change scripts on a Scribed Skill.', 'Crafting cost'],
      ['Compatibility', 'Not every Script works with every Grimoire, and not every otherwise-compatible combination works together.', 'Recipe validation']
    ]} />
    <section className="panel"><div className="section-head"><div><span className="eyebrow">Why ATTB stores the recipe</span><h2>Ulfsild's Contingency is not specific enough</h2></div></div><p>A build may want <b>Ulfsild's Contingency - Bleed / Lingering Torment / Resolve</b>. Another Ulfsild's recipe can play completely differently. That is why Schema 4 can reference a specific Scribed Skill recipe rather than treating the Grimoire name as the finished target.</p><Note title="Scribing order">Choose one Focus, one Signature, and one Affix Script at the Scribing Altar. The exact combination must be compatible before the skill can be created.</Note></section>
  </>
}

function Consumables() {
  return <>
    <Table columns={['Consumable', 'What it does', 'Build-specific read']} rows={[
      ['Food', 'Provides long-duration stats such as max resources, Health, or multi-stat combinations.', 'Often part of the build baseline. A parse, solo build, and tank can want very different food.'],
      ['Drink', 'Often emphasizes recovery or mixed sustain effects.', 'Useful when sustain is a bigger limiter than another max-stat bonus.'],
      ['Potion', 'Instant resource/Health recovery plus temporary buffs depending on the ingredients.', 'Builds use potions to cover sustain and sometimes maintain buffs that would otherwise consume a skill slot.'],
      ['Poison', 'Applied to a weapon and can replace that weapon\'s normal enchantment while equipped.', 'Do not plan a poison and a weapon glyph as though both will independently fire from the same weapon.'],
      ['Medicinal Use', 'Alchemy passive that extends the duration of potion effects.', 'Combat builds may invest in Alchemy specifically for potion uptime even if the character is not a dedicated crafter.']
    ]} />
    <Cards items={[
      ['Tri-stat food', 'Health + Magicka + Stamina can be ideal when survival and both resource pools matter.', 'Balanced'],
      ['Primary-resource food', 'Max Health plus a large primary-resource bonus is common for damage builds.', 'Damage'],
      ['Recovery food/drink', 'Trades some raw pool size for sustain.', 'Sustain'],
      ['Power potions', 'Can provide resources plus offensive buffs depending on the recipe.', 'Buff uptime'],
      ['Tri-potions', 'Restore all three resources and provide their recovery buffs.', 'Survival / tank / general']
    ]} />
  </>
}

function Glossary() {
  return <Table columns={['Build term', 'Plain-English meaning']} rows={[
    ['AoE', 'Area of Effect. Hits or affects multiple targets or a ground/area zone.'],
    ['DoT', 'Damage over Time. Damage that continues after the initial cast.'],
    ['HoT', 'Heal over Time. Healing delivered across a duration.'],
    ['Spammable', 'The ability you repeatedly cast when higher-priority effects do not need refreshing.'],
    ['Execute', 'An ability or effect that becomes stronger or more valuable as the enemy gets low on Health.'],
    ['Opener', 'The first planned casts used to establish buffs, debuffs, DoTs, Crux, or another combat state.'],
    ['Priority rotation', 'Refresh what needs attention rather than repeating a fixed button sequence forever.'],
    ['Static rotation', 'A repeatable sequence designed around predictable durations.'],
    ['Proc', 'An effect that triggers when its stated condition occurs, often with an internal cooldown.'],
    ['Uptime', 'How consistently a buff, debuff, enchantment, or set effect stays active.'],
    ['Front bar', 'The weapon bar you spend most of the active damage/healing loop on.'],
    ['Back bar', 'The second weapon bar commonly used for longer effects, buffs, debuffs, or support.'],
    ['Stat stick', 'Gear used largely for the stats/set/trait it supplies rather than ordinary attacks with it.'],
    ['Bridge', 'A temporary setup that gets you from where you are now to the later target.'],
    ['Starter', 'Accessible early gear or skills intended to establish a functional build quickly.'],
    ['Final', 'The authored destination after the major progression handoffs are complete.'],
    ['Flex', 'A slot intentionally available for preference or encounter needs.'],
    ['Comfort', 'A choice that gives safety, sustain, simplicity, or quality of life instead of maximum theoretical damage.'],
    ['Trash', 'Groups of ordinary enemies rather than the boss. A trash setup often values AoE and fast burst.'],
    ['Boss', 'A durable priority target where sustained single-target damage, mechanics, and uptime matter more.'],
    ['Pre-buff', 'Activating longer effects before engagement so the fight starts with them already running.'],
    ['Selfish DPS', 'A damage setup focused on the wearer\'s output rather than carrying group buffs/debuffs.'],
    ['Support set', 'A set chosen to improve the group or weaken enemies rather than maximize the wearer\'s personal parse.']
  ]} />
}

function Companions() {
  return <>
    <Cards items={[
      ['Companion gear is separate', 'Player armor traits do not apply to companion gear. Companion equipment has its own traits and progression rules.', 'Separate system'],
      ['Cooldowns shape the bar', 'Companions do not play a player-style rotation. Ability priority and cooldown timing decide what they cast when.', 'Priority AI'],
      ['Taunt matters', 'A tank companion needs a real taunt in the priority list. Merely wearing Heavy Armor does not make the companion hold aggro.', 'Tank'],
      ['Role first', 'Tank, healer, damage, and support setups value very different traits, weapons, armor weights, and abilities.', 'Build identity']
    ]} />
    <Table columns={['Companion trait', 'Effect direction', 'Usually useful for']} rows={companionTraitRows} />
    <Note title="Important shopping difference">Companion gear cannot be treated like player gear. Its traits cannot be changed by the normal transmutation workflow, so buying the right companion trait matters much more.</Note>
  </>
}

const renderers = {
  'gear-sets': GearSets,
  enchantments: Enchantments,
  'combat-stats': CombatStats,
  'buffs-status': BuffsStatus,
  armor: Armor,
  weapons: Weapons,
  shopping: Shopping,
  mundus: Mundus,
  'champion-points': ChampionPoints,
  skills: Skills,
  scribing: Scribing,
  consumables: Consumables,
  glossary: Glossary,
  companions: Companions
}

export default function BuildReferencePage() {
  const { topic } = useParams()
  const [notice, setNotice] = useState('')
  const meta = helpTopicById(topic)
  const Renderer = renderers[topic]
  if (!meta || !Renderer) return <div className="page build-reference-page"><div className="quiet-box">That Help &amp; Tools reference topic could not be found.</div></div>

  const { id, title, blurb, category } = meta
  const source = sourceUrls[id]
  const openSource = async () => {
    if (!source) return
    try { await window.api.external.open(source[1]) }
    catch (error) { setNotice(error.message || `${source[0]} could not be opened.`) }
  }

  return <div className="page build-reference-page">
    <div className="reference-topic-header"><div><NavLink to="/help" className="reference-back">‹ Help &amp; Tools</NavLink><span className="eyebrow">{category} reference</span><h1>{title}</h1><p>{blurb}</p></div>{source && <button type="button" className="btn secondary compact" onClick={openSource}>Open {source[0]} ↗</button>}</div>
    {notice && <div className="error-box" role="alert">{notice}</div>}
    <Renderer />
    <div className="reference-baseline"><b>ATTB reference baseline:</b> ESO Update 50 Inc. 2. Build advice stays contextual; when your authored build names a specific target, the build target takes priority over generic reference guidance.</div>
  </div>
}
