import { useApp } from '../App'
import BuildAuthoringTools from '../components/BuildAuthoringTools'
import useFlashNotice from '../hooks/useFlashNotice'

export default function BuildEditorImportExportPage() {
  const { builds, reloadBuilds } = useApp()
  const { notice, flash } = useFlashNotice()

  return <div className="page build-file-tools-page">
    <div className="page-title"><span className="eyebrow">Build Editor utilities</span><h1>Import / Export</h1><p>Export a clean template or working example, or validate and add a completed Schema 4 file to the Build Library.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <BuildAuthoringTools builds={builds} reloadBuilds={reloadBuilds} flash={flash} />
  </div>
}
