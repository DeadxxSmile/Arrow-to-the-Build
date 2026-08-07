export default function ChoiceChips({ values = [], options = [], onChange, name = 'choice', single = false }) {
  const selected = new Set(values)
  const toggle = value => {
    if (single) return onChange([value])
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }
  return <div className="choice-chips" role={single ? 'radiogroup' : 'group'} aria-label={name}>
    {options.map(option => {
      const value = typeof option === 'string' ? option : option.value
      const label = typeof option === 'string' ? option : option.label
      const active = selected.has(value)
      return <button key={value} type="button" className={active ? 'active' : ''} aria-pressed={active} onClick={() => toggle(value)}>{label}</button>
    })}
  </div>
}
