import React, { useEffect, useRef, useState } from 'react'

export default function InfoPopover({ label, title, children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="info-popover" ref={rootRef}>
    <button type="button" className="info-button" aria-label={label || `About ${title}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>i</button>
    {open && <div className="info-card" role="dialog" aria-label={title}>
      <b>{title}</b>
      <div>{children}</div>
    </div>}
  </div>
}
