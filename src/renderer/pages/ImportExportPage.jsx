import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'

function safeName(value) { return String(value || 'ATTB-build').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'ATTB-build' }

export default function ImportExportPage() {
  const { character, build, baseBuild, buildRecord, activeId, setActiveId, reloadBuilds, reloadCharacters, refreshActive } = useApp()
  const [dbPath, setDbPath] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState('effective')
  const [validation, setValidation] = useState(null)
  const flashTimer = useRef(null)
  const effectiveBuild = useMemo(() => {
    if (!build) return null
    const clean = structuredClone(build)
    delete clean.active_variant
    delete clean.variant_unavailable
    return clean
  }, [build])
  const visibleBuild = mode === 'base' ? baseBuild : effectiveBuild
  const json = useMemo(() => JSON.stringify(visibleBuild || {}, null, 2), [visibleBuild])

  useEffect(() => { window.api.db.getPath().then(setDbPath) }, [])
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  useEffect(() => {
    if (!visibleBuild) { setValidation(null); return }
    window.api.builds.validateData(visibleBuild).then(setValidation).catch(error => setValidation({ valid: false, errors: [error.message] }))
  }, [visibleBuild])
  if (!character || !build) return <EmptyState />

  const flash = message => { setNotice(message); window.clearTimeout(flashTimer.current); flashTimer.current = window.setTimeout(() => setNotice(''), 4000) }
  const exportCharacter = async () => {
    try { const file = await window.api.characters.export(activeId); if (file) flash(`Character backup exported to ${file}.`) }
    catch (error) { flash(error.message) }
  }
  const importCharacter = async () => {
    try {
      const result = await window.api.characters.importBackup()
      if (!result) return
      await reloadBuilds(); await reloadCharacters(result.id); setActiveId(result.id)
      flash(`Imported ${result.name}.`)
    } catch (error) { flash(error.message) }
  }
  const importBuild = async () => {
    try { const result = await window.api.builds.importFile(); if (result) { await reloadBuilds(); flash(`Imported ${result.name}.`) } }
    catch (error) { flash(error.message) }
  }
  const reloadBuild = async () => {
    try { const result = await window.api.builds.reloadForCharacter(activeId); if (result) { await reloadBuilds(); await refreshActive(); flash(`Reloaded ${result.name}.`) } }
    catch (error) { flash(error.message) }
  }
  const copyJson = async () => { await navigator.clipboard.writeText(json); flash('Build JSON copied to the clipboard.') }
  const saveJson = async () => {
    try { const file = await window.api.builds.exportData(visibleBuild, `${safeName(visibleBuild.name)}-${mode}.json`); if (file) flash(`Saved ${file}.`) }
    catch (error) { flash(error.message) }
  }

  return <div className="page tools-page">
    <div className="page-title"><span className="eyebrow">Backups and build files</span><h1>Import / Export</h1><p>Back up characters, inspect the build currently driving the app, and move human-readable JSON files in or out of ATTB.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}

    <section className="panel tool-actions-panel">
      <div className="section-head"><div><span className="eyebrow">Character backup</span><h2>{character.name}</h2></div><p>Character exports include the selected build, profile choices, progress, equipment ticks, attributes, CP totals, and personal skill lines.</p></div>
      <div className="button-grid">
        <button className="btn primary" onClick={exportCharacter}>Export current character</button>
        <button className="btn secondary" onClick={importCharacter}>Import character backup</button>
        <button className="btn secondary" onClick={importBuild}>Import build JSON</button>
        <button className="btn secondary" onClick={reloadBuild}>Reload current build JSON</button>
      </div>
    </section>

    <section className="panel build-file-panel">
      <div className="section-head"><div><span className="eyebrow">Build file information</span><h2>{visibleBuild.name}</h2></div><div className={`validation-pill ${validation?.valid ? 'valid' : 'invalid'}`}>{validation ? (validation.valid ? 'Valid schema 3' : `${validation.errors.length} validation issue${validation.errors.length === 1 ? '' : 's'}`) : 'Validating…'}</div></div>
      <dl className="build-info-grid">
        <dt>Build ID</dt><dd>{visibleBuild.id}</dd><dt>Game version</dt><dd>{visibleBuild.game_version}</dd>
        <dt>Verified</dt><dd>{visibleBuild.verified_date}</dd><dt>Schema</dt><dd>Version {visibleBuild.schema_version}</dd>
        <dt>Source</dt><dd>{buildRecord?.is_bundled ? 'Bundled JSON' : 'Imported JSON'}</dd><dt>Selected variant</dt><dd>{build.active_variant?.name || 'Base build'}</dd>
        <dt>SQLite database</dt><dd className="mono wide">{dbPath}</dd>
      </dl>
      {validation && !validation.valid && <div className="error-box">{validation.errors.map(error => <div key={error}>{error}</div>)}</div>}
    </section>

    <section className="panel json-panel">
      <div className="section-head"><div><span className="eyebrow">Human-readable JSON</span><h2>Build data</h2></div><div className="json-controls"><select value={mode} onChange={event => setMode(event.target.value)}><option value="effective">Selected variant / effective build</option><option value="base">Base build</option></select><button className="btn secondary" onClick={copyJson}>Copy</button><button className="btn secondary" onClick={saveJson}>Save JSON</button></div></div>
      <p className="json-help">Schema 3 stores individual equipment slots, acquisition details, explicit hotbar positions, ultimate slots, and structured rotation steps. Community builds remain ordinary indented JSON.</p>
      <pre className="json-viewer">{json}</pre>
    </section>
  </div>
}
