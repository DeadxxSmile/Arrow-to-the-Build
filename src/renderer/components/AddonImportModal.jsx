import { useEffect, useMemo, useState } from 'react'
import CharacterBuildSetupModal from './CharacterBuildSetupModal'

const CREATE_NEW = '__create_new_build__'

function subtitle(character) {
  const progression = character.level >= 50 && character.champion_points
    ? `Level 50 · CP ${character.champion_points}`
    : `Level ${character.level}`
  return `${progression} ${character.race || ''} ${character.class_name || ''}`.replace(/\s+/g, ' ').trim()
}

export default function AddonImportModal({ open, discoveries, builds, defaultAuthor = 'NPC', onClose, onImported, onDismissed }) {
  const [selectedKey, setSelectedKey] = useState('')
  const [buildId, setBuildId] = useState(CREATE_NEW)
  const [choice, setChoice] = useState('create')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [setupOpen, setSetupOpen] = useState(false)
  const selected = useMemo(() => discoveries.find(item => item.character_key === selectedKey) || discoveries[0] || null, [discoveries, selectedKey])
  const compatibleBuilds = useMemo(() => {
    if (!selected?.class_name) return builds
    return builds.filter(build => String(build.class_name || '').toLocaleLowerCase() === String(selected.class_name).toLocaleLowerCase())
  }, [builds, selected?.class_name])

  useEffect(() => {
    if (!open) return
    const first = discoveries[0]
    setSelectedKey(first?.character_key || '')
    setBuildId(CREATE_NEW)
    setChoice(first?.possible_match_id ? 'link' : 'create')
    setSetupOpen(false)
    setError('')
  }, [open, discoveries])
  useEffect(() => {
    if (!selected) return
    setChoice(selected.possible_match_id ? 'link' : 'create')
    setBuildId(CREATE_NEW)
    setSetupOpen(false)
  }, [selected?.character_key])
  if (!open) return null

  const finishImport = async options => {
    if (!selected) return
    setBusy('import'); setError('')
    try {
      const result = await window.api.addon.importCharacter(selected.character_key, options)
      setSetupOpen(false)
      await onImported(result)
    } catch (err) { setError(err.message || 'The character could not be imported.') }
    finally { setBusy('') }
  }

  const importCharacter = async () => {
    if (!selected) return
    if (choice === 'link') return finishImport({ link_character_id: selected.possible_match_id })
    if (buildId === CREATE_NEW) { setError(''); setSetupOpen(true); return }
    if (!buildId) { setError('Choose a saved build or create a new build from this character.'); return }
    return finishImport({ build_id: buildId })
  }

  const createNewBuild = async form => finishImport({ create_build: { ...form, author: defaultAuthor } })

  const dismiss = async () => {
    if (!selected) return
    setBusy('dismiss'); setError('')
    try { await window.api.addon.dismissCharacter(selected.character_key); await onDismissed(selected.character_key) }
    catch (err) { setError(err.message) }
    finally { setBusy('') }
  }

  const buildPicker = choice === 'create' && <label className="addon-build-picker"><span>Build plan</span><select value={buildId} onChange={event => setBuildId(event.target.value)}>
    <option value={CREATE_NEW}>Create a new build from this character</option>
    {compatibleBuilds.map(build => <option key={build.id} value={build.id}>Track existing: {build.name} · {build.game_version}</option>)}
  </select><small>Create New imports the current ESO state into a fresh editable Build Editor draft. Existing choices use a saved {selected?.class_name || 'compatible'} build as the target.</small></label>

  return <>
    {!setupOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="modal addon-import-modal" role="dialog" aria-modal="true" aria-labelledby="addon-import-title">
        <div className="modal-head"><div><span className="eyebrow">New ESO character found</span><h2 id="addon-import-title">Add and sync this character?</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        {discoveries.length > 1 && <label className="addon-character-picker"><span>Character found by the addon</span><select value={selected?.character_key || ''} onChange={event => setSelectedKey(event.target.value)}>{discoveries.map(item => <option key={item.character_key} value={item.character_key}>{item.name} · {subtitle(item)}</option>)}</select></label>}
        {selected ? <>
          <div className="addon-character-hero"><div><span className="sync-dot" /><div><h3>{selected.name}</h3><p>{subtitle(selected)}</p></div></div><div className="schema-badges"><span>{selected.world_name}</span><span>{selected.account_name}</span></div></div>
          {selected.possible_match_id && <section className="addon-link-choice"><span className="eyebrow">Possible existing profile</span><h3>ATTB already has “{selected.possible_match_name}”</h3><p>Choose whether this ESO character should update that existing profile's current data or be imported separately.</p>
            <label><input type="radio" name="addon-import-choice" checked={choice === 'link'} onChange={() => setChoice('link')} /><span><b>Link the existing ATTB character</b><small>Its selected build, notes, and build progress remain intact. Future ESO snapshots update its CURRENT character data.</small></span></label>
            <label><input type="radio" name="addon-import-choice" checked={choice === 'create'} onChange={() => setChoice('create')} /><span><b>Create a separate synced character</b><small>Create a new editable build from the ESO snapshot or attach a saved build as its target.</small></span></label>
          </section>}
          {buildPicker}
          <div className="quiet-box">ATTB syncs observed game data while authored recommendations remain desktop-owned. Creating a new build starts from CURRENT ESO state and lets you author the TARGET in Build Editor.</div>
        </> : <div className="quiet-box">No unlinked addon characters are available.</div>}
        {error && <div className="error-box" role="alert">{error}</div>}
        <div className="modal-footer"><button type="button" className="btn ghost" disabled={!!busy || !selected} onClick={dismiss}>{busy === 'dismiss' ? 'Saving…' : 'Not This Character'}</button><div className="modal-actions"><button type="button" className="btn ghost" disabled={!!busy} onClick={onClose}>Later</button><button type="button" className="btn primary" disabled={!!busy || !selected} onClick={importCharacter}>{busy === 'import' ? 'Importing…' : choice === 'link' ? 'Link and Sync' : buildId === CREATE_NEW ? 'Set Up New Build' : 'Add and Sync Build'}</button></div></div>
      </section>
    </div>}
    <CharacterBuildSetupModal
      open={setupOpen}
      character={selected ? { name: selected.name, character_name: selected.name, class_name: selected.class_name, level: selected.level, attributes: selected.attributes } : null}
      defaultAuthor={defaultAuthor}
      title={`Create a build for ${selected?.name || 'this character'}`}
      submitLabel="Create, Add and Sync"
      busy={busy === 'import'}
      error={setupOpen ? error : ''}
      onClose={() => { if (!busy) setSetupOpen(false) }}
      onSubmit={createNewBuild}
    />
  </>
}
