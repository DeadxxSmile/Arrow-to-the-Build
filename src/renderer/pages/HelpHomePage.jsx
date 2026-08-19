import { NavLink } from 'react-router-dom'
import { useApp } from '../App'
import { HELP_NAV_SECTIONS, HELP_REFERENCE_TOPICS } from '../utils/helpReference.mjs'

const categoryCopy = {
  Gear: 'Understand what to buy, what can be fixed later, and how sets, traits, glyphs, armor weights, and weapons fit together.',
  Combat: 'Decode the stats, buffs, debuffs, consumables, and encounter language that build guides use without stopping to explain.',
  Progression: 'Understand skills, morphs, Champion Points, and Scribing so the route through a build makes sense instead of feeling arbitrary.',
  Companions: 'Keep companion gear, traits, bars, and role logic separate from player-build rules.',
  Reference: 'Use plain-English definitions, ATTB documentation, and trusted external resources when you need more context.'
}

export default function HelpHomePage() {
  const { character } = useApp()
  const sections = HELP_NAV_SECTIONS.filter(section => section.label !== 'Start here')
  const topicByPath = new Map(HELP_REFERENCE_TOPICS.map(topic => [topic.path, topic]))
  const quickTasks = [
    { to: '/help/tips', eyebrow: 'My character', title: character ? `What should ${character.name} work on?` : 'What should my character work on?', body: character ? 'Use the selected character and build to surface reminders that match your actual progression.' : 'Select or add a character and Gameplay Tips becomes character-aware.' },
    { to: '/help/topic/shopping', eyebrow: 'Buying gear', title: 'Is this item worth buying?', body: 'Check set, slot, trait, enchantment, quality, and what you can repair later before spending gold.' },
    { to: '/help/topic/glossary', eyebrow: 'Build language', title: 'What does this build term mean?', body: 'Decode things like spammable, execute, proc, bridge, flex, stat stick, front bar, and back bar.' },
    { to: '/help/topic/champion-points', eyebrow: 'Progression', title: 'Why does the build want this path?', body: 'Understand connector nodes, slottables, jump points, and the difference between opening a route and finishing a target.' }
  ]
  return <div className="page help-home-page v3-help-home-page">
    <div className="page-title"><span className="eyebrow">Help &amp; Tools</span><h1>Find the answer by what you are trying to do</h1><p>Start with the problem in front of you instead of hunting through a wiki-shaped menu. The full reference library stays below when you want to browse.</p></div>
    <section className="help-task-grid" aria-label="Common help tasks">{quickTasks.map(task => <NavLink key={task.to} to={task.to} className="help-task-card"><span>{task.eyebrow}</span><h2>{task.title}</h2><p>{task.body}</p><em>Open guide ›</em></NavLink>)}</section>
    <div className="help-library-heading"><div><span className="eyebrow">Browse the library</span><h2>Reference by system</h2><p>Use these when you already know which part of ESO or the build you want to understand.</p></div></div>
    <div className="help-category-grid">{sections.map(section => <section className="panel help-category-panel" key={section.label}><div className="help-category-heading"><div><span className="eyebrow">{section.label}</span><h2>{section.label}</h2><p>{categoryCopy[section.label] || 'Reference and guidance for this part of the build.'}</p></div><strong>{section.items.length}</strong></div><div className="help-category-links">{section.items.map(item => { const topic = topicByPath.get(item.to); return <NavLink key={item.to} to={item.to} className="help-category-link"><span aria-hidden="true">{item.icon}</span><div><b>{item.label}</b>{topic?.blurb && <small>{topic.blurb}</small>}</div><em>›</em></NavLink> })}</div></section>)}</div>
  </div>
}
