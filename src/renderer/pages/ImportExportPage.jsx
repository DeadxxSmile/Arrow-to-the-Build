import { useEffect, useRef, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'

export default function ImportExportPage() {
  const { character, activeId, setActiveId, reloadBuilds, reloadCharacters, switchWorkspace } = useApp()
  const [dbPath, setDbPath] = useState('')
  const [notice, setNotice] = useState('')
  const flashTimer = useRef(null)

  useEffect(() => { window.api.db.getPath().then(setDbPath) }, [])
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  if (!character) return <EmptyState />

  const flash = message => { setNotice(message); window.clearTimeout(flashTimer.current); flashTimer.current = window.setTimeout(() => setNotice(''), 4000) }
  const exportCharacter = async () => {
    try { const file = await window.api.characters.export(activeId); if (file) flash(`Character backup exported to ${file}.`) }
    catch (error) { flash(error.message) }
  }
  const importCharacter = async () => {
    try {
      const result = await window.api.characters.importBackup()
      if (!result) return
      await reloadBuilds(); await reloadCharacters(result.id); setActiveId(result.id)
      flash(`Imported ${result.name}.`)
    } catch (error) { flash(error.message) }
  }

  return <div className="page tools-page">
    <div className="page-title"><span className="eyebrow">Character-specific tools</span><h1>Character Backups</h1><p>Move a complete ATTB character profile between computers or save a restore point before making major tracking changes.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}

    <section className="panel tool-actions-panel">
      <div className="section-head"><div><span className="eyebrow">Current character</span><h2>{character.name}</h2></div><p>Character backups include the selected build, profile choices, progression, equipment checks, attributes, Champion Points, and personal skill lines.</p></div>
      <div className="button-grid">
        <button className="btn primary" onClick={exportCharacter}>Export current character</button>
        <button className="btn secondary" onClick={importCharacter}>Import character backup</button>
      </div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span className="eyebrow">Local storage</span><h2>Backup location</h2></div></div>
      <div className="data-path"><small>SQLite database</small><code>{dbPath}</code></div>
      <p className="json-help">Build templates, build JSON imports, and authoring exports now live entirely inside the Build Editor workspace.</p>
      <button type="button" className="btn secondary" onClick={() => switchWorkspace('build-editor', '/build-editor/import-export')}>Open Build Editor file tools</button>
    </section>
  </div>
}
