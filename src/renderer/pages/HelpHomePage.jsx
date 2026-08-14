import { NavLink } from 'react-router-dom'
import { useApp } from '../App'
import { HELP_NAV_SECTIONS } from '../utils/helpReference.mjs'

export default function HelpHomePage() {
  const { character } = useApp()
  const sections = HELP_NAV_SECTIONS.filter(section => section.label !== 'Start here')
  return <div className="page help-home-page">
    <div className="page-title"><span className="eyebrow">Help &amp; Tools workspace</span><h1>ESO knowledge beside the build</h1><p>Reference pages, character-aware gameplay guidance, trusted resources, and the definitions build guides usually assume you already know.</p></div>

    <section className="panel help-home-intro"><div className="section-head"><div><span className="eyebrow">Start with the problem in front of you</span><h2>Look it up without leaving the plan</h2><p>Shopping a trader? Start with Gear. Trying to decode a damage recommendation? Open Combat. Wondering why ATTB wants a connector CP star or a temporary leveling skill? Progression has the vocabulary.</p></div></div>
      <div className="reference-intro-grid"><article><b>Following a build</b><p>Understand what the target is asking for and why it matters.</p></article><article><b>Shopping for gear</b><p>Separate the details you must buy correctly from the ones you can repair later.</p></article><article><b>{character ? `Playing ${character.name}` : 'Character-aware help'}</b><p>{character ? 'Gameplay Tips can use the selected character and build for reminders that match where you are now.' : 'Select or add a character whenever you want build-specific Gameplay Tips.'}</p></article></div>
      <div className="button-row"><NavLink to="/help/tips" className="btn primary">Open Gameplay Tips</NavLink></div>
    </section>

    <div className="help-category-grid">{sections.map(section => <section className="panel help-category-panel" key={section.label}><div className="section-head"><div><span className="eyebrow">Help &amp; Tools</span><h2>{section.label}</h2></div></div><div className="help-category-links">{section.items.map(item => <NavLink key={item.to} to={item.to} className="help-category-link"><span aria-hidden="true">{item.icon}</span><b>{item.label}</b><em>Open ›</em></NavLink>)}</div></section>)}</div>
  </div>
}
