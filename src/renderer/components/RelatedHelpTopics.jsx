import { NavLink } from 'react-router-dom'
import { HELP_REFERENCE_TOPICS } from '../utils/helpReference.mjs'

export default function RelatedHelpTopics({ topicId, limit = 3 }) {
  const current = HELP_REFERENCE_TOPICS.find(topic => topic.id === topicId)
  if (!current) return null
  const related = HELP_REFERENCE_TOPICS
    .filter(topic => topic.id !== topicId && topic.category === current.category)
    .slice(0, limit)
  if (!related.length) return null

  return <section className="panel">
    <div className="section-head"><div><span className="eyebrow">Keep exploring</span><h2>Related {current.category.toLowerCase()} references</h2></div></div>
    <div className="help-category-links">
      {related.map(topic => <NavLink key={topic.id} to={topic.path} className="help-category-link">
        <span aria-hidden="true">{topic.icon}</span>
        <div><b>{topic.title}</b><small>{topic.blurb}</small></div>
        <em>›</em>
      </NavLink>)}
    </div>
  </section>
}
