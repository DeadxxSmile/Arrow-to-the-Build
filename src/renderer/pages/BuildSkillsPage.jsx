import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import NumberStepper from '../components/NumberStepper'
import SkillIcon from '../components/SkillIcon'
import { catalogLines, catalogSkillMap, SKILL_LINE_GROUP_ORDER } from '../utils/catalogLogic'
import {
  moveUnlockRow, patchPlannedSkillRows, plannedRowsForSkill, removeRelevantLine, setPlannedSkillCount
} from '../utils/buildEditorSkillLogic'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'

const skillTypeOrder = ['Ultimate', 'Active', 'Morph', 'Passive']

function groupRank(group) {
  const index = SKILL_LINE_GROUP_ORDER.indexOf(group)
  return index < 0 ? 999 : index
}

function typeRank(type) {
  const index = skillTypeOrder.indexOf(type)
  return index < 0 ? 999 : index
}

function lineLabel(line) {
  return `${line.group}${line.class ? ` · ${line.class}` : ''} · ${line.name}`
}

function planStatus(rows) {
  if (!rows.length) return 'Not planned'
  if (rows.some(row => row.status === 'final')) return 'Final'
  if (rows.some(row => row.status === 'temporary')) return 'Temporary'
  return 'Optional'
}

function SkillCatalogRow({ data, line, skill, onChange }) {
  const rows = plannedRowsForSkill(data, skill.id)
  const count = rows.length
  const max = skill.type === 'Passive' ? Math.max(1, Number(skill.max_points) || 1) : 1
  const selected = count > 0
  const base = skill.base_id ? catalogSkillMap.get(skill.base_id)?.skill : null
  const morphs = (skill.morph_ids || []).map(id => catalogSkillMap.get(id)?.skill).filter(Boolean)
  const setCount = next => onChange(current => setPlannedSkillCount(current, skill.id, next))
  const patchRows = patch => onChange(current => patchPlannedSkillRows(current, skill.id, patch))
  const retirement = rows[0]?.retire_when
  const retirementType = retirement?.type || 'manual'
  const setRetirementType = type => {
    if (type === 'manual') { patchRows({ retire_when: undefined }); return }
    if (type === 'character_level') { patchRows({ retire_when: { type, level: 30 } }); return }
    if (type === 'skill_line_rank') { patchRows({ retire_when: { type, line: line.id, rank: Number(line.max_rank) || 50 } }); return }
    const replacement = (data.unlock_order || []).find(row => row?.id !== rows[0]?.id && row?.status === 'final')
    patchRows({ retire_when: { type: 'unlock_completed', unlock_id: replacement?.id || '' } })
  }
  const patchRetirement = patch => patchRows({ retire_when: { ...(retirement || {}), ...patch } })

  return <article className={`build-skill-catalog-row ${selected ? 'selected' : ''}`}>
    <div className="build-skill-main">
      <button type="button" className={`eso-skill-toggle ${selected ? 'selected' : ''}`} onClick={() => setCount(selected ? 0 : 1)} aria-label={`${selected ? 'Remove' : 'Add'} ${skill.name}`}><span>{selected ? '✓' : '+'}</span></button>
      <SkillIcon skillId={skill.id} name={skill.name} size="list" />
      <div className="build-skill-copy">
        <div className="skill-title-line"><b>{skill.name}</b><span className="mini-tag phase">{skill.type}</span>{skill.type === 'Passive' && skill.unlock_ranks?.length ? <span className="mini-tag slot">Ranks {skill.unlock_ranks.join(' / ')}</span> : skill.required_rank != null && <span className="mini-tag slot">Rank {skill.required_rank}</span>}</div>
        <small>{line.name}{base ? ` · Morph of ${base.name}${skill.requires_base_skill_rank ? ` Rank ${['I','II','III','IV'][skill.requires_base_skill_rank - 1] || skill.requires_base_skill_rank}` : ''}` : ''}</small>
        {morphs.length > 0 && <p>Morphs into {morphs.map(item => item.name).join(' or ')}.</p>}
      </div>
      {skill.type === 'Passive' ? <NumberStepper value={count} min={0} max={max} onChange={setCount} label={`${skill.name} planned ranks`} /> : <button type="button" className={`btn compact ${selected ? 'secondary' : ''}`} onClick={() => setCount(selected ? 0 : 1)}>{selected ? 'Remove' : 'Add to plan'}</button>}
    </div>
    {selected && <div className="build-skill-options">
      <label><span>Use</span><select value={rows[0]?.status || 'final'} onChange={event => {
        const status = event.target.value
        patchRows(status === 'temporary' ? { status } : { status, retire_when: undefined })
      }}><option value="final">Final build</option><option value="temporary">Temporary / bridge</option><option value="optional">Optional alternative</option></select></label>
      <label><span>Recommended phase</span><input value={rows[0]?.phase || ''} onChange={event => patchRows({ phase: event.target.value })} placeholder="Leveling, transition, CP160, final…" /></label>
      <label className="skill-notes-field"><span>Author note</span><input value={rows[0]?.notes || ''} onChange={event => patchRows({ notes: event.target.value })} placeholder="Why or when the player should take this." /></label>
      {rows[0]?.status === 'temporary' && <>
        <label><span>Retire when</span><select value={retirementType} onChange={event => setRetirementType(event.target.value)}><option value="manual">Player decides</option><option value="character_level">Character reaches level</option><option value="skill_line_rank">Skill line reaches rank</option><option value="unlock_completed">Replacement unlock is complete</option></select></label>
        {retirementType === 'character_level' && <label><span>Character level cutoff</span><input type="number" min="1" max="50" value={retirement?.level || 30} onChange={event => patchRetirement({ type: 'character_level', level: Math.max(1, Math.min(50, Number(event.target.value) || 1)) })} /></label>}
        {retirementType === 'skill_line_rank' && <><label><span>Skill line</span><select value={retirement?.line || line.id} onChange={event => patchRetirement({ type: 'skill_line_rank', line: event.target.value })}>{(data.relevant_lines || []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label><span>Line-rank cutoff</span><input type="number" min="1" max="50" value={retirement?.rank || Number(line.max_rank) || 50} onChange={event => patchRetirement({ type: 'skill_line_rank', rank: Math.max(1, Math.min(50, Number(event.target.value) || 1)) })} /></label></>}
        {retirementType === 'unlock_completed' && <label><span>Replacement unlock</span><select value={retirement?.unlock_id || ''} onChange={event => patchRetirement({ type: 'unlock_completed', unlock_id: event.target.value })}><option value="">Choose a build unlock…</option>{(data.unlock_order || []).filter(row => row?.id !== rows[0]?.id && row?.status === 'final').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      </>}
      <span className="planned-state">{planStatus(rows)}{skill.type === 'Passive' ? ` · ${count}/${max} ranks` : ''}</span>
    </div>}
  </article>
}

export default function BuildSkillsPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const draft = editor.draft
  const data = draft?.data
  const relevantIds = useMemo(() => new Set((data?.relevant_lines || []).map(line => line.id)), [data?.relevant_lines])
  const sortedLines = useMemo(() => [...catalogLines].sort((a, b) => groupRank(a.group) - groupRank(b.group) || String(a.class || '').localeCompare(String(b.class || '')) || a.name.localeCompare(b.name)), [])
  const [lineId, setLineId] = useState('')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')

  useEffect(() => {
    if (!data) return
    if (lineId && catalogLines.some(line => line.id === lineId)) return
    setLineId(data.relevant_lines?.[0]?.id || sortedLines[0]?.id || '')
  }, [data, lineId, sortedLines])

  if (!draft) return <BuildEditorEmptyState title="Skills & Passives" description="Open or create a draft before editing this section." />

  const selectedLine = catalogLines.find(line => line.id === lineId) || null
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSkills = (selectedLine?.skills || [])
    .filter(skill => !normalizedQuery || skill.name.toLowerCase().includes(normalizedQuery) || skill.type.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => typeRank(a.type) - typeRank(b.type) || (Number(a.required_rank) || 0) - (Number(b.required_rank) || 0) || a.name.localeCompare(b.name))
  const plannedRows = [...(data.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
  const selectedLines = (data.relevant_lines || []).map(row => catalogLines.find(line => line.id === row.id) || row)
  const lineOptions = sortedLines.filter(line => group === 'All' || line.group === group)
  const update = updater => editor.updateDraft(updater)

  const removeLine = async line => {
    const active = (data.class_configuration?.active_class_lines || []).some(row => row.line_id === line.id)
    if (active) {
      await dialog.alert({ title: 'Active class line', message: `${line.name} is one of the three active class lines and cannot be removed here. Change it under Class Configuration first.` })
      return
    }
    const affected = plannedRows.filter(row => row.line === line.id).length
    const ok = await dialog.confirm({
      title: `Remove ${line.name}?`,
      message: affected
        ? `This also removes ${affected} planned unlock row${affected === 1 ? '' : 's'} and clears those skills from build-phase bars and rotations.`
        : 'This removes the line from the build reference. No planned skills currently use it.',
      confirmLabel: 'Remove Line', danger: affected > 0
    })
    if (ok) update(current => removeRelevantLine(current, line.id))
  }

  return <div className="page build-editor-form-page build-skills-page">
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Skills &amp; Passives</h1><p>Choose the lines and purchases the build recommends. The same stable catalog IDs feed build-phase bars, rotations, validation, and character progression tracking.</p></div>

    <section className="panel build-skill-summary">
      <div><span className="eyebrow">Build plan</span><h2>{selectedLines.length} relevant lines · {plannedRows.length} unlock rows</h2><p>Adding a skill automatically adds its catalog line. Adding a morph also carries its base ability into the plan as a temporary prerequisite.</p></div>
      <div className="build-skill-summary-stats"><span><small>Final</small><b>{plannedRows.filter(row => row.status === 'final').length}</b></span><span><small>Temporary</small><b>{plannedRows.filter(row => row.status === 'temporary').length}</b></span><span><small>Optional</small><b>{plannedRows.filter(row => row.status === 'optional').length}</b></span></div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span className="eyebrow">Skill-line directory</span><h2>Relevant lines</h2></div><small>Active class lines are protected here. Other lines can be removed with their planned rows.</small></div>
      <div className="relevant-line-chips">{selectedLines.map(line => {
        const active = (data.class_configuration?.active_class_lines || []).some(row => row.line_id === line.id)
        return <button type="button" key={line.id} className={`relevant-line-chip ${line.id === lineId ? 'active' : ''}`} onClick={() => setLineId(line.id)}><span>{line.name}</span><small>{line.group}{active ? ' · active class line' : ''}</small>{!active && <em onClick={event => { event.stopPropagation(); removeLine(line) }} aria-label={`Remove ${line.name}`}>×</em>}</button>
      })}</div>
      <div className="skill-browser-controls">
        <label><span>Category</span><select value={group} onChange={event => { setGroup(event.target.value); const next = sortedLines.find(line => event.target.value === 'All' || line.group === event.target.value); if (next) setLineId(next.id) }}><option>All</option>{SKILL_LINE_GROUP_ORDER.map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span>Browse skill line</span><select value={lineId} onChange={event => setLineId(event.target.value)}>{lineOptions.map(line => <option value={line.id} key={line.id}>{lineLabel(line)}{relevantIds.has(line.id) ? ' · in build' : ''}</option>)}</select></label>
        <label><span>Search this line</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Skill or passive name…" /></label>
      </div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span className="eyebrow">Catalog</span><h2>{selectedLine?.name || 'Choose a line'}</h2></div><small>{selectedLine ? `${selectedLine.group}${selectedLine.class ? ` · ${selectedLine.class}` : ''} · ${visibleSkills.length} visible entries` : ''}</small></div>
      <div className="build-skill-catalog">{visibleSkills.length ? visibleSkills.map(skill => <SkillCatalogRow key={skill.id} data={data} line={selectedLine} skill={skill} onChange={update} />) : <div className="quiet-box">No skills match this search.</div>}</div>
    </section>

    <section className="panel">
      <div className="section-head"><div><span className="eyebrow">Ordered progression</span><h2>Unlock plan</h2></div><small>Use the arrows to control recommendation order. Detailed notes remain editable above.</small></div>
      <div className="unlock-plan-editor">{plannedRows.map((row, index) => {
        const hit = catalogSkillMap.get(row.catalog_skill_id)
        return <article key={row.id}>
          <span className="unlock-plan-number">{index + 1}</span><SkillIcon skillId={row.catalog_skill_id} name={row.name} size="small" />
          <div><b>{row.name}{(row.import_status || row.imported_state) && <span className={`import-state-badge ${row.import_status || row.imported_state}`}>{row.import_status === 'catch-up' ? 'Catch Up' : row.import_status === 'future' ? 'Future' : row.import_status === 'owned' || row.imported_state === 'owned' ? 'Owned at Import' : 'Imported'}</span>}</b><small>{hit?.line?.name || row.line} · {row.kind || hit?.skill?.type || 'Skill'} · {row.status || 'optional'}{row.skill_point_cost > 1 ? ` · ${row.skill_point_cost} Skill Points` : ''}</small>{row.import_note && <small className="import-row-note">{row.import_note}</small>}</div>
          <div className="unlock-plan-actions"><button type="button" className="btn compact ghost" disabled={index === 0} onClick={() => update(current => moveUnlockRow(current, row.id, -1))} aria-label={`Move ${row.name} earlier`}>↑</button><button type="button" className="btn compact ghost" disabled={index === plannedRows.length - 1} onClick={() => update(current => moveUnlockRow(current, row.id, 1))} aria-label={`Move ${row.name} later`}>↓</button><button type="button" className="btn compact danger" onClick={() => update(current => setPlannedSkillCount(current, row.catalog_skill_id, Math.max(0, plannedRowsForSkill(current, row.catalog_skill_id).length - 1)))}>{hit?.skill?.type === 'Passive' ? '− Rank' : 'Remove'}</button></div>
        </article>
      })}{!plannedRows.length && <div className="quiet-box">Add at least one catalog skill to begin the progression plan.</div>}</div>
    </section>
  </div>
}
