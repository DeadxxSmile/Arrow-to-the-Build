import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import CharacterBuildSetupModal from './CharacterBuildSetupModal'

export default function CharacterBuildTools() {
  const { character, editor, characterBuilds, switchWorkspace, appSettings } = useApp()
  const syncedClass = character?.addon_sync?.class_name || ''
  const eligibleTargets = useMemo(
    () => (characterBuilds || []).filter(item => !item.class_name || !syncedClass || item.class_name === syncedClass),
    [characterBuilds, syncedClass]
  )
  const [adaptTarget, setAdaptTarget] = useState(() => character?.build_id || '')
  const [action, setAction] = useState('')
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  if (!character) return null

  const run = async (mode, options = {}) => {
    if (!character.addon_sync?.linked || action) return
    setError('')
    setAction(mode)
    try {
      if (mode === 'create') await editor.createFromCharacter(character.id, options)
      else {
        if (!adaptTarget) throw new Error('Choose the target build you want to adapt first.')
        await editor.adaptFromCharacter(character.id, adaptTarget)
      }
      setCreateOpen(false)
      switchWorkspace('build-editor', '/build-editor/overview')
    } catch (reason) {
      setError(reason.message || String(reason))
    } finally {
      setAction('')
    }
  }

  return <>
    <section className="panel character-build-settings-panel">
      <div className="section-head"><div><span className="eyebrow">Build from character</span><h2>Turn the current ESO snapshot into a build</h2><p>Create a fresh editable build from the character you are actually playing, or adapt an existing target around that CURRENT state.</p></div></div>
      {!character.addon_sync?.linked ? <div className="character-build-settings-empty"><p>This tool needs a linked ESO snapshot so ATTB can import the character truthfully.</p><Link className="btn secondary" to="/settings?tab=addon">Open ESO Addon &amp; Sync</Link></div> : <div className="character-build-settings-actions">
        <button type="button" className="btn primary" disabled={!!action} onClick={() => { setError(''); setCreateOpen(true) }}>{action === 'create' ? 'Creating…' : 'Create New Build from Character'}</button>
        <div className="adapt-build-row"><select aria-label="Target build to adapt" value={adaptTarget} onChange={event => setAdaptTarget(event.target.value)} disabled={!!action}><option value="">Choose target build…</option>{eligibleTargets.map(item => <option key={item.id} value={item.id}>{item.name}{item.is_bundled ? ' · ATTB' : ' · My build'}</option>)}</select><button type="button" className="btn secondary" disabled={!!action || !adaptTarget} onClick={() => run('adapt')}>{action === 'adapt' ? 'Adapting…' : 'Adapt Target to Character'}</button></div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <small>Creating or adapting a build never rewrites the synced character. CURRENT and TARGET remain separate.</small>
      </div>}
    </section>
    <CharacterBuildSetupModal
      open={createOpen}
      character={{ name: character.name, class_name: syncedClass, level: character.level, attributes: character.attributes }}
      defaultAuthor={appSettings.build_editor_default_author || 'NPC'}
      title={`Create a new build for ${character.name}`}
      submitLabel="Create Build from Character"
      busy={action === 'create'}
      error={createOpen ? error : ''}
      onClose={() => { if (!action) setCreateOpen(false) }}
      onSubmit={form => run('create', form)}
    />
  </>
}
