import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const groups = [
  { title: 'Official and reference', items: [
    ['The Elder Scrolls Online', 'Official news, patch notes, account help, and community links.', 'https://www.elderscrollsonline.com/'],
    ['UESP', 'Long-running community wiki with quests, maps, systems, items, and mechanics.', 'https://en.uesp.net/wiki/Online:Online'],
    ['ESO-Hub', 'Skill, set, antiquity, map, build-editor, and database tools.', 'https://eso-hub.com/']
  ]},
  { title: 'Builds and combat', items: [
    ['Skinny Cheeks', 'Current PvE damage-dealer explanations, class notes, and build options.', 'https://www.skinnycheeks.gg/'],
    ['Hyperioxes', 'Detailed role and solo build guides with practical explanations.', 'https://hyperioxes.com/eso'],
    ['ESO Logs', 'Combat-log analysis for learning encounters and comparing performance.', 'https://www.esologs.com/']
  ]},
  { title: 'Add-ons and trading', items: [
    ['ESOUI', 'The primary PC add-on directory and developer community.', 'https://www.esoui.com/addons.php'],
    ['Tamriel Trade Centre', 'Player-market listing and price research tools.', 'https://tamrieltradecentre.com/']
  ]},
  { title: 'Project and creator', items: [
    ['ATTB on GitHub', 'Source code, releases, issue reporting, documentation, and contributions.', 'https://github.com/DeadxxSmile/Arrow-to-the-Build'],
    ['Buy Me a Coffee', 'Support continued development of Arrow to the Build.', 'https://buymeacoffee.com/deadx_xsmile'],
    ['Deadx_xSmile Linktree', 'Find Deadx_xSmile on Twitch, YouTube, TikTok, X, and other platforms.', 'https://linktr.ee/deadx_xsmile']
  ]}
]

export default function ResourcesPage() {
  const [notice, setNotice] = useState('')
  const open = async url => {
    try { await window.api.external.open(url) }
    catch (error) { setNotice(error.message || 'That link could not be opened.') }
  }
  return <div className="page">
    <div className="page-title"><NavLink to="/help" className="reference-back">‹ Help &amp; Tools</NavLink><span className="eyebrow">Trusted starting points</span><h1>Resources &amp; project links</h1><p>Useful sites for ESO research, builds, mechanics, add-ons, trading, ATTB development, and the creator. Links open in your normal browser.</p></div>
    {notice && <div className="error-box" role="alert">{notice}</div>}
    <div className="resource-groups">{groups.map(group => <section className="panel" key={group.title}><div className="section-head"><div><span className="eyebrow">External links</span><h2>{group.title}</h2></div></div><div className="resource-list">{group.items.map(([name, description, url]) => <button type="button" key={name} onClick={() => open(url)}><span><b>{name}</b><small>{description}</small></span><i aria-hidden="true">↗</i></button>)}</div></section>)}</div>
    <div className="quiet-box resource-disclaimer">ATTB is not affiliated with the external ESO resources listed above. Opening any link does not send character data or download anything into ATTB.</div>
  </div>
}
