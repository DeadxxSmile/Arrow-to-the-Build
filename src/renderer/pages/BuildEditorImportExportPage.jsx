import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../App'
import BuildAuthoringTools from '../components/BuildAuthoringTools'

export default function BuildEditorImportExportPage() {
  const { builds, reloadBuilds } = useApp()
  const [notice, setNotice] = useState('')
  const flashTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  const flash = useCallback(message => {
    setNotice(message)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setNotice(''), 4000)
  }, [])

  return <div className="page build-file-tools-page">
    <div className="page-title"><span className="eyebrow">Build Editor utilities</span><h1>Import / Export</h1><p>Export a clean template or working example, or validate and add a completed Schema 4 file to the Build Library.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <BuildAuthoringTools builds={builds} reloadBuilds={reloadBuilds} flash={flash} />
  </div>
}
