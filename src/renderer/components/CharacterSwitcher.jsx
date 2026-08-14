import { useEffect, useRef, useState } from 'react'

export default function CharacterSwitcher({ characters, activeId, onSelect, onAdd }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const active = characters.find(character => character.id === activeId) || characters[0]

  useEffect(() => {
    if (!open) return
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape) }
  }, [open])

  return <div className="character-switcher topbar-field" ref={rootRef}>
    <span className="topbar-label">Character</span>
    <button className="character-switcher-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span><b>{active?.name || 'Select character'}</b></span>
      <i aria-hidden="true">▾</i>
    </button>
    {open && <div className="character-switcher-menu" role="listbox" aria-label="Characters">
      {characters.map(character => <button type="button" role="option" aria-selected={character.id === activeId} className={character.id === activeId ? 'active' : ''} key={character.id} onClick={() => { onSelect(character.id); setOpen(false) }}>
        <span><b>{character.name}</b><small>{character.short_name || character.build_name}</small></span>
        {character.id === activeId && <i aria-hidden="true">✓</i>}
      </button>)}
      <div className="character-switcher-divider" />
      <button type="button" className="character-add-option" onClick={() => { setOpen(false); onAdd() }}><span aria-hidden="true">＋</span><b>Add Character</b></button>
    </div>}
  </div>
}
