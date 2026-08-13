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
      const live = character?.addon_sync?.live?.attributes?.[key]
      const overridden = overrideEntry(character, `attributes.${key}`)
      return <div className={`attribute-row ${key} ${overridden ? 'overridden' : ''}`} key={key}>
        <div><b>{LABEL[key]}</b><small>Build target {summary.target[key]}{diff ? ` · ${diff > 0 ? '+' : ''}${diff}` : ' · matches'}{character?.addon_sync?.linked ? ` · ESO snapshot: ${live ?? value}` : ''}</small></div>
        <div className="synced-control"><NumberStepper value={value} min={0} max={max} onChange={v => set(key, v)} label={`${LABEL[key]} attribute points`} disabled={syncedLocked} /><OverrideResetButton fieldPath={`attributes.${key}`} compact /></div>
      </div>
    })}</div>

    <div className="attribute-totals">
      <div><small>Points spent</small><b>{summary.spent}</b></div>
      <div><small>Available at level {character.level}</small><b>{summary.available}</b></div>
      <div className={summary.remaining < 0 ? 'warn' : ''}><small>Unspent</small><b>{summary.remaining}</b></div>
      <div><small>Build target total</small><b>{summary.targetTotal}</b></div>
    </div>

    {syncedLocked && <div className="quiet-box sync-lock-note">These values are synced from ESO. Enable synced-data overrides in Settings &gt; ESO Addon &amp; Sync to test a different split.</div>}

    {summary.overAvailable > 0 && <div className="notice-banner warn-banner" role="status">
      {summary.spent} points are recorded but level {character.level} normally provides {summary.available}.
      ATTB has left your numbers alone; adjust the level or the split when you get a chance.
    </div>}


    {!syncedLocked && !summary.matchesTarget && targetAvailable && <div className="button-row"><button className="btn secondary" onClick={useTarget} disabled={busy}>Use build target</button></div>}
    {!syncedLocked && !summary.matchesTarget && !targetAvailable && <div className="attribute-target-later"><b>Full target is a later milestone.</b><span>This build needs {summary.targetTotal} attribute points. Level {character.level} normally provides {summary.available}; keep following the target as new points unlock.</span></div>}
  </section>
}

function describe(attributes) {
  return ATTRIBUTE_KEYS.filter(key => attributes[key]).map(key => `${attributes[key]} ${LABEL[key]}`).join(' / ') || 'nothing'
}
