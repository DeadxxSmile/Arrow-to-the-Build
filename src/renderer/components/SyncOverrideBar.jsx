import { useState } from 'react'
import { useApp } from '../App'

export default function SyncOverrideBar({ title = 'ESO snapshot connected', description = '', compact = false }) {
  const { character, appSettings, setAddonOverrideMode } = useApp()
  const [busy, setBusy] = useState(false)
  if (!character?.addon_sync?.linked) return null

  const enabled = appSettings.addon_allow_overrides === 'true'
  const toggle = async () => {
    if (busy) return
    setBusy(true)
    try { await setAddonOverrideMode(!enabled) }
    finally { setBusy(false) }
  }

  return <div className={`sync-override-bar ${enabled ? 'enabled' : 'locked'} ${compact ? 'compact' : ''}`}>
    <span className="sync-dot" aria-hidden="true" />
    <div className="sync-override-copy">
      <b>{title}</b>
      <small>{description || (enabled
        ? 'Override mode is on. Local changes are layered over the ESO snapshot and can be restored at any time.'
        : 'Synced values are protected. Turn on overrides to test local changes without losing the ESO snapshot underneath.')}</small>
    </div>
    <button type="button" className={`override-mode-button ${enabled ? 'enabled' : ''}`} onClick={toggle} disabled={busy} aria-pressed={enabled}>
      <span>{busy ? 'Updating…' : enabled ? 'Overrides On' : 'Overrides Off'}</span>
      <i className="switch" aria-hidden="true"><em /></i>
    </button>
  </div>
}
