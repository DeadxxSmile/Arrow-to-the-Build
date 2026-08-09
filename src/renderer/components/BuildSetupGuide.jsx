import { useEffect, useState } from 'react'
import MarkdownDocument from './MarkdownDocument'

const DOCUMENTS = [
  ['quick_start', 'Start Here', 'How ATTB turns visual editing into portable Schema 4 JSON.'],
  ['editor_guide', 'Visual Editor Guide', 'Every Build Editor page, workflow, draft, and revision tool.'],
  ['json_guide', 'Manual JSON Authoring', 'Hand-make or directly edit a complete Schema 4 build.'],
  ['ai_authoring', 'AI Build Authoring', 'Standalone prompt/manual for creating clean ATTB JSON with an AI assistant.'],
  ['format_and_ids', 'Format & Skill IDs', 'Compact field rules plus every bundled line and skill identifier.'],
  ['validation_help', 'Validation & Troubleshooting', 'Fix invalid builds, recover drafts, and resolve file-sync issues.'],
  ['addon_integration', 'ESO Addon & Sync', 'Install, link, refresh, and troubleshoot the optional ESO synchronization addon.']
]

export default function BuildSetupGuide({ flash }) {
  const [guide, setGuide] = useState(null)
  const [documentKey, setDocumentKey] = useState('quick_start')
  const [search, setSearch] = useState('')

  useEffect(() => { window.api.builds.getAuthoringGuide().then(setGuide).catch(error => flash(error.message)) }, [flash])

  return <section className="panel guide-reader">
    <div className="guide-reader-head"><div><span className="eyebrow">Complete offline documentation</span><h2>Build Editor, JSON &amp; AI guides</h2></div><label className="guide-search"><span>Search this page</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="guided builds, AI authoring, companions, skill IDs…" /></label></div>
    <nav className="guide-nav" aria-label="Build Setup Guide sections">{DOCUMENTS.map(([key, label, description]) => <button type="button" key={key} className={documentKey === key ? 'active' : ''} onClick={() => { setDocumentKey(key); setSearch('') }}><b>{label}</b><small>{description}</small></button>)}</nav>
    <div className="guide-document">{guide ? <MarkdownDocument markdown={guide[documentKey]} search={search} /> : <div className="quiet-box">Loading bundled guide…</div>}</div>
  </section>
}
