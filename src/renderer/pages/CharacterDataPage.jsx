import { useEffect, useRef, useState } from 'react'
import { useApp } from '../App'

export default function CharacterDataPage() {
  const { character, activeId, setActiveId, reloadBuilds, reloadCharacters, refreshActive } = useApp()
  const [notice, setNotice] = useState('')
  const flashTimer = useRef(null)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const flash = message => {
    setNotice(message)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setNotice(''), 4000)
  }

  const exportCharacterBackup = async () => {
    if (!activeId || !character) return
    try {
      const file = await window.api.characters.export(activeId)
      if (file) flash(`Character backup exported to ${file}.`)
    } catch (error) {
      flash(error.message || 'The character backup could not be exported.')
    }
  }

  const importCharacterBackup = async () => {
    try {
      const result = await window.api.characters.importBackup()
      if (!result) return
      await reloadBuilds()
      await reloadCharacters(result.id)
      setActiveId(result.id)
      await refreshActive()
      flash(`Imported ${result.name}.`)
    } catch (error) {
      flash(error.message || 'The character backup could not be imported.')
    }
  }

  return <div className="page character-data-page">
    <div className="page-title">
      <span className="eyebrow">Character data</span>
      <h1>Backups &amp; Import</h1>
      <p>Keep a portable restore point for a tracked character, or bring an existing ATTB character backup onto this PC.</p>
    </div>

    {notice && <div className="notice-banner">{notice}</div>}

    <section className="panel character-backup-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Backup &amp; restore</span>
          <h2>Character backup</h2>
          <p>Export saves the currently selected ATTB character. Import is always available, even when this is your first character on a fresh install.</p>
        </div>
        <div className="schema-badges"><span>{character?.name || 'No character selected'}</span></div>
      </div>
      <div className="button-row">
        <button type="button" className="btn primary" disabled={!character || !activeId} onClick={exportCharacterBackup}>Export Current Character</button>
        <button type="button" className="btn secondary" onClick={importCharacterBackup}>Import Character Backup</button>
      </div>
      <div className="quiet-box character-backup-contents">
        <b>Included in a character backup</b>
        <p>Build selection, profile choices, progression, equipment checks, attributes, Champion Points, tracked skill lines, and character-specific temporary-unlock retirement choices.</p>
      </div>
    </section>
  </div>
}
