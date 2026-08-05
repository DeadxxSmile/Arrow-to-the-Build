import React from 'react'

// One bad build file used to white-screen the whole app with no way back to Settings.
export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ATTB]', error, info?.componentStack) }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page error-page">
        <div className="page-title">
          <span className="eyebrow">Something broke</span>
          <h1>This page could not be drawn</h1>
          <p>Usually this means the current build JSON is missing a section the page expects. Your saved progress is untouched.</p>
        </div>
        <pre className="error-detail">{String(this.state.error?.message || this.state.error)}</pre>
        <div className="button-row">
          <button className="btn secondary" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="btn primary" onClick={() => { window.location.hash = '#/settings'; this.setState({ error: null }) }}>Open Settings</button>
        </div>
      </div>
    )
  }
}
