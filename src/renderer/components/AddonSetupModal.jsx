import { useEffect, useState } from 'react'

const ZOS_SAVE_DOC = 'https://www.esoui.com/forums/showthread.php?t=8957'
const ESOUI_SAVEDVARS_DOC = 'https://wiki.esoui.com/Storing_data_and_accessing_files'

export default function AddonSetupModal({ open, status, onComplete }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => { if (open) { setError(''); setAcknowledged(false) } }, [open])
  if (!open) return null

  const configure = async (mode, manual = false) => {
    if (!acknowledged) { setError('Confirm that you understand ESO controls when SavedVariables are written before enabling sync.'); return }
    setBusy(manual ? `${mode}-manual` : mode)
    setError('')
    try {
      let profileRoot = ''
      if (manual) {
        profileRoot = await window.api.addon.chooseProfile()
        if (!profileRoot) return
      }
      const next = await window.api.addon.configure({ mode, profileRoot, autoDetect: !manual })
      if (next) onComplete(next)
    } catch (err) { setError(err.message || 'Addon setup could not be completed.') }
    finally { setBusy('') }
  }

  const skip = async () => {
    setBusy('skip')
    try { onComplete(await window.api.addon.disableOnboarding()) }
    catch (err) { setError(err.message) }
    finally { setBusy('') }
  }
  const openDoc = url => window.api.external.open(url).catch(err => setError(err.message || 'The documentation link could not be opened.'))

  const detected = status?.candidates?.[0]
  return <div className="modal-backdrop addon-setup-backdrop">
    <section className="modal addon-setup-modal" role="dialog" aria-modal="true" aria-labelledby="addon-setup-title">
      <div className="modal-head"><div><span className="eyebrow">Optional ESO integration</span><h2 id="addon-setup-title">Automatically sync your characters?</h2></div></div>
      <p className="modal-intro">ATTB can install its lightweight ESO companion addon, then read the SavedVariables file ESO creates for character level, attributes, skills, equipment, action bars, and Champion Points.</p>
      <div className="addon-setup-summary">
        <div><span>⌂</span><p><b>Local and private</b><small>ATTB reads ESO SavedVariables from your Documents folder. Nothing is sent to a server.</small></p></div>
        <div><span>✓</span><p><b>You stay in control</b><small>New characters are never silently linked or allowed to replace authored build planning.</small></p></div>
        <div><span>↻</span><p><b>ESO-controlled sync</b><small>The addon can capture changes immediately, but ESO decides when that data is actually written to disk.</small></p></div>
      </div>

      <div className="addon-limit-warning" role="note">
        <span className="eyebrow">Important limitation from ESO</span>
        <h3>For a reliable fresh snapshot, run <code>/reloadui</code> in ESO.</h3>
        <p>ESO does not allow addons to directly write arbitrary files or communicate with desktop applications. ATTB therefore cannot force every gameplay change onto disk immediately. Loading screens, logout, exit, and background saves may also work, but their timing belongs to ESO.</p>
        <div className="button-row compact-buttons addon-doc-buttons"><button type="button" className="btn secondary" onClick={() => openDoc(ZOS_SAVE_DOC)}>Read ZOS save-timing explanation</button><button type="button" className="btn secondary" onClick={() => openDoc(ESOUI_SAVEDVARS_DOC)}>Read ESOUI SavedVariables explanation</button></div>
      </div>

      <label className="addon-limit-ack"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span><b>I understand that ESO controls when sync data reaches disk.</b><small>If ATTB looks stale, I can use <code>/reloadui</code> in ESO to force the reliable save path.</small></span></label>

      {detected && <div className="quiet-box addon-detected-path"><b>ESO profile detected</b><code>{detected}</code></div>}
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="addon-setup-actions">
        <button className="btn primary" disabled={!!busy || !acknowledged} onClick={() => configure('install')}>{busy === 'install' ? 'Installing…' : 'Install Addon and Enable Sync'}</button>
        <button className="btn secondary" disabled={!!busy || !acknowledged} onClick={() => configure('existing')}>{busy === 'existing' ? 'Checking…' : 'I Already Installed It'}</button>
        <button className="btn ghost" disabled={!!busy || !acknowledged} onClick={() => configure('install', true)}>Choose Folder Manually</button>
        <button className="btn ghost" disabled={!!busy} onClick={skip}>{busy === 'skip' ? 'Saving…' : 'Not Now'}</button>
      </div>
      <small className="setting-footnote">You can enable, repair, or disable integration later under Settings → General Settings. ATTB reads only the SavedVariables file ESO itself chooses to write.</small>
    </section>
  </div>
}
