import { useEffect, useMemo, useState } from 'react'

export default function BuildAuthoringTools({ builds, reloadBuilds, flash }) {
  const [guide, setGuide] = useState(null)
  const [selectedBuildId, setSelectedBuildId] = useState(builds[0]?.id || '')
  const [busy, setBusy] = useState('')
  const selectedSummary = useMemo(() => builds.find(build => build.id === selectedBuildId) || builds[0] || null, [builds, selectedBuildId])

  useEffect(() => { window.api.builds.getAuthoringGuide().then(setGuide).catch(error => flash(error.message)) }, [flash])
  useEffect(() => { if (!builds.some(build => build.id === selectedBuildId)) setSelectedBuildId(builds[0]?.id || '') }, [builds, selectedBuildId])

  const run = async (name, task, success) => {
    setBusy(name)
    try { const result = await task(); if (result) flash(typeof success === 'function' ? success(result) : success) }
    catch (error) { flash(error.message) }
    finally { setBusy('') }
  }
  const exportTemplate = () => run('template', () => window.api.builds.exportTemplate(), 'Schema 4 template exported.')
  const exportBuild = () => run('build', async () => {
    if (!selectedSummary) throw new Error('Choose a build to export.')
    return window.api.builds.exportById(selectedSummary.id)
  }, `${selectedSummary?.name || 'Build'} exported as editable JSON.`)
  const importBuild = () => run('import', async () => {
    const result = await window.api.builds.importFile()
    if (result) { await reloadBuilds(); setSelectedBuildId(result.id) }
    return result
  }, result => result.file_sync?.ok === false ? `Build imported. JSON sync pending: ${result.file_sync.error}` : 'Build imported, added to the Build Library, and mirrored to the user build folder.')

  return <section className="panel build-authoring-hero">
    <div className="section-head">
      <div><span className="eyebrow">Build files</span><h2>Import and export</h2></div>
      <div className="schema-badges"><span>ATTB {guide ? `Schema ${guide.schema_version}` : 'Schema 4'}</span><span>{guide?.game_version || 'ESO catalog'}</span></div>
    </div>
    <p>Choose the starting point that matches what you are trying to do. Exports are ordinary human-readable JSON and never modify the original build inside ATTB.</p>

    <div className="authoring-choice-grid">
      <article className="authoring-choice">
        <div><span className="eyebrow">Start from scratch</span><h3>Blank template</h3><p>Export the cleanest valid Schema 4 structure and fill it in using the bundled guide.</p></div>
        <button type="button" className="btn primary" onClick={exportTemplate} disabled={!!busy}>{busy === 'template' ? 'Exporting…' : 'Export Blank Template'}</button>
      </article>

      <article className="authoring-choice existing-build-choice">
        <div><span className="eyebrow">Use a working example</span><h3>Existing build</h3><p>Copy a bundled or imported build. Built-in builds stay protected. Use the Build Library to fork one into an editable recovery draft.</p></div>
        <label><span>Build to export</span><select value={selectedBuildId} onChange={event => setSelectedBuildId(event.target.value)}>{builds.map(build => <option key={build.id} value={build.id}>{build.name} · {build.is_bundled ? 'Bundled' : 'Imported'}</option>)}</select></label>
        <button type="button" className="btn secondary" onClick={exportBuild} disabled={!selectedSummary || !!busy}>{busy === 'build' ? 'Exporting…' : 'Export Existing Build'}</button>
      </article>

      <article className="authoring-choice">
        <div><span className="eyebrow">Bring one into ATTB</span><h3>Import build JSON</h3><p>Validate and add a completed build file to the app. Every non-bundled build is editable immediately through the Build Library.</p></div>
        <button type="button" className="btn secondary" onClick={importBuild} disabled={!!busy}>{busy === 'import' ? 'Importing…' : 'Import Build JSON'}</button>
      </article>
    </div>
  </section>
}
