import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import ChoiceChips from '../components/ChoiceChips'
import { FieldLabel } from '../components/GuidancePopover'
import {
  buildEditorGuidance, classes, classGuidance, classLines, lineRecord, masteryLine, normalClassLines, rebaseBuildClass
} from '../utils/buildEditorGuidance'

function emptyPage() {
  return <div className="page"><div className="page-title"><span className="eyebrow">Current build</span><h1>Class Configuration</h1><p>Open or create a draft before editing this section.</p></div><section className="panel quiet-box">No editable build is currently open.</section></div>
}

export default function BuildClassConfigurationPage() {
  const { editor, appSettings } = useApp()
  const dialog = useAppDialog()
  const draft = editor.draft
  if (!draft) return emptyPage()
  const data = draft.data
  const cfg = data.class_configuration || {}
  const baseClass = cfg.base_class || data.defaults?.class || 'Arcanist'
  const selections = Array.isArray(cfg.active_class_lines) ? cfg.active_class_lines : []
  const nativeLines = classLines(baseClass)
  const mastery = masteryLine(baseClass)
  const usesForeign = selections.some(row => row.source_class && row.source_class !== baseClass)
  const showGuidance = appSettings.build_editor_show_guidance !== 'false'
  const patch = updater => editor.updateDraft(updater)

  const changeBaseClass = async nextClass => {
    if (nextClass === baseClass) return
    const ok = await dialog.confirm({
      title: `Change base class to ${nextClass}?`,
      message: 'This resets the three active class lines, class-specific starter unlock rows, starter hotbar skills, and rotation references. Gear, Champion Points, descriptions, and non-class skill lines remain.',
      confirmLabel: 'Change Class', cancelLabel: 'Keep Current Class', danger: true
    })
    if (!ok) return
    try { patch(current => rebaseBuildClass(current, nextClass)) }
    catch (error) { await dialog.alert({ title: 'Class could not be changed', message: error.message }) }
  }

  const resetPureClass = () => patch(current => {
    const lines = classLines(baseClass)
    const existing = current.class_configuration || {}
    return {
      ...current,
      metadata: { ...(current.metadata || {}), class_style: 'pure_class' },
      class_configuration: {
        ...existing, base_class: baseClass,
        active_class_lines: lines.map(line => ({ line_id: line.id, source_class: baseClass, mode: 'native', notes: [] })),
        class_mastery: { ...(existing.class_mastery || {}), enabled: false, points_available: 2, choices: [], notes: existing.class_mastery?.notes || [] }
      },
      relevant_lines: [...lines.map(lineRecord), ...(current.relevant_lines || [])].filter((line, index, rows) => rows.findIndex(row => row.id === line.id) === index)
    }
  })

  const updateSlot = (index, lineId) => patch(current => {
    const line = normalClassLines.find(item => item.id === lineId)
    if (!line) return current
    const active = [...(current.class_configuration?.active_class_lines || [])]
    active[index] = { line_id: line.id, source_class: line.class, mode: line.class === baseClass ? 'native' : 'subclassing', notes: [] }
    const foreign = active.some(row => row?.source_class && row.source_class !== baseClass)
    return {
      ...current,
      metadata: { ...(current.metadata || {}), class_style: foreign ? 'subclass' : 'pure_class' },
      class_configuration: {
        ...(current.class_configuration || {}), base_class: baseClass, active_class_lines: active,
        class_mastery: foreign ? { ...(current.class_configuration?.class_mastery || {}), enabled: false, choices: [] } : (current.class_configuration?.class_mastery || { enabled: false, points_available: 2, choices: [] })
      },
      relevant_lines: [...(current.relevant_lines || []), lineRecord(line)].filter((row, rowIndex, rows) => rows.findIndex(candidate => candidate.id === row.id) === rowIndex)
    }
  })

  const updateMode = (index, mode) => patch(current => {
    const active = [...(current.class_configuration?.active_class_lines || [])]
    if (!active[index] || active[index].source_class === baseClass) return current
    active[index] = { ...active[index], mode }
    return { ...current, class_configuration: { ...(current.class_configuration || {}), active_class_lines: active } }
  })

  const toggleMastery = enabled => patch(current => ({
    ...current,
    class_configuration: {
      ...(current.class_configuration || {}),
      class_mastery: { ...(current.class_configuration?.class_mastery || {}), enabled, points_available: 2, choices: enabled ? (current.class_configuration?.class_mastery?.choices || []).slice(0, 2) : [] }
    }
  }))
  const toggleMasteryChoice = skillId => patch(current => {
    const masteryState = current.class_configuration?.class_mastery || { enabled: true, points_available: 2, choices: [] }
    const choices = new Set(masteryState.choices || [])
    if (choices.has(skillId)) choices.delete(skillId)
    else if (choices.size < Number(masteryState.points_available || 2)) choices.add(skillId)
    return { ...current, class_configuration: { ...(current.class_configuration || {}), class_mastery: { ...masteryState, enabled: true, choices: [...choices] } } }
  })

  const duplicateLines = new Set(selections.map(row => row.line_id)).size !== selections.length
  const foreignClasses = selections.filter(row => row.source_class !== baseClass).map(row => row.source_class)
  const repeatedForeign = new Set(foreignClasses).size !== foreignClasses.length
  const nativeCount = selections.filter(row => row.source_class === baseClass).length

  return <div className="page build-class-configuration-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Class Configuration</h1><p>Choose the base class and the three active class-line slots. ATTB keeps the official Schema 4 subclassing constraints visible while you work.</p></div>

    {showGuidance && <section className="panel contextual-guidance-banner"><div><span className="eyebrow">{baseClass}</span><h2>{classGuidance(baseClass)?.summary}</h2><p>{buildEditorGuidance.class_styles[data.metadata?.class_style || (usesForeign ? 'subclass' : 'pure_class')]?.summary}</p></div><button type="button" className="btn secondary" onClick={resetPureClass}>Reset to Three Native Lines</button></section>}

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Class identity</span><h2>Base class</h2></div><small>Changing this intentionally resets class-specific starter references.</small></div>
      <div className="form-grid two"><label><FieldLabel guidance={showGuidance ? { title: baseClass, summary: classGuidance(baseClass)?.summary, common: classGuidance(baseClass)?.themes || [] } : null}>Base class</FieldLabel><select value={baseClass} onChange={event => changeBaseClass(event.target.value)}>{classes.map(name => <option key={name}>{name}</option>)}</select></label>
        <div className="class-native-lines"><small>Native lines</small>{nativeLines.map(line => <span key={line.id}>{line.name}</span>)}</div>
      </div>
    </section>

    <section className="panel section-block"><div className="section-head"><div><span className="eyebrow">Three active slots</span><h2>Class skill lines</h2></div><small>At least one line must remain native; no foreign class can supply two lines.</small></div>
      <div className="class-line-slot-grid">
        {[0, 1, 2].map(index => {
          const selection = selections[index]
          const usedElsewhere = new Set(selections.filter((_, rowIndex) => rowIndex !== index).map(row => row.line_id))
          const line = normalClassLines.find(item => item.id === selection?.line_id)
          const foreignClassUsedElsewhere = new Set(selections.filter((row, rowIndex) => rowIndex !== index && row.source_class !== baseClass).map(row => row.source_class))
          return <article className={`class-line-slot ${line?.class === baseClass ? 'native' : 'foreign'}`} key={index}>
            <div className="class-line-slot-head"><span>Slot {index + 1}</span><b>{line?.class === baseClass ? 'Native' : 'Foreign'}</b></div>
            <label><span>Skill line</span><select value={selection?.line_id || ''} onChange={event => updateSlot(index, event.target.value)}>{classes.map(className => <optgroup key={className} label={className}>{classLines(className).map(option => <option key={option.id} value={option.id} disabled={usedElsewhere.has(option.id) || (className !== baseClass && foreignClassUsedElsewhere.has(className))}>{option.name}</option>)}</optgroup>)}</select></label>
            <p>{line ? `${line.class} · ${line.name}` : 'Select a class line.'}</p>
            {line && line.class !== baseClass && <div className="guided-question compact"><span>Foreign-line state</span><ChoiceChips name={`Slot ${index + 1} state`} single values={[selection?.mode || 'subclassing']} options={[{ value: 'subclassing', label: 'Actively subclassed' }, { value: 'mastered', label: 'Mastered line' }]} onChange={next => updateMode(index, next[0])} /></div>}
          </article>
        })}
      </div>
      {(duplicateLines || repeatedForeign || nativeCount < 1) && <div className="error-box class-rule-warning">{duplicateLines && <p>Each active slot must use a different line.</p>}{repeatedForeign && <p>Only one line may come from each foreign class.</p>}{nativeCount < 1 && <p>At least one active line must remain native to {baseClass}.</p>}</div>}
    </section>

    <section className={`panel section-block ${usesForeign ? 'disabled-panel' : ''}`}><div className="section-head"><div><span className="eyebrow">Update 50</span><h2>Class Mastery</h2></div><small>{usesForeign ? 'Unavailable while foreign class lines are active.' : 'The build may recommend up to two mastery passives.'}</small></div>
      <label className="toggle-label"><span><b>Enable Class Mastery recommendations</b><small>All three active class lines must be native.</small></span><input type="checkbox" checked={!!cfg.class_mastery?.enabled} disabled={usesForeign} onChange={event => toggleMastery(event.target.checked)} /></label>
      {!usesForeign && cfg.class_mastery?.enabled && <div className="mastery-choice-grid">{(mastery?.skills || []).map(skill => {
        const active = (cfg.class_mastery?.choices || []).includes(skill.id)
        return <button type="button" key={skill.id} className={active ? 'active' : ''} onClick={() => toggleMasteryChoice(skill.id)}><b>{skill.name}</b><small>{active ? 'Selected' : `Choose up to ${cfg.class_mastery?.points_available || 2}`}</small></button>
      })}</div>}
    </section>

    <section className="panel section-block class-config-summary"><div><span className="eyebrow">Configuration summary</span><h2>{usesForeign ? 'Subclassing configuration' : 'Pure-class configuration'}</h2><p>{nativeCount} native line{nativeCount === 1 ? '' : 's'} · {3 - nativeCount} foreign line{3 - nativeCount === 1 ? '' : 's'} · Class Mastery {cfg.class_mastery?.enabled ? 'enabled' : 'disabled'}</p></div></section>
  </div>
}
