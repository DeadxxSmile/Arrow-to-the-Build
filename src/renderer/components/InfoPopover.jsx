import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_MARGIN = 12
const POPOVER_GAP = 8
const MAX_WIDTH = 340

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

export default function InfoPopover({ label = '', title, children }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, width: MAX_WIDTH })
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const cardRef = useRef(null)

  const positionCard = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const width = Math.max(220, Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2))
    let left = clamp(rect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN))
    let top = rect.bottom + POPOVER_GAP
    const cardHeight = cardRef.current?.getBoundingClientRect().height || 0
    if (cardHeight && top + cardHeight > window.innerHeight - VIEWPORT_MARGIN) {
      const above = rect.top - POPOVER_GAP - cardHeight
      top = above >= VIEWPORT_MARGIN ? above : clamp(top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - cardHeight - VIEWPORT_MARGIN))
    }
    setPosition({ left, top, width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    positionCard()
  }, [open, positionCard, children])

  useEffect(() => {
    if (!open) return
    const close = event => {
      if (!rootRef.current?.contains(event.target) && !cardRef.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    const reposition = () => positionCard()
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, positionCard])

  return <div className="info-popover" ref={rootRef}>
    <button ref={buttonRef} type="button" className="info-button" aria-label={label || `About ${title}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>i</button>
    {open && createPortal(<div ref={cardRef} className="info-card info-card-portal" role="dialog" aria-label={title} style={position}>
      <b>{title}</b>
      <div>{children}</div>
    </div>, document.body)}
  </div>
}
