import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function barSkills(bar = {}) {
  return [...(bar.slots || []).map(slot => slot?.name || slot?.catalog_skill_id || 'Open slot'), bar.ultimate?.name || bar.ultimate?.catalog_skill_id || 'No ultimate']
}

function PreviewBar({ title, bar }) {
  return <div className="preview-hotbar"><div><span>{title}</span><b>{bar?.weapon || 'Weapon not set'}</b></div><div>{barSkills(bar).map((name, index) => <span key={`${index}-${name}`} className={index === 5 ? 'ultimate' : ''}><small>{index === 5 ? 'U' : index + 1}</small>{name}</span>)}</div></div>
}

export default function BuildPreviewModal({ data, catalog, onClose }) {
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  if (!data) return null
  const defaults = data.defaults || {}
  const lineNames = new Map((catalog?.lines || []).map(line => [line.id, line.name]))
  const metadata = data.metadata || {}
  const phases = data.phases || []
  const firstPhase = phases[0]
  const finalPhase = phases[phases.length - 1]
  const finalGear = (data.gear_stages || [])[Math.max(0, (data.gear_stages || []).length - 1)]
  return createPortal(<div className="preview-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="build-preview-title">
      <header><div><span className="eyebrow">Recovery draft preview</span><h1 id="build-preview-title">{data.name || 'Untitled Build'}</h1><p>{data.summary || 'No build summary has been written yet.'}</p></div><button className="btn ghost compact" onClick={onClose}>Close Preview</button></header>
      <div className="preview-modal-scroll">
        <div className="preview-badges">{[defaults.class, defaults.race, defaults.mundus, ...(metadata.roles || []), data.game_version].filter(Boolean).map(value => <span key={value}>{value}</span>)}</div>
        <section className="preview-hero-grid">
          <article><small>Class</small><b>{defaults.class || 'Not set'}</b></article><article><small>Race</small><b>{defaults.race || 'Not set'}</b></article><article><small>Alliance</small><b>{defaults.alliance || 'Not set'}</b></article><article><small>Attributes</small><b>{Number(defaults.attributes?.magicka) || 0}M / {Number(defaults.attributes?.health) || 0}H / {Number(defaults.attributes?.stamina) || 0}S</b></article>
        </section>
        <section className="preview-section"><div className="section-head"><div><span className="eyebrow">Class setup</span><h2>Active skill lines</h2></div></div><div className="preview-line-grid">{(data.class_configuration?.active_class_lines || []).map((line, index) => <article key={line.line_id || index}><small>Slot {index + 1} · {line.mode || 'native'}</small><b>{lineNames.get(line.line_id) || line.line_id || 'Not set'}</b><span>{line.source_class || defaults.class || ''}</span></article>)}</div></section>
        {firstPhase && <section className="preview-section"><div className="section-head"><div><span className="eyebrow">First progression phase</span><h2>{firstPhase.name || firstPhase.id}</h2><p>{firstPhase.overview || ''}</p></div></div><PreviewBar title="Front Bar" bar={firstPhase.front_bar} />{Number(metadata.bar_count || 2) > 1 && <PreviewBar title="Back Bar" bar={firstPhase.back_bar} />}</section>}
        {finalPhase && finalPhase !== firstPhase && <section className="preview-section"><div className="section-head"><div><span className="eyebrow">Final progression phase</span><h2>{finalPhase.name || finalPhase.id}</h2><p>{finalPhase.overview || ''}</p></div></div><PreviewBar title="Front Bar" bar={finalPhase.front_bar} />{Number(metadata.bar_count || 2) > 1 && <PreviewBar title="Back Bar" bar={finalPhase.back_bar} />}</section>}
        <section className="preview-section preview-two-column"><div><span className="eyebrow">Final equipment</span><h2>{finalGear?.name || 'No final gear stage'}</h2><p>{finalGear?.summary || finalGear?.notes || 'Add an equipment roadmap to show it here.'}</p><div className="preview-list">{(finalGear?.sets || []).map(set => <span key={set.id || set.name}>{set.name || set.id}</span>)}</div></div><div><span className="eyebrow">Champion bars</span><h2>Final slottables</h2>{Object.entries(data.cp_plans || {}).map(([tree, plan]) => <p key={tree}><b>{tree}</b>: {(plan?.final_slots || []).join(', ') || 'None selected'}</p>)}</div></section>
        <section className="preview-section preview-two-column"><div><span className="eyebrow">Loadouts</span><h2>{(data.loadouts || []).length} complete setup{(data.loadouts || []).length === 1 ? '' : 's'}</h2><div className="preview-list">{(data.loadouts || []).map(loadout => <span key={loadout.id}>{loadout.name}</span>)}</div></div><div><span className="eyebrow">Variants</span><h2>{(data.variants || []).length} smaller alternative{(data.variants || []).length === 1 ? '' : 's'}</h2><div className="preview-list">{(data.variants || []).map(variant => <span key={variant.id}>{variant.name}</span>)}</div></div></section>
      </div>
    </section>
  </div>, document.body)
}
