import InfoPopover from './InfoPopover'
import { buildEditorGuidance } from '../utils/buildEditorGuidance'

export default function GuidancePopover({ title, summary, common = [], alternatives = [], notes = [], label }) {
  const lists = [
    common.length ? ['Common starting points', common] : null,
    alternatives.length ? ['Alternatives', alternatives] : null,
    notes.length ? ['Keep in mind', notes] : null
  ].filter(Boolean)
  return <InfoPopover label={label || `Guidance for ${title}`} title={title}>
    {summary && <p>{summary}</p>}
    {lists.map(([heading, items]) => <div className="guidance-popover-list" key={heading}><strong>{heading}</strong><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}
    <small className="guidance-version">Reviewed for {buildEditorGuidance.game_version} · {buildEditorGuidance.verified_date}</small>
  </InfoPopover>
}

export function FieldLabel({ children, guidance }) {
  return <span className="field-label-with-help"><span>{children}</span>{guidance && <GuidancePopover {...guidance} />}</span>
}
