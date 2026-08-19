import { useCallback, useEffect, useRef, useState } from 'react'

export default function useFlashNotice(duration = 4000) {
  const [notice, setNotice] = useState('')
  const timerRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const flash = useCallback(message => {
    setNotice(message || '')
    window.clearTimeout(timerRef.current)
    if (message) timerRef.current = window.setTimeout(() => setNotice(''), duration)
  }, [duration])

  return { notice, flash }
}
