import { useCallback, useEffect, useRef, useState } from 'react'
import BuildSetupGuide from '../components/BuildSetupGuide'

export default function BuildSetupGuidePage() {
  const [notice, setNotice] = useState('')
  const flashTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  const flash = useCallback(message => {
    setNotice(message)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setNotice(''), 4000)
  }, [])

  return <div className="page build-setup-page">
    <div className="page-title">
      <span className="eyebrow">Build Editor documentation</span>
      <h1>Build Setup Guide</h1>
      <p>Learn the visual Build Editor, hand-author Schema 4 JSON, search the exact bundled skill IDs, troubleshoot validation, and maintain builds across ESO patches.</p>
    </div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <BuildSetupGuide flash={flash} />
  </div>
}
