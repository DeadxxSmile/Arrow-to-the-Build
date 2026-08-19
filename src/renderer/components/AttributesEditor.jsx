import { useState } from 'react'
import NumberStepper from './NumberStepper'
import { useAppDialog } from './AppDialogProvider'
import { ATTRIBUTE_KEYS, attributeSummary } from '../utils/buildLogic'
import OverrideResetButton, { overrideEntry } from './OverrideResetButton'

const LABEL = { magicka: 'Magicka', health: 'Health', stamina: 'Stamina' }

export default function AttributesEditor({ character, build, onChange, allowOverrides = true }) {
  const summary = attributeSummary(character, build)
  const [busy, setBusy] = useState(false)
  const dialog = useAppDialog()

  const syncedLocked = character?.addon_sync?.linked && !allowOverrides
  const set = (key, value) => { if (!syncedLocked) onChange({ ...summary.actual, [key]: value }) }
  const targetAvailable = summary.targetTotal <= summary.available
  const useTarget = async () => {
    if (summary.matchesTarget) return
    const approved = await dialog.confirm({ title: 'Use the build attribute target?', message: `Replace the recorded split (${describe(summary.actual)}) with this build's recommendation (${describe(summary.target)})? This only changes ATTB, not your character in ESO.`, confirmLabel: 'Use Build Target' })
    if (!approved) return
    setBusy(true)
    try { await onChange(summary.target) } finally { setBusy(false) }
  }

  return <section className="panel v3-attributes-panel">
    <div className="section-head">
      <div><span className="eyebrow">Attribute distribution</span><h2>Where your attribute points are going</h2><p>Current allocation and build target share one view. Synced characters stay read-only until override mode is enabled.</p></div>
      {!syncedLocked && !summary.matchesTarget && targetAvailable && <button className="btn secondary" onClick={useTarget} disabled={busy}>{busy ? 'Applying…' : 'Use build target'}</button>}
    </div>

    <div className="attribute-compact-grid">{ATTRIBUTE_KEYS.map(key => {
      const value = summary.actual[key]
      const target = summary.target[key]
      const diff = summary.difference[key]
      const otherSpent = summary.spent - value
      const max = Math.max(value, Math.min(64, summary.available - otherSpent))
      const live = character?.addon_sync?.live?.attributes?.[key]
      const overridden = overrideEntry(character, `attributes.${key}`)
      const scale = Math.max(1, summary.available, summary.targetTotal)
      return <article className={`attribute-compact-card ${key} ${overridden ? 'overridden' : ''}`} key={key}>
        <header><div><span>{LABEL[key]}</span><b>{value}</b></div><small>Target {target}{diff ? ` · ${diff > 0 ? '+' : ''}${diff}` : ' · matched'}</small></header>
        <div className="attribute-comparison-track" aria-label={`${LABEL[key]} current ${value}, build target ${target}`}>
          <i className="current" style={{ width: `${Math.min(100, value / scale * 100)}%` }} />
          <u style={{ left: `${Math.min(100, target / scale * 100)}%` }} title={`Build target ${target}`} />
        </div>
        <div className="attribute-card-controls"><div className="synced-control"><NumberStepper value={value} min={0} max={max} onChange={v => set(key, v)} label={`${LABEL[key]} attribute points`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`attributes.${key}`} compact /></div>{character?.addon_sync?.linked && <small>ESO {live ?? value}</small>}</div>
      </article>
    })}</div>

    <div className={`attribute-summary-line ${summary.remaining < 0 ? 'warn' : ''}`}>
      <span><b>{summary.spent}</b> spent of <b>{summary.available}</b> available at Level {character.level}</span>
      <span><b>{summary.remaining}</b> unspent</span>
      <span>Build target: <b>{summary.targetTotal}</b> total</span>
    </div>

    {syncedLocked && <div className="quiet-box sync-lock-note">These values are synced from ESO. Use the Overrides switch above to test a different split without losing the ESO snapshot.</div>}
    {summary.overAvailable > 0 && <div className="notice-banner warn-banner" role="status">{summary.spent} points are recorded but level {character.level} normally provides {summary.available}. ATTB has left your numbers alone; adjust the level or split when convenient.</div>}
    {!syncedLocked && !summary.matchesTarget && !targetAvailable && <div className="attribute-target-later"><b>Full target is a later milestone.</b><span>This build needs {summary.targetTotal} attribute points. Level {character.level} normally provides {summary.available}; keep following the target as new points unlock.</span></div>}
  </section>
}

function describe(attributes) {
  return ATTRIBUTE_KEYS.filter(key => attributes[key]).map(key => `${attributes[key]} ${LABEL[key]}`).join(' / ') || 'nothing'
}
