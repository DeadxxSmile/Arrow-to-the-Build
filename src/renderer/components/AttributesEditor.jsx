import React, { useState } from 'react'
import NumberStepper from './NumberStepper'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'

const LABEL = { magicka: 'Magicka', health: 'Health', stamina: 'Stamina' }

export default function AttributesEditor({ character, build, onChange }) {
  const summary = attributeSummary(character, build)
  const [busy, setBusy] = useState(false)

  const set = (key, value) => onChange({ ...summary.actual, [key]: value })
  const targetAvailable = summary.targetTotal <= summary.available
  const useTarget = async () => {
    if (summary.matchesTarget) return
    if (!window.confirm(`Replace the recorded split (${describe(summary.actual)}) with this build's recommendation (${describe(summary.target)})? This only changes ATTB, not your character in ESO.`)) return
    setBusy(true)
    try { await onChange(summary.target) } finally { setBusy(false) }
  }

  return <section className="panel">
    <div className="section-head">
      <div><span className="eyebrow">Attribute points</span><h2>Magicka, Health &amp; Stamina</h2></div>
      <p>Record what this character actually has. ATTB compares it against the build target and never changes it on its own.</p>
    </div>

    <div className="attribute-editor">{ATTRIBUTE_KEYS.map(key => {
      const value = summary.actual[key]
      const diff = summary.difference[key]
      // Preserve an already-recorded value after a level decrease, but do not let new edits
      // push the total above the points currently available.
      const otherSpent = summary.spent - value
      const max = Math.max(value, Math.min(64, summary.available - otherSpent))
      return <div className={`attribute-row ${key}`} key={key}>
        <div><b>{LABEL[key]}</b><small>Build target {summary.target[key]}{diff ? ` · ${diff > 0 ? '+' : ''}${diff}` : ' · matches'}</small></div>
        <NumberStepper value={value} min={0} max={max} onChange={v => set(key, v)} label={`${LABEL[key]} attribute points`} />
      </div>
    })}</div>

    <div className="attribute-totals">
      <div><small>Points spent</small><b>{summary.spent}</b></div>
      <div><small>Available at level {character.level}</small><b>{summary.available}</b></div>
      <div className={summary.remaining < 0 ? 'warn' : ''}><small>Unspent</small><b>{summary.remaining}</b></div>
      <div><small>Build target total</small><b>{summary.targetTotal}</b></div>
    </div>

    {summary.overAvailable > 0 && <div className="notice-banner warn-banner" role="status">
      {summary.spent} points are recorded but level {character.level} normally provides {summary.available}.
      ATTB has left your numbers alone; adjust the level or the split when you get a chance.
    </div>}


    <div className="button-row">
      <button className="btn secondary" onClick={useTarget} disabled={busy || summary.matchesTarget || !targetAvailable} title={!targetAvailable ? `The full build target needs ${summary.targetTotal} points; Level ${character.level} provides ${summary.available}.` : ''}>
        {summary.matchesTarget ? 'Already matches the build target' : targetAvailable ? 'Use build target' : 'Build target unlocks later'}
      </button>
    </div>
  </section>
}

function describe(attributes) {
  return ATTRIBUTE_KEYS.filter(key => attributes[key]).map(key => `${attributes[key]} ${LABEL[key]}`).join(' / ') || 'nothing'
}
