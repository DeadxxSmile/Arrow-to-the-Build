import { NavLink, useLocation } from 'react-router-dom'
import BuildSetupGuide from '../components/BuildSetupGuide'
import useFlashNotice from '../hooks/useFlashNotice'

export default function BuildSetupGuidePage() {
  const { notice, flash } = useFlashNotice()
  const location = useLocation()
  const helpContext = location.pathname.startsWith('/help')

  return <div className="page build-setup-page">
    <div className="page-title">
      {helpContext && <NavLink to="/help" className="reference-back">‹ Help &amp; Tools</NavLink>}
      <span className="eyebrow">{helpContext ? 'Help & Tools guides' : 'Build Editor guide'}</span>
      <h1>{helpContext ? 'ATTB Guides' : 'Build Setup Guide'}</h1>
      <p>{helpContext ? 'Learn ATTB, author or troubleshoot build JSON, and understand how the ESO addon and desktop app work together.' : 'Use the guided authoring reference while creating, validating, importing, or hand-editing a Schema 4 build.'}</p>
    </div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <BuildSetupGuide flash={flash} />
  </div>
}
