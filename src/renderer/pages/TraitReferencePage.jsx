import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import RelatedHelpTopics from '../components/RelatedHelpTopics'

const traitGroups = [
  {
    id: 'armor',
    label: 'Armor',
    eyebrow: 'Body pieces and shields',
    intro: 'Armor traits change defense, sustain, movement, XP gain, or the strength of the armor glyph on that piece.',
    traits: [
      ['Divines', 'Increases Mundus Stone effects by 9.1%.', 'PvE damage and healing', 'A very common damage choice when your Mundus is part of the build.'],
      ['Impenetrable', 'Adds 132 Critical Resistance and the item takes 50% less durability damage.', 'PvP defense', 'Mostly a PvP trait. Usually not what a PvE damage build is shopping for.'],
      ['Infused', 'Increases the armor enchantment effect by 25%.', 'Large armor pieces, stat-focused setups', 'Makes the glyph on that piece stronger. Common on chest, legs, or head when a build wants a larger stat enchantment.'],
      ['Invigorating', 'Adds 16 Health, Magicka, and Stamina Recovery.', 'General sustain', 'A small all-resource recovery bonus. Usually a niche choice rather than a default target.'],
      ['Nirnhoned', 'Adds 253 Physical and Spell Resistance.', 'Flat defense', 'A small defensive boost. Usually niche compared with Reinforced or Sturdy for tanking.'],
      ['Reinforced', 'Increases this item\'s Armor value by 16%.', 'Tanks and high-armor pieces', 'Best value on pieces with naturally high Armor when the goal is raw mitigation.'],
      ['Sturdy', 'Reduces Block cost by 4%.', 'Tanks and block-heavy play', 'Useful when a build spends a lot of time blocking.'],
      ['Training', 'Increases experience gained from kills by 11%.', 'Leveling and XP grinding', 'Great while leveling. Usually something to replace on permanent combat gear.'],
      ['Well-fitted', 'Reduces Roll Dodge and Sprint cost by 6%.', 'Mobility, PvP, dodge-heavy setups', 'Useful when movement and repeated dodging matter more than raw damage.'],
      ['Intricate', 'Increases Inspiration from deconstruction by 300% and can return extra refined material.', 'Deconstruction', 'Crafting utility, not a combat trait. Deconstruct it rather than paying extra to wear it.'],
      ['Ornate', 'Increases this item\'s sell price by 300%.', 'Vendor gold', 'Not a combat trait. Its job is to be sold to an NPC merchant.']
    ]
  },
  {
    id: 'weapon',
    label: 'Weapons',
    eyebrow: 'Front bar and back bar',
    intro: 'Weapon traits change status chance, critical chance, penetration, healing, defense, Ultimate generation, or the weapon enchantment itself.',
    traits: [
      ['Charged', 'Increases chance to apply status effects by 117.5%.', 'Status-effect damage and utility', 'A strong choice when the build wants reliable status effects. Common in specific dual-wield or elemental setups.'],
      ['Decisive', 'When you gain Ultimate, you have a 27.5% chance to gain 1 additional Ultimate.', 'Ultimate generation', 'Usually a support, tank, or Ultimate-focused choice rather than a general damage trait.'],
      ['Defending', 'Adds 1,638 Physical and Spell Resistance.', 'Tank and defensive bars', 'A straightforward defensive weapon trait.'],
      ['Infused', 'Increases weapon enchantment effect by 30% and reduces enchantment cooldown by 50%.', 'Back-bar enchants and proc uptime', 'Very common on a back-bar weapon when the enchantment is important to the rotation.'],
      ['Nirnhoned', 'Increases the damage of this weapon by 15%.', 'Front-bar weapon damage', 'A common offensive option in builds that benefit from pushing one weapon\'s damage.'],
      ['Powered', 'Increases healing done by 4.5%.', 'Healing', 'Mostly healer or healing-focused utility.'],
      ['Precise', 'Increases Weapon and Spell Critical by 3.6%.', 'General damage and critical chance', 'A straightforward offensive trait when more critical chance is useful.'],
      ['Sharpened', 'Adds 1,638 Physical and Spell Penetration.', 'Damage when penetration is needed', 'Useful when the build is short on penetration. Less valuable when you are already reaching the encounter\'s effective penetration target.'],
      ['Training', 'Increases experience gained from kills by 4.5%.', 'Leveling and XP grinding', 'Useful while leveling a character or weapon line, not normally a permanent endgame trait.'],
      ['Intricate', 'Increases Inspiration from deconstruction by 300% and can return extra refined material.', 'Deconstruction', 'Crafting utility, not a combat trait.'],
      ['Ornate', 'Increases this item\'s sell price by 300%.', 'Vendor gold', 'Not a combat trait. Sell it unless you have another reason to keep the item.']
    ]
  },
  {
    id: 'jewelry',
    label: 'Jewelry',
    eyebrow: 'Rings and necklaces',
    intro: 'Jewelry traits change resource pools, defenses, movement, synergy returns, execute damage, or the strength of the jewelry glyph.',
    traits: [
      ['Arcane', 'Adds 877 Maximum Magicka.', 'Magicka resource pool', 'Simple Magicka. Useful, but many optimized builds prefer a trait that scales damage or the jewelry enchantment instead.'],
      ['Bloodthirsty', 'Adds up to 350 Weapon and Spell Damage against enemies under 90% Health.', 'PvE damage', 'A common damage-dealer choice, especially for sustained boss damage and execute pressure.'],
      ['Harmony', 'Activating a synergy restores 880 Health, Magicka, and Stamina.', 'Group synergy sustain', 'Only valuable when you are regularly activating synergies.'],
      ['Healthy', 'Adds 965 Maximum Health.', 'Health and survivability', 'A simple defensive stat choice.'],
      ['Infused', 'Increases jewelry enchantment effectiveness by 60%.', 'Strong glyph-focused setups', 'Makes the glyph on the ring or necklace much stronger. Flexible because the glyph determines what you amplify.'],
      ['Protective', 'Adds 1,190 Physical and Spell Resistance.', 'Defense and survivability', 'A defensive jewelry option, usually for tanky or survival-focused setups.'],
      ['Robust', 'Adds 877 Maximum Stamina.', 'Stamina resource pool', 'Simple Stamina. Useful, though optimized damage builds may prefer another trait.'],
      ['Swift', 'Increases movement speed by 7%.', 'Movement and mobility', 'Excellent quality of life or movement utility, but it trades away a combat-oriented trait.'],
      ['Triune', 'Adds 439 Maximum Magicka, 439 Maximum Stamina, and 482 Maximum Health.', 'Balanced resources', 'Good when all three pools matter instead of stacking a single resource.'],
      ['Intricate', 'Increases Inspiration from deconstruction by 400% and can return extra refined material.', 'Deconstruction', 'Crafting utility, not a combat trait.'],
      ['Ornate', 'Increases this item\'s sell price by 300%.', 'Vendor gold', 'Not a combat trait. Its useful destination is an NPC merchant.']
    ]
  }
]

function TraitTable({ group }) {
  return <section className="panel trait-reference-panel" id={`trait-${group.id}`}>
    <div className="section-head"><div><span className="eyebrow">{group.eyebrow}</span><h2>{group.label} traits</h2><p>{group.intro}</p></div><span className="trait-count">{group.traits.length} traits</span></div>
    <div className="trait-table-wrap">
      <table className="trait-table">
        <thead><tr><th>Trait</th><th>Effect</th><th>Usually for</th><th>Trader quick read</th></tr></thead>
        <tbody>{group.traits.map(([name, effect, use, note]) => <tr key={name} className={name === 'Intricate' || name === 'Ornate' ? 'utility-trait' : ''}>
          <th scope="row">{name}</th><td>{effect}</td><td><span className="trait-use">{use}</span></td><td>{note}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>
}

export default function TraitReferencePage() {
  const [notice, setNotice] = useState('')
  const openEsoHub = async () => {
    try { await window.api.external.open('https://eso-hub.com/en/traits') }
    catch (error) { setNotice(error.message || 'ESO-Hub could not be opened.') }
  }

  return <div className="page trait-reference-page">
    <div className="page-title"><NavLink to="/help" className="reference-back">‹ Help &amp; Tools</NavLink><span className="eyebrow">Gear shopping reference</span><h1>Equipment traits</h1><p>Decode the trait on an armor piece, weapon, ring, or necklace before you buy it from a trader. Your build target still wins when it names a specific trait.</p></div>

    {notice && <div className="error-box" role="alert">{notice}</div>}

    <section className="panel trait-shopping-panel">
      <div className="section-head"><div><span className="eyebrow">Before you spend gold</span><h2>Set, slot, trait, enchantment</h2><p>The trait is the extra modifier on that individual item. It is separate from the set bonus and separate from the glyph or enchantment.</p></div><button type="button" className="btn secondary compact" onClick={openEsoHub}>Open ESO-Hub Traits ↗</button></div>
      <div className="trait-shopping-grid">
        <article><b>Correct set + slot first</b><p>If the piece completes the set and fills the slot you need, a bad trait does not always make it a bad buy.</p></article>
        <article><b>You can transmute later</b><p>Once you have researched the desired trait for that item type, a Transmute Station can change an existing item to that trait. Transmuting binds the item to your account.</p></article>
        <article><b>Quality changes the number</b><p>The values below are the current Legendary-quality reference values. Green, blue, and purple items have weaker versions of the same trait.</p></article>
        <article><b>Intricate and Ornate are utility</b><p>Intricate is for deconstruction and Ornate is for vendor value. Neither is a trait you normally pay extra for on combat gear.</p></article>
      </div>
      <div className="trait-reference-note"><b>ATTB reference baseline:</b> Update 50 Inc. 2. Trait values checked against the ESO-Hub trait database on August 13, 2026.</div>
    </section>

    <nav className="trait-jump-links" aria-label="Trait categories">{traitGroups.map(group => <button type="button" key={group.id} onClick={() => document.getElementById(`trait-${group.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{group.label}</button>)}</nav>
    <div className="trait-reference-stack">{traitGroups.map(group => <TraitTable key={group.id} group={group} />)}</div>
    <RelatedHelpTopics topicId="traits" />
  </div>
}
