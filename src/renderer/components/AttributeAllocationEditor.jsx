import NumberStepper from './NumberStepper'

export default function AttributeAllocationEditor({ value = {}, onChange, recommended, onApplyRecommendation }) {
  const attributes = { magicka: 0, health: 0, stamina: 0, ...value }
  const total = attributes.magicka + attributes.health + attributes.stamina
  const patch = (key, next) => onChange({ ...attributes, [key]: next })
  return <div className="attribute-editor-card">
    <div className="attribute-editor-head"><div><b>Attribute target</b><small>Recommended build target, not the character’s current spent points.</small></div><span className={total > 64 ? 'over' : ''}>{total}/64</span></div>
    <div className="attribute-editor-grid">
      {['magicka', 'health', 'stamina'].map(key => <label key={key}><span>{key[0].toUpperCase() + key.slice(1)}</span><NumberStepper value={attributes[key]} min={0} max={64} onChange={next => patch(key, next)} label={`${key} attribute points`} /></label>)}
    </div>
    {recommended && <div className="attribute-recommendation"><small>Common starting target: {recommended.magicka} Magicka / {recommended.health} Health / {recommended.stamina} Stamina</small><button type="button" className="btn ghost compact" onClick={onApplyRecommendation}>Apply</button></div>}
    {total > 64 && <div className="warn-text">Attribute points total more than 64. The build cannot be saved until this is corrected.</div>}
  </div>
}
