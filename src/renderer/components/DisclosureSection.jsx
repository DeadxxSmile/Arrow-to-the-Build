export function DisclosureToolbar({ onExpandAll, onCollapseAll, expandDisabled = false, collapseDisabled = false, label = 'Section controls' }) {
  return <div className="disclosure-toolbar" aria-label={label}>
    <button type="button" className="btn ghost compact" onClick={onExpandAll} disabled={expandDisabled}>Expand all</button>
    <span aria-hidden="true">·</span>
    <button type="button" className="btn ghost compact" onClick={onCollapseAll} disabled={collapseDisabled}>Collapse all</button>
  </div>
}

export default function DisclosureSection({ open, onToggle, title, eyebrow, summary, meta, children, className = '', id, action = null }) {
  return <section className={`disclosure-section ${open ? 'open' : ''} ${className}`} id={id}>
    <div className="disclosure-heading-row">
      <button type="button" className="disclosure-trigger" aria-expanded={open} onClick={onToggle}>
        <div className="disclosure-title-copy">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h3>{title}</h3>
          {summary && <p>{summary}</p>}
        </div>
        {meta && <div className="disclosure-meta"><span>{meta}</span></div>}
      </button>
      {action && <div className="disclosure-action">{action}</div>}
    </div>
    {open && <div className="disclosure-content">{children}</div>}
    <button type="button" className="disclosure-toggle-rail" onClick={onToggle} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}>
      <i aria-hidden="true">⌄</i>
    </button>
  </section>
}
