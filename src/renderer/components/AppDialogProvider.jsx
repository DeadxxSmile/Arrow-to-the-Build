import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const DialogContext = createContext(null)

function normalizeOptions(input, defaults = {}) {
  if (typeof input === 'string') return { ...defaults, message: input }
  return { ...defaults, ...(input || {}) }
}

export function useAppDialog() {
  const value = useContext(DialogContext)
  if (!value) throw new Error('useAppDialog must be used inside AppDialogProvider')
  return value
}

export default function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const resolver = useRef(null)
  const inputRef = useRef(null)
  const primaryRef = useRef(null)

  const finish = useCallback(result => {
    const resolve = resolver.current
    resolver.current = null
    setDialog(null)
    setError('')
    if (resolve) resolve(result)
  }, [])

  const open = useCallback((type, options) => new Promise(resolve => {
    if (resolver.current) resolver.current(type === 'alert' ? undefined : type === 'confirm' ? false : null)
    resolver.current = resolve
    setValue(options.defaultValue || '')
    setError('')
    setDialog({ type, ...options })
  }), [])

  const alert = useCallback(input => open('alert', normalizeOptions(input, {
    title: 'Arrow to the Build',
    confirmLabel: 'OK'
  })), [open])

  const confirm = useCallback(input => open('confirm', normalizeOptions(input, {
    title: 'Confirm action',
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel'
  })), [open])

  const prompt = useCallback(input => open('prompt', normalizeOptions(input, {
    title: 'Enter a value',
    label: 'Value',
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    required: false,
    maxLength: 120
  })), [open])

  useEffect(() => {
    if (!dialog) return undefined
    const timer = requestAnimationFrame(() => {
      if (dialog.type === 'prompt') inputRef.current?.focus()
      else primaryRef.current?.focus()
    })
    const onKey = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      finish(dialog.type === 'alert' ? undefined : dialog.type === 'confirm' ? false : null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [dialog, finish])

  const submit = event => {
    event.preventDefault()
    if (!dialog) return
    if (dialog.type === 'prompt') {
      const next = dialog.trim === false ? value : value.trim()
      if (dialog.required && !next) {
        setError(dialog.requiredMessage || `${dialog.label || 'This field'} is required.`)
        inputRef.current?.focus()
        return
      }
      if (typeof dialog.validate === 'function') {
        const validationError = dialog.validate(next)
        if (validationError) {
          setError(validationError)
          inputRef.current?.focus()
          return
        }
      }
      finish(next)
      return
    }
    finish(dialog.type === 'confirm' ? true : undefined)
  }

  const cancel = () => finish(dialog?.type === 'confirm' ? false : dialog?.type === 'prompt' ? null : undefined)

  return <DialogContext.Provider value={{ alert, confirm, prompt }}>
    {children}
    {dialog && <div className="modal-backdrop app-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) cancel() }}>
      <form className={`modal app-dialog ${dialog.danger ? 'danger-dialog' : ''}`} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby={dialog.message ? 'app-dialog-message' : undefined}>
        <div className="modal-head">
          <div><span className="eyebrow">{dialog.eyebrow || (dialog.danger ? 'Confirmation required' : 'Arrow to the Build')}</span><h2 id="app-dialog-title">{dialog.title}</h2></div>
          <button type="button" className="icon-btn" onClick={cancel} aria-label="Close dialog">×</button>
        </div>
        {dialog.message && <div id="app-dialog-message" className="app-dialog-message">{dialog.message}</div>}
        {dialog.type === 'prompt' && <label className="app-dialog-field"><span>{dialog.label || 'Value'}</span><input ref={inputRef} value={value} maxLength={dialog.maxLength || 120} placeholder={dialog.placeholder || ''} onChange={event => { setValue(event.target.value); setError('') }} /></label>}
        {error && <div className="error-box" role="alert">{error}</div>}
        <div className="modal-actions app-dialog-actions">
          {dialog.type !== 'alert' && <button type="button" className="btn ghost" onClick={cancel}>{dialog.cancelLabel || 'Cancel'}</button>}
          <button ref={primaryRef} type="submit" className={`btn ${dialog.danger ? 'danger' : 'primary'}`}>{dialog.confirmLabel || 'OK'}</button>
        </div>
      </form>
    </div>}
  </DialogContext.Provider>
}
