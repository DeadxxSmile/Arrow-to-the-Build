import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'

export default function TipsPage() {
  const { character, build } = useApp()
  if (!character || !build) return <EmptyState />
  const tips = build.tips || []
  return <div className="page">
    <div className="page-title"><span className="eyebrow">Gameplay help</span><h1>Tips &amp; tricks</h1><p>Build-specific warnings, practical reminders, and the things most likely to trip up a leveling character.</p></div>
    {tips.length ? <div className="tips-list">{tips.map((tip, index) => <article className="panel tip-card" key={`${tip}-${index}`}><span>{index + 1}</span><p>{tip}</p></article>)}</div> : <div className="quiet-box">This build file does not include any tips.</div>}
  </div>
}
