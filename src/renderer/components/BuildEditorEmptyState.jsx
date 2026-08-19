import { useNavigate } from 'react-router-dom'

export default function BuildEditorEmptyState({ title, description = 'Open or create a draft before editing this section.' }) {
  const navigate = useNavigate()
  return <div className="page">
    <div className="page-title">
      <span className="eyebrow">Build Editor</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <section className="panel quiet-box">
      <b>No editable build is currently open.</b>
      <p>Open an editable build from the library, fork a bundled build, or create a new one to continue.</p>
      <div className="button-row">
        <button type="button" className="btn primary" onClick={() => navigate('/build-editor/library')}>Open Build Library</button>
        <button type="button" className="btn secondary" onClick={() => navigate('/build-editor/new')}>Create New Build</button>
      </div>
    </section>
  </div>
}
