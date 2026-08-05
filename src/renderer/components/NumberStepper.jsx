import React, { useEffect, useRef, useState } from 'react'

export default function NumberStepper({ value = 0, min = 0, max = 999, step = 1, onChange, label, className = '' }) {
  const [draft, setDraft] = useState(String(value))
  const focused = useRef(false)

  // Only follow the prop while the field is not being typed in, otherwise clamping fights the user
  // mid-keystroke and "25" turns into "1" then "12".
  useEffect(() => { if (!focused.current) setDraft(String(value)) }, [value])

  const clamp = v => Math.max(min, Math.min(max, Math.trunc(Number(v))))
  const commit = v => {
    const n = Number(v)
    const next = Number.isFinite(n) ? clamp(n) : clamp(value)
    setDraft(String(next))
    if (next !== Number(value)) onChange?.(next)
    return next
  }
  const nudge = delta => { focused.current = false; commit(Number(value) + delta) }

  return (
    <div className={`number-stepper ${className}`} role="group" aria-label={label}>
      <button type="button" onClick={() => nudge(-step)} disabled={Number(value) <= min} aria-label={`Decrease ${label || 'value'}`}>−</button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-label={label}
        onFocus={() => { focused.current = true }}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => { focused.current = false; commit(e.target.value) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); e.currentTarget.select() }
          if (e.key === 'Escape') { setDraft(String(value)); e.currentTarget.blur() }
        }}
      />
      <button type="button" onClick={() => nudge(step)} disabled={Number(value) >= max} aria-label={`Increase ${label || 'value'}`}>+</button>
    </div>
  )
}
