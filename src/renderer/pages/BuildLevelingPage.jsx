import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import AttributeAllocationEditor from '../components/AttributeAllocationEditor'
import NumberStepper from '../components/NumberStepper'
import SkillIcon from '../components/SkillIcon'
import { phaseQualityWarnings, plannedBarChoices, slugifyEditorId } from '../utils/buildEditorSkillLogic'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'
import { resolveProgressionScope } from '../../shared/progressionScope.mjs'

function uniquePhaseId(phases, seed) {
  const used = new Set((phases || []).map(phase => phase.id))
  const base = slugifyEditorId(seed || 'phase')
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function skillSlot(choice) {
  return choice ? {
    name: choice.name,
    catalog_skill_id: choice.id,
    temporary: choice.row?.status === 'temporary' || undefined
  } : null
}

function emptyRotation() {
  return { type: 'priority', title: 'Priority system', summary: '', opener: [], steps: [], execute: [], notes: [] }
}

function newPhase(phases, data, copy = null) {
  if (copy) {
    const clone = structuredClone(copy)
    clone.id = uniquePhaseId(phases, `${copy.id}-copy`)
    clone.label = `${copy.label} Copy`
    return clone
  }
  const last = phases?.[phases.length - 1]
  const start = last && Number(last.max_level) < 50 ? Number(last.max_level) + 1 : 50
  const end = start >= 50 ? 9999 : start
  return {
    id: uniquePhaseId(phases, start >= 50 ? 'endgame' : `level-${start}`),
    label: start >= 50 ? 'Endgame' : `Level ${start}`,
    min_level: start,
    max_level: end,
    overview: 'Describe what changes during this progression phase.',
    attributes: { magicka: 0, health: 0, stamina: 0, ...(data.defaults?.attributes || {}) },
    recommended_gear_stage_ids: [],
    milestones: [],
    front_bar: { weapon: data.defaults?.front_weapon || '', slots: [], ultimate: null },
    back_bar: Number(data.metadata?.bar_count || 2) === 1
      ? { weapon: 'One-bar setup', locked: 'This build intentionally uses one active bar', slots: [], ultimate: null }
      : { weapon: data.defaults?.back_weapon || '', slots: [], ultimate: null },
    rotation: emptyRotation()
  }
}


function phaseDifferences(previous, current) {
  if (!previous) return []
  const changes = []
  const skillNames = bar => new Map([...(bar?.slots || []), ...(bar?.ultimate ? [bar.ultimate] : [])].filter(row => row?.catalog_skill_id).map(row => [row.catalog_skill_id, row.name]))
  for (const [label, oldBar, newBar] of [['Front bar', previous.front_bar, current.front_bar], ['Back bar', previous.back_bar, current.back_bar]]) {
    if ((oldBar?.weapon || '') !== (newBar?.weapon || '')) changes.push(`${label} weapon: ${oldBar?.weapon || 'none'} -> ${newBar?.weapon || 'none'}`)
    const oldSkills = skillNames(oldBar), newSkills = skillNames(newBar)
    for (const [id, name] of newSkills) if (!oldSkills.has(id)) changes.push(`+ ${name} (${label})`)
    for (const [id, name] of oldSkills) if (!newSkills.has(id)) changes.push(`- ${name} (${label})`)
  }
  const oldAttributes = previous.attributes || {}, newAttributes = current.attributes || {}
  if (['magicka', 'health', 'stamina'].some(key => Number(oldAttributes[key] || 0) !== Number(newAttributes[key] || 0))) {
    changes.push(`Attributes: ${Number(newAttributes.magicka || 0)} Magicka / ${Number(newAttributes.health || 0)} Health / ${Number(newAttributes.stamina || 0)} Stamina`)
  }
  if ((previous.rotation?.type || 'priority') !== (current.rotation?.type || 'priority')) changes.push(`Rotation style: ${previous.rotation?.type || 'priority'} -> ${current.rotation?.type || 'priority'}`)
  return changes
}

function patchPhase(data, index, updater) {
  const phases = [...(data.phases || [])]
  const current = phases[index]
  if (!current) return data
  phases[index] = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
  return { ...data, phases }
}

function movePhase(data, index, direction) {
  const phases = [...(data.phases || [])]
  const target = index + direction
  if (index < 0 || target < 0 || target >= phases.length) return data
  ;[phases[index], phases[target]] = [phases[target], phases[index]]
  return { ...data, phases }
}

function BarEditor({ title, barKey, phase, choices, onChange, oneBar }) {
  const bar = phase[barKey] || { weapon: '', slots: [], ultimate: null }
  const normalChoices = choices.filter(choice => !choice.ultimate)
  const ultimateChoices = choices.filter(choice => choice.ultimate)
  const setBar = next => onChange({ ...phase, [barKey]: next })
  const setSlot = (index, skillId) => {
    const slots = [...(bar.slots || [])]
    if (!skillId) slots.splice(index, 1)
    else {
      const choice = normalChoices.find(item => item.id === skillId)
      if (!choice) return
      slots[index] = skillSlot(choice)
    }
    setBar({ ...bar, slots: slots.filter(Boolean).slice(0, 5) })
  }
  const setUltimate = skillId => {
    const choice = ultimateChoices.find(item => item.id === skillId)
    setBar({ ...bar, ultimate: choice ? skillSlot(choice) : null })
  }
  const disabled = barKey === 'back_bar' && oneBar

  return <section className={`leveling-bar-editor ${disabled ? 'disabled' : ''}`}>
    <div className="leveling-bar-head"><div><span className="eyebrow">{title}</span><h3>{bar.weapon || 'Weapon not specified'}</h3></div>{disabled && <span className="current-pill">one-bar build</span>}</div>
    <div className="form-grid two">
      <label><span>Weapon label</span><input disabled={disabled} value={bar.weapon || ''} onChange={event => setBar({ ...bar, weapon: event.target.value })} placeholder="Dual Daggers, Inferno Staff…" /></label>
      <label><span>Lock or availability note</span><input disabled={disabled} value={bar.locked || ''} onChange={event => setBar({ ...bar, locked: event.target.value || undefined })} placeholder={barKey === 'back_bar' ? 'Unlocks at character level 15' : 'Optional note'} /></label>
    </div>
    <div className="leveling-hotbar-editor">
      {Array.from({ length: 5 }, (_, index) => {
        const current = bar.slots?.[index]
        return <label className="leveling-hotbar-slot" key={index}><span>{index + 1}</span><SkillIcon skillId={current?.catalog_skill_id} name={current?.name || `Slot ${index + 1}`} /><select disabled={disabled} value={current?.catalog_skill_id || ''} onChange={event => setSlot(index, event.target.value)}><option value="">Open slot</option>{normalChoices.map(choice => <option key={choice.id} value={choice.id}>{choice.name} · {choice.line}</option>)}</select></label>
      })}
      <label className="leveling-hotbar-slot ultimate"><span>R</span><SkillIcon skillId={bar.ultimate?.catalog_skill_id} name={bar.ultimate?.name || 'Ultimate'} /><select disabled={disabled} value={bar.ultimate?.catalog_skill_id || ''} onChange={event => setUltimate(event.target.value)}><option value="">No ultimate selected</option>{ultimateChoices.map(choice => <option key={choice.id} value={choice.id}>{choice.name} · {choice.line}</option>)}</select></label>
    </div>
  </section>
}

function RotationList({ title, rows, choices, onChange, allowEmpty = true }) {
  const add = () => onChange([...(rows || []), { name: '', catalog_skill_id: undefined }])
  const patch = (index, value) => {
    const next = [...(rows || [])]
    next[index] = { ...next[index], ...value }
    onChange(next)
  }
  const remove = index => onChange((rows || []).filter((_, rowIndex) => rowIndex !== index))
  const move = (index, direction) => {
    const next = [...(rows || [])]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return <div className="rotation-list-editor"><div className="rotation-list-head"><b>{title}</b><button type="button" className="btn compact secondary" onClick={add}>+ Add step</button></div>
    <div className="rotation-editor-rows">{(rows || []).map((row, index) => <article key={index}>
      <span>{index + 1}</span>
      <select value={row.catalog_skill_id || ''} onChange={event => {
        const choice = choices.find(item => item.id === event.target.value)
        patch(index, choice ? { catalog_skill_id: choice.id, name: choice.name } : { catalog_skill_id: undefined })
      }}><option value="">Instruction only</option>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select>
      <input value={row.name || ''} onChange={event => patch(index, { name: event.target.value })} placeholder="Cast skill, refresh effect, build resource…" />
      <div><button type="button" className="btn compact ghost" disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" className="btn compact ghost" disabled={index === rows.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" className="btn compact danger" onClick={() => remove(index)}>×</button></div>
    </article>)}{allowEmpty && !(rows || []).length && <div className="quiet-box compact">No steps added.</div>}</div>
  </div>
}

function PhaseEditor({ data, phase, previousPhase, index, choices, onUpdate, onMove, onDuplicate, onDelete, canDelete }) {
  const [open, setOpen] = useState(index === 0)
  const warnings = phaseQualityWarnings(data, phase)
  const differences = phaseDifferences(previousPhase, phase)
  const rotation = phase.rotation || emptyRotation()
  const patch = value => onUpdate(typeof value === 'function' ? value : current => ({ ...current, ...value }))
  const patchRotation = value => patch(current => ({ ...current, rotation: { ...(current.rotation || emptyRotation()), ...value } }))
  const oneBar = Number(data.metadata?.bar_count || 2) === 1

  return <article className={`leveling-phase-card ${warnings.length ? 'has-warnings' : ''}`}>
    <button type="button" className="leveling-phase-summary" onClick={() => setOpen(value => !value)} aria-expanded={open}><div><span className="eyebrow">{phase.min_level}-{phase.max_level >= 9999 ? 'CP+' : phase.max_level}</span><h2>{phase.label || phase.id}</h2><p>{phase.overview || 'No phase overview yet.'}</p></div><div><span className="build-kind editable">{warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : 'Ready to edit'}</span><b>{open ? '−' : '+'}</b></div></button>
    {open && <div className="leveling-phase-body">
      <div className="phase-toolbar"><div><button type="button" className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button type="button" className="btn compact ghost" onClick={() => onMove(1)}>↓ Later</button><button type="button" className="btn compact secondary" onClick={onDuplicate}>Duplicate phase</button></div><button type="button" className="btn compact danger" disabled={!canDelete} onClick={onDelete}>Delete phase</button></div>
      <div className="form-grid three">
        <label><span>Phase name</span><input value={phase.label || ''} onChange={event => patch({ label: event.target.value })} /></label>
        <label><span>Minimum level</span><NumberStepper value={Number(phase.min_level) || 1} min={1} max={50} onChange={value => patch({ min_level: value, max_level: Math.max(value, Number(phase.max_level) || value) })} label="Minimum character level" /></label>
        <label><span>Maximum progression value</span><NumberStepper value={Number(phase.max_level) || 1} min={Number(phase.min_level) || 1} max={9999} onChange={value => patch({ max_level: value })} label="Maximum phase level or CP value" /></label>
        <label className="form-span-three"><span>Overview</span><textarea rows="3" value={phase.overview || ''} onChange={event => patch({ overview: event.target.value })} placeholder="What changes and what should the player focus on?" /></label>
      </div>

      {warnings.length > 0 && <div className="phase-warning-list"><b>Phase review</b><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
      {previousPhase && <div className="phase-difference-summary"><div><b>Changes from {previousPhase.label || previousPhase.id}</b><small>{differences.length ? 'ATTB found the following setup changes.' : 'This phase currently matches the previous phase in bars, attributes, and rotation style.'}</small></div>{differences.length > 0 && <ul>{differences.map(change => <li key={change}>{change}</li>)}</ul>}</div>}

      <section className="phase-subsection"><div className="section-head"><div><span className="eyebrow">Targets and milestones</span><h3>What the player should reach</h3></div></div>
        <AttributeAllocationEditor value={phase.attributes || data.defaults?.attributes || {}} onChange={attributes => patch({ attributes })} />
        <div className="form-grid two phase-support-fields">
          <label><span>Milestones, one per line</span><textarea rows="4" value={(phase.milestones || []).join('\n')} onChange={event => patch({ milestones: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) })} placeholder="Unlock weapon swapping\nMorph the main spammable" /></label>
          <fieldset><legend>Recommended gear stages</legend><div className="phase-gear-options">{(data.gear_stages || []).map(stage => {
            const selected = (phase.recommended_gear_stage_ids || []).includes(stage.id)
            return <label key={stage.id}><input type="checkbox" checked={selected} onChange={() => patch({ recommended_gear_stage_ids: selected ? (phase.recommended_gear_stage_ids || []).filter(id => id !== stage.id) : [...(phase.recommended_gear_stage_ids || []), stage.id] })} /><span>{stage.name}</span></label>
          })}</div></fieldset>
        </div>
      </section>

      <section className="phase-subsection"><div className="section-head"><div><span className="eyebrow">Skill bars</span><h3>Five abilities plus ultimate</h3></div><small>Only skills already present in the Unlock Plan appear here.</small></div>
        <div className="leveling-bars-grid"><BarEditor title="Front bar" barKey="front_bar" phase={phase} choices={choices} onChange={next => onUpdate(() => next)} oneBar={oneBar} /><BarEditor title="Back bar" barKey="back_bar" phase={phase} choices={choices} onChange={next => onUpdate(() => next)} oneBar={oneBar} /></div>
      </section>

      <section className="phase-subsection"><div className="section-head"><div><span className="eyebrow">Combat instructions</span><h3>Rotation or priority system</h3></div></div>
        <div className="form-grid three"><label><span>Style</span><select value={rotation.type || 'priority'} onChange={event => patchRotation({ type: event.target.value })}><option value="priority">Priority system</option><option value="sequence">Fixed sequence</option></select></label><label><span>Title</span><input value={rotation.title || ''} onChange={event => patchRotation({ title: event.target.value })} /></label><label><span>Summary</span><input value={rotation.summary || ''} onChange={event => patchRotation({ summary: event.target.value })} /></label></div>
        <RotationList title="Opening" rows={rotation.opener || []} choices={choices} onChange={opener => patchRotation({ opener })} />
        <RotationList title={rotation.type === 'priority' ? 'Priority order' : 'Main sequence'} rows={rotation.steps || []} choices={choices} onChange={steps => patchRotation({ steps })} allowEmpty={false} />
        <RotationList title="Execute changes" rows={rotation.execute || []} choices={choices} onChange={execute => patchRotation({ execute })} />
        <label className="rotation-notes-editor"><span>Rotation notes, one per line</span><textarea rows="3" value={(rotation.notes || []).join('\n')} onChange={event => patchRotation({ notes: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) })} /></label>
      </section>
    </div>}
  </article>
}

export default function BuildLevelingPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const draft = editor.draft
  if (!draft) return <BuildEditorEmptyState title="Build Phases" description="Open or create a draft before editing this section." />
  const data = draft.data
  const phases = data.phases || []
  const progressionScope = resolveProgressionScope(data)
  const phaseTitle = progressionScope.leveling_content_required ? 'Leveling Plan' : 'Build Phases'
  const phaseDescription = progressionScope.starting_point === 'cp160_plus'
    ? 'This build starts at CP160+. Author only the transition, bridge, or final phases the existing character actually needs; 1-50 phases are intentionally optional.'
    : progressionScope.starting_point === 'level_50'
      ? 'This build starts at Level 50. Author the CP160 transition and final setup without inventing levels 1-49 history.'
      : 'Build the step-by-step journey instead of only the final loadout. Each phase owns its level range, milestones, attributes, gear targets, hotbars, ultimate slots, and combat instructions.'
  const choices = useMemo(() => plannedBarChoices(data), [data.unlock_order])
  const update = updater => editor.updateDraft(updater)

  const deletePhase = async index => {
    if (phases.length <= 1) return
    const phase = phases[index]
    const ok = await dialog.confirm({ title: `Delete ${phase.label || phase.id}?`, message: 'This removes the phase, its hotbars, rotation, milestones, and phase-specific attribute targets.', confirmLabel: 'Delete Phase', danger: true })
    if (ok) update(current => ({ ...current, phases: (current.phases || []).filter((_, rowIndex) => rowIndex !== index) }))
  }

  return <div className="page build-editor-form-page build-leveling-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>{phaseTitle}</h1><p>{phaseDescription}</p></div>

    <section className="panel leveling-plan-summary"><div><span className="eyebrow">{progressionScope.leveling_content_required ? 'Progression timeline' : 'Build phase plan'}</span><h2>{phases.length} phase{phases.length === 1 ? '' : 's'} · {choices.length} planned bar skills</h2><p>Duplicate a working phase before changing it so bars and rotations carry forward without being rebuilt from scratch.</p></div><div className="button-row"><button type="button" className="btn secondary" onClick={() => update(current => ({ ...current, phases: [...(current.phases || []), newPhase(current.phases || [], current)] }))}>+ Add Empty Phase</button><button type="button" className="btn primary" onClick={() => update(current => ({ ...current, phases: [...(current.phases || []), newPhase(current.phases || [], current, current.phases?.[current.phases.length - 1])] }))} disabled={!phases.length}>Copy Last Phase</button></div></section>

    {!choices.length && <section className="panel warning-panel"><span className="eyebrow">Skills needed</span><h2>Add active skills before building bars</h2><p>Open Skills &amp; Passives and add abilities or ultimates to the Unlock Plan. Passive skills are intentionally excluded from hotbar choices.</p></section>}

    <div className="leveling-phase-list">{phases.map((phase, index) => <PhaseEditor key={phase.id} data={data} phase={phase} previousPhase={phases[index - 1] || null} index={index} choices={choices} canDelete={phases.length > 1} onUpdate={updater => update(current => patchPhase(current, index, updater))} onMove={direction => update(current => movePhase(current, index, direction))} onDuplicate={() => update(current => { const next = [...(current.phases || [])]; next.splice(index + 1, 0, newPhase(next, current, next[index])); return { ...current, phases: next } })} onDelete={() => deletePhase(index)} />)}</div>
  </div>
}
