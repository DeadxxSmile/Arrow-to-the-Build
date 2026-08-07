import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import ChoiceChips from '../components/ChoiceChips'
import { FieldLabel } from '../components/GuidancePopover'
import {
  buildEditorGuidance, classes, races, recommendedRace, resourceGuidance, roleDefaults, roleGuidance
} from '../utils/buildEditorGuidance'

const roleOptions = ['damage', 'healer', 'tank', 'support', 'solo'].map(value => ({ value, label: buildEditorGuidance.roles[value].label }))
const resourceOptions = [{ value: 'magicka', label: 'Magicka' }, { value: 'stamina', label: 'Stamina' }, { value: 'health', label: 'Health-focused' }, { value: 'hybrid', label: 'Hybrid' }]

export default function NewBuildPage() {
  const { editor, reloadBuilds, appSettings } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [showGuided, setShowGuided] = useState(false)
  const [form, setForm] = useState(() => ({
    name: '', class_name: 'Arcanist', primary_role: 'damage', resource: 'stamina', race: 'Dark Elf',
    alliance: 'Ebonheart Pact', mundus: 'The Thief', bar_count: 2, leveling_scope: 'full', class_style: 'pure_class',
    content: ['overland', 'dungeons', 'arenas'], group_sizes: ['solo', 'duo', '4-player']
  }))
  const resource = useMemo(() => resourceGuidance(form.resource), [form.resource])
  const showGuidance = appSettings.build_editor_show_guidance !== 'false'
  const patch = value => setForm(current => ({ ...current, ...value }))

  const run = async (name, task) => {
    setBusy(name); setNotice('')
    try { await task() }
    catch (error) { setNotice(error.message || 'Build creation failed.') }
    finally { setBusy('') }
  }

  const createBlank = () => run('blank', async () => {
    await editor.createBlankDraft()
    navigate('/build-editor/overview')
  })
  const createGuided = () => run('guided', async () => {
    if (!form.name.trim()) throw new Error('Give the build a name before creating it.')
    await editor.createGuidedDraft(form)
    navigate('/build-editor/overview')
  })
  const importBuild = () => run('import', async () => {
    const result = await window.api.builds.importFile()
    if (!result) return
    await reloadBuilds()
    await editor.openDraft(result.id)
    navigate('/build-editor/overview')
  })
  const changeRole = next => {
    const role = next[0]
    const defaults = roleDefaults(role)
    const nextResource = defaults.resource || form.resource
    const nextGuide = resourceGuidance(nextResource)
    const race = recommendedRace(nextResource, role)
    patch({
      primary_role: role, resource: nextResource, race,
      alliance: buildEditorGuidance.races[race]?.alliance || 'Any Alliance', mundus: defaults.mundus || nextGuide.mundus?.[0] || form.mundus,
      bar_count: defaults.bar_count || 2, content: defaults.content || form.content, group_sizes: defaults.group_sizes || form.group_sizes
    })
  }
  const changeResource = next => {
    const value = next[0]
    const guide = resourceGuidance(value)
    const race = recommendedRace(value, form.primary_role)
    patch({ resource: value, race, alliance: buildEditorGuidance.races[race]?.alliance || 'Any Alliance', mundus: guide.mundus?.[0] || form.mundus })
  }

  return <div className="page new-build-page">
    <div className="page-title"><span className="eyebrow">Build Editor</span><h1>Create New Build</h1><p>Choose a guided starting point, begin from the advanced template, fork a working build, or import community JSON.</p></div>
    {notice && <div className="notice-banner" role="status">{notice}</div>}
    <div className="new-build-choice-grid">
      <article className={`panel new-build-choice ${showGuided ? 'selected' : ''}`}><span className="build-kind editable">Recommended</span><div><h2>Guided Build</h2><p>Answer the important identity, role, resource, and progression questions. ATTB creates a valid class-specific scaffold with starter bars and leveling phases.</p></div><button type="button" className="btn primary" onClick={() => setShowGuided(value => !value)}>{showGuided ? 'Hide Guided Setup' : 'Start Guided Setup'}</button></article>
      <article className="panel new-build-choice"><span className="build-kind editable">Advanced</span><div><h2>Blank Advanced Build</h2><p>Start with the complete Schema 4 authoring template, including example fields that you replace manually.</p></div><button type="button" className="btn secondary" disabled={busy === 'blank'} onClick={createBlank}>{busy === 'blank' ? 'Creating…' : 'Create Blank Draft'}</button></article>
      <article className="panel new-build-choice"><span className="build-kind editable">Existing foundation</span><div><h2>Fork Existing Build</h2><p>Choose a bundled or user build and create a distinct editable copy with preserved ancestry.</p></div><button type="button" className="btn secondary" onClick={() => navigate('/build-editor/library')}>Choose Build to Fork</button></article>
      <article className="panel new-build-choice"><span className="build-kind editable">Community file</span><div><h2>Import JSON</h2><p>Validate a build file, add it to the editable library, and open its recovery draft immediately.</p></div><button type="button" className="btn secondary" disabled={busy === 'import'} onClick={importBuild}>{busy === 'import' ? 'Importing…' : 'Import Build JSON'}</button></article>
    </div>

    {showGuided && <section className="panel guided-build-form section-block">
      <div className="section-head"><div><span className="eyebrow">Guided foundation</span><h2>Tell ATTB what you are building</h2></div><small>{buildEditorGuidance.notice}</small></div>
      <div className="form-grid two">
        <label><FieldLabel guidance={showGuidance ? { title: 'Build name', summary: 'The public name shown in the library and character selector. ATTB generates a permanent ID when the draft is created.' } : null}>Build name</FieldLabel><input autoFocus value={form.name} maxLength={120} onChange={event => patch({ name: event.target.value })} placeholder="Example: Stamina Arcanist Flexible PvE" /></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Base class', summary: buildEditorGuidance.classes[form.class_name]?.summary, common: buildEditorGuidance.classes[form.class_name]?.themes || [] } : null}>Base class</FieldLabel><select value={form.class_name} onChange={event => patch({ class_name: event.target.value })}>{classes.map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Primary role', summary: roleGuidance(form.primary_role)?.summary } : null}>Primary role</FieldLabel><ChoiceChips name="Primary role" single values={[form.primary_role]} options={roleOptions} onChange={changeRole} /></div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Primary resource', summary: resource.summary, common: resource.races?.map(race => `Common race: ${race}`) || [], notes: ['Role and encounter needs matter more than following a class stereotype.'] } : null}>Primary resource</FieldLabel><ChoiceChips name="Primary resource" single values={[form.resource]} options={resourceOptions} onChange={changeResource} /></div>
      <div className="form-grid three">
        <label><FieldLabel guidance={showGuidance ? { title: 'Race recommendation', summary: buildEditorGuidance.races[form.race]?.summary, common: buildEditorGuidance.races[form.race]?.common_for || [], notes: ['Race is a recommendation, not a requirement.'] } : null}>Suggested race</FieldLabel><select value={form.race} onChange={event => patch({ race: event.target.value, alliance: buildEditorGuidance.races[event.target.value]?.alliance || form.alliance })}>{races.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Alliance', summary: 'Alliance is mainly a PvP and character identity choice. Any Race, Any Alliance access can remove the default race restriction.' } : null}>Alliance</FieldLabel><select value={form.alliance} onChange={event => patch({ alliance: event.target.value })}>{buildEditorGuidance.alliances.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><FieldLabel guidance={showGuidance ? { title: 'Mundus Stone', summary: 'The suggested Mundus follows the selected role and resource. It can be changed freely later.', common: resource.mundus || [] } : null}>Mundus</FieldLabel><select value={form.mundus} onChange={event => patch({ mundus: event.target.value })}>{buildEditorGuidance.mundus_options.map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Leveling coverage', summary: 'Full progression creates early and level-15 phases. Endgame-focused still creates a valid scaffold but labels the build as endgame-oriented.' } : null}>Progression coverage</FieldLabel><ChoiceChips name="Progression coverage" single values={[form.leveling_scope]} options={[{ value: 'full', label: 'Full leveling plan' }, { value: 'endgame', label: 'Endgame-focused' }]} onChange={next => patch({ leveling_scope: next[0] })} /></div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Class direction', summary: 'Pure class starts with all three native lines. Flexible records that subclass alternatives may be added later in Class Configuration.' } : null}>Class direction</FieldLabel><ChoiceChips name="Class direction" single values={[form.class_style]} options={[{ value: 'pure_class', label: 'Pure class' }, { value: 'flexible', label: 'Decide / add subclassing later' }]} onChange={next => patch({ class_style: next[0] })} /></div>
      <div className="guided-question"><FieldLabel guidance={showGuidance ? { title: 'Ability bars', summary: 'Two bars use weapon swapping after level 15. One-bar builds keep the back bar intentionally unavailable.' } : null}>Bar count</FieldLabel><ChoiceChips name="Bar count" single values={[String(form.bar_count)]} options={[{ value: '2', label: 'Two bars' }, { value: '1', label: 'One bar' }]} onChange={next => patch({ bar_count: Number(next[0]) })} /></div>
      <div className="guided-actions"><button type="button" className="btn primary" disabled={busy === 'guided'} onClick={createGuided}>{busy === 'guided' ? 'Creating guided draft…' : 'Create Guided Draft'}</button><span>Starter choices remain editable. The permanent build ID is generated from the name.</span></div>
    </section>}
  </div>
}
