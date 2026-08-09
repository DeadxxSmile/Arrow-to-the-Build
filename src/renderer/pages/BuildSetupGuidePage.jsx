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
      <span className="eyebrow">Helpful stuff</span>
      <h1>ATTB Guides</h1>
      <p>Learn the app and Build Editor, hand-author Schema 4 JSON, give the bundled AI guide to an assistant, troubleshoot validation, and understand ESO addon synchronization.</p>
    </div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <BuildSetupGuide flash={flash} />
  </div>
}
