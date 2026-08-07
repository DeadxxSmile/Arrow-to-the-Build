import { useEffect, useMemo, useState } from 'react'
import ChoiceChips from './ChoiceChips'
import { buildEditorGuidance } from '../utils/buildEditorGuidance'

const roleOptions = ['damage', 'healer', 'tank', 'support', 'solo'].map(value => ({ value, label: buildEditorGuidance.roles[value]?.label || value }))
const resourceOptions = [
  { value: 'magicka', label: 'Magicka' },
  { value: 'stamina', label: 'Stamina' },
  { value: 'health', label: 'Health-focused' },
  { value: 'hybrid', label: 'Hybrid' }
]

function slugify(value) {
  return String(value || 'build').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'build'
}
function cleanId(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9_.-]+/g, '-').replace(/^[._-]+|[._-]+$/g, '')
}

function inferResource(attributes = {}) {
  const rows = ['magicka', 'health', 'stamina'].map(key => [key, Number(attributes?.[key]) || 0]).sort((a, b) => b[1] - a[1])
  if (!rows[0][1] || rows[0][1] === rows[1]?.[1]) return 'hybrid'
  return rows[0][0]
}

export default function CharacterBuildSetupModal({
  open, character, defaultAuthor = 'NPC', title = 'Create a build from this character',
  intro = 'Set the permanent identity and planning basics first. ATTB will then seed the draft from the character\'s current ESO state.',
  submitLabel = 'Create Build', busy = false, error = '', onClose, onSubmit
}) {
  const defaultName = `${character?.name || character?.character_name || 'ESO Character'} Build`
  const inferred = useMemo(() => inferResource(character?.attributes || character?.live?.attributes || {}), [character])
  const [form, setForm] = useState(null)
  const [idTouched, setIdTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    const name = defaultName
    setForm({
      name,
      short_name: String(character?.name || character?.character_name || name).slice(0, 60),
      id: slugify(name),
      primary_role: 'damage',
      resource: inferred === 'health' ? 'health' : inferred,
      leveling_scope: 'full',
      bar_count: Number(character?.level || character?.live?.level || 1) >= 15 ? 2 : 1,
      class_style: 'pure_class',
      author: defaultAuthor || 'NPC'
    })
    setIdTouched(false)
  }, [open, defaultName, inferred, defaultAuthor, character?.level, character?.live?.level])

  if (!open || !form) return null
  const patch = value => setForm(current => ({ ...current, ...value }))
  const changeName = name => {
    const next = { name }
    if (!idTouched) next.id = slugify(name)
    patch(next)
  }
  const submit = event => {
    event.preventDefault()
    const cleanName = form.name.trim()
    const permanentId = cleanId(form.id)
    if (!cleanName || !permanentId || busy) return
    onSubmit({ ...form, name: cleanName, short_name: form.short_name.trim() || cleanName.slice(0, 60), id: permanentId })
  }

  return <div className="modal-backdrop character-build-setup-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <form className="modal character-build-setup-modal" role="dialog" aria-modal="true" aria-labelledby="character-build-setup-title" onSubmit={submit}>
      <div className="modal-head"><div><span className="eyebrow">Build setup</span><h2 id="character-build-setup-title">{title}</h2></div><button type="button" className="icon-btn" disabled={busy} onClick={onClose} aria-label="Close">×</button></div>
      <p className="modal-intro">{intro}</p>
      <div className="character-build-source"><div><small>ESO character</small><b>{character?.name || character?.character_name || 'Detected character'}</b></div><div><small>Class</small><b>{character?.class_name || character?.class || 'Detected from ESO'}</b></div><div><small>Level</small><b>{character?.level || character?.live?.level || 1}</b></div></div>
      <div className="form-grid two">
        <label><span>Build name</span><input autoFocus value={form.name} maxLength={120} onChange={event => changeName(event.target.value)} placeholder="Example: Talia Stamina Arcanist" /></label>
        <label><span>Short name</span><input value={form.short_name} maxLength={60} onChange={event => patch({ short_name: event.target.value })} /></label>
        <label className="form-span-two"><span>Permanent build ID</span><input className="mono" value={form.id} maxLength={120} onChange={event => { setIdTouched(true); patch({ id: cleanId(event.target.value) }) }} /><small>This ID becomes permanent when the build is created. Choose it now; later renaming the build will not change it.</small></label>
      </div>
      <div className="guided-question"><span>Primary role</span><ChoiceChips name="Imported build primary role" single values={[form.primary_role]} options={roleOptions} onChange={next => patch({ primary_role: next[0] })} /></div>
      <div className="guided-question"><span>Primary resource</span><ChoiceChips name="Imported build primary resource" single values={[form.resource]} options={resourceOptions} onChange={next => patch({ resource: next[0] })} /></div>
      <div className="character-build-setup-grid">
        <label><span>Progression coverage</span><select value={form.leveling_scope} onChange={event => patch({ leveling_scope: event.target.value })}><option value="full">Full leveling plan</option><option value="endgame">Endgame-focused</option></select></label>
        <label><span>Ability bars</span><select value={form.bar_count} onChange={event => patch({ bar_count: Number(event.target.value) })}><option value="2">Two bars</option><option value="1">One bar</option></select></label>
        <label><span>Class direction</span><select value={form.class_style} onChange={event => patch({ class_style: event.target.value })}><option value="pure_class">Pure class</option><option value="flexible">Flexible / subclass later</option></select></label>
      </div>
      <div className="quiet-box"><b>CURRENT comes from ESO.</b> These choices describe the build you want to author. Skills, attributes, equipment, bars, and Champion Points are imported from the latest snapshot without inventing older history.</div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="modal-footer"><button type="button" className="btn ghost" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="btn primary" disabled={busy || !form.name.trim() || !form.id.trim()}>{busy ? 'Creating…' : submitLabel}</button></div>
    </form>
  </div>
}
