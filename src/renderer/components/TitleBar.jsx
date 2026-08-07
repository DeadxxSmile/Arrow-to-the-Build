import { useEffect, useState } from 'react'

export default function TitleBar() {
  const [max, setMax] = useState(false)
  useEffect(() => {
    window.api.window.isMaximized().then(setMax)
    window.api.window.onMaximized(setMax)
    return () => window.api.window.offMaximized()
  }, [])
  return <div className="titlebar">
    <div className="titlebar-drag" />
    <div className="titlebar-brand"><img src="./logo.png" alt="" /><span>Arrow to the Build</span><b>ATTB</b></div>
    <div className="titlebar-controls">
      <button onClick={() => window.api.window.minimize()} aria-label="Minimize">−</button>
      <button onClick={() => window.api.window.maximize()} aria-label={max ? 'Restore' : 'Maximize'}>{max ? '❐' : '□'}</button>
      <button className="close" onClick={() => window.api.window.close()} aria-label="Close">×</button>
    </div>
  </div>
}
