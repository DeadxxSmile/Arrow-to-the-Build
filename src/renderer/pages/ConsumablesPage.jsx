import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'

function List({ title, icon, items = [] }) {
  return <section className="panel consumable-card">
    <span className="big-icon" aria-hidden="true">{icon}</span>
    <h2>{title}</h2>
    {items.length ? items.map((x, i) => <div className="consumable-item" key={i}><b>{x.name}</b><p>{x.use || x.notes}</p><small>{x.source}</small></div>) : <p className="muted">Nothing listed for this build.</p>}
  </section>
}

export default function ConsumablesPage() {
  const { character, build, esoPlus } = useApp()
  if (!character || !build) return <EmptyState />
  const c = build.consumables || {}
  return <div className="page">
    <div className="page-title"><span className="eyebrow">PvE and alternatives</span><h1>Consumables &amp; other items</h1><p>Use the premium option when pushing difficult content and the budget option while leveling or questing.</p></div>
    <div className="consumable-grid">
      <List title="Foods" icon="🍲" items={c.foods} />
      <List title="Potions" icon="⚗" items={c.potions} />
      <List title="Cyrodiil / PvP alternatives" icon="⚔" items={c.pvp_alternatives} />
    </div>
    <section className="panel plus-panel">
      <div><span className="eyebrow">Account access</span><h2>ESO Plus: {esoPlus ? 'Active' : 'Not active'}</h2></div>
      <p>{esoPlus ? 'The account receives subscription XP and storage conveniences and can access included DLC while membership remains active.' : 'The app will keep showing sources, but DLC farms may require ownership, an event access period, or crafted/traded alternatives.'}</p>
    </section>
  </div>
}
