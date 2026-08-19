import { useState } from 'react'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import NumberStepper from '../components/NumberStepper'
import { slugifyEditorId } from '../utils/buildEditorSkillLogic'
import BuildEditorEmptyState from '../components/BuildEditorEmptyState'
import { resolveProgressionScope } from '../../shared/progressionScope.mjs'

const ARMOR_SLOTS = ['Head', 'Shoulders', 'Chest', 'Hands', 'Waist', 'Legs', 'Feet', 'Necklace', 'Ring 1', 'Ring 2', 'Front Weapon 1', 'Front Weapon 2', 'Back Weapon']
const WEIGHTS = ['', 'Light', 'Medium', 'Heavy']
const QUALITIES = ['', 'Current level', 'Green', 'Blue', 'Purple', 'Gold', 'Purple or better', 'Gold weapons first']

function uniqueId(rows, seed) {
  const used = new Set((rows || []).map(row => row?.id).filter(Boolean))
  const base = slugifyEditorId(seed || 'item')
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function move(rows, index, direction) {
  const next = [...(rows || [])]
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function blankPiece(existing = [], seed = 'new-piece') {
  return {
    id: uniqueId(existing, seed),
    slot: 'Chest',
    weight: 'Medium',
    trait: 'Training',
    enchantment: 'Max Stamina',
    quality: 'Purple or better'
  }
}

function blankSet(existing = [], stageId = 'stage') {
  const id = uniqueId(existing, `${stageId}-new-set`)
  return {
    id,
    name: 'New Equipment Set',
    role: 'Equipment set',
    bonus: '',
    source: { type: 'Other', location: 'Describe where this comes from', tradeable: 'Varies' },
    pieces: [blankPiece([], `${id}-piece`)],
    alternatives: []
  }
}

function blankStage(existing = []) {
  const id = uniqueId(existing, 'new-gear-stage')
  return {
    id,
    name: 'New Gear Stage',
    min_level: 50,
    max_level: 9999,
    summary: 'Describe when the player should use this setup and what it replaces.',
    sets: [blankSet([], id)],
    roles: [],
    content: []
  }
}

function clonePiece(piece, existing) {
  return { ...structuredClone(piece), id: uniqueId(existing, `${piece.id || piece.slot || 'piece'}-copy`) }
}

function cloneSet(set, existing) {
  const copy = structuredClone(set)
  copy.id = uniqueId(existing, `${set.id || set.name || 'set'}-copy`)
  copy.name = `${set.name || 'Equipment Set'} Copy`
  copy.pieces = (copy.pieces || []).map((piece, index, rows) => ({ ...piece, id: uniqueId(rows.slice(0, index), `${copy.id}-${piece.slot || 'piece'}-${index + 1}`) }))
  return copy
}

function cloneStage(stage, existing) {
  const copy = structuredClone(stage)
  copy.id = uniqueId(existing, `${stage.id || stage.name || 'stage'}-copy`)
  copy.name = `${stage.name || 'Gear Stage'} Copy`
  copy.sets = (copy.sets || []).map((set, setIndex, sets) => {
    const next = { ...set, id: uniqueId(sets.slice(0, setIndex), `${copy.id}-${set.name || 'set'}-${setIndex + 1}`) }
    next.pieces = (set.pieces || []).map((piece, pieceIndex, pieces) => ({ ...piece, id: uniqueId(pieces.slice(0, pieceIndex), `${next.id}-${piece.slot || 'piece'}-${pieceIndex + 1}`) }))
    return next
  })
  return copy
}

function lines(value) {
  return String(value || '').split('\n').map(item => item.trim()).filter(Boolean)
}

function PieceEditor({ piece, index, count, onPatch, onMove, onDuplicate, onDelete }) {
  return <article className="equipment-piece-editor">
    <div className="equipment-piece-number">{index + 1}</div>
    <div className="equipment-piece-fields">
      <div className="form-grid four">
        <label><span>Slot</span><select value={piece.slot || ''} onChange={event => onPatch({ slot: event.target.value })}>{ARMOR_SLOTS.map(slot => <option key={slot}>{slot}</option>)}</select></label>
        <label><span>Armor weight</span><select value={piece.weight || ''} onChange={event => onPatch({ weight: event.target.value || undefined })}>{WEIGHTS.map(value => <option key={value} value={value}>{value || 'Not applicable'}</option>)}</select></label>
        <label><span>Weapon type</span><input value={piece.weapon_type || ''} onChange={event => onPatch({ weapon_type: event.target.value || undefined })} placeholder="Dagger, Inferno Staff…" /></label>
        <label><span>Set slots used</span><NumberStepper value={Number(piece.set_slots) || 1} min={1} max={2} onChange={value => onPatch({ set_slots: value === 1 ? undefined : value })} label="Set slots used by this item" /></label>
      </div>
      <div className="form-grid four">
        <label><span>Trait</span><input value={piece.trait || ''} onChange={event => onPatch({ trait: event.target.value || undefined })} placeholder="Divines, Bloodthirsty…" /></label>
        <label><span>Enchantment</span><input value={piece.enchantment || ''} onChange={event => onPatch({ enchantment: event.target.value || undefined })} placeholder="Max Stamina…" /></label>
        <label><span>Quality</span><input list="attb-quality-options" value={piece.quality || ''} onChange={event => onPatch({ quality: event.target.value || undefined })} placeholder="Purple or better" /></label>
        <label><span>Poison / special effect</span><input value={piece.poison || ''} onChange={event => onPatch({ poison: event.target.value || undefined })} placeholder="Optional" /></label>
      </div>
      <div className="form-grid two">
        <label><span>Piece note</span><input value={piece.note || ''} onChange={event => onPatch({ note: event.target.value || undefined })} placeholder="Why this slot, trait, or alternative matters." /></label>
        <label><span>Alternatives, one per line</span><textarea rows="2" value={(piece.alternatives || []).join('\n')} onChange={event => onPatch({ alternatives: lines(event.target.value) })} /></label>
      </div>
      <div className="equipment-piece-flags">
        <label><input type="checkbox" checked={piece.perfected === true} onChange={event => onPatch({ perfected: event.target.checked || undefined })} /><span>Perfected item</span></label>
        <label><input type="checkbox" checked={piece.mythic === true} onChange={event => onPatch({ mythic: event.target.checked || undefined })} /><span>Mythic item</span></label>
      </div>
    </div>
    <div className="equipment-row-actions"><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate</button><button className="btn compact danger" disabled={count <= 1} onClick={onDelete}>Delete</button></div>
  </article>
}

function SetEditor({ set, index, count, onPatch, onMove, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(true)
  const pieces = set.pieces || []
  const patchPieces = next => onPatch({ pieces: next })
  return <article className="equipment-set-editor">
    <button type="button" className="equipment-editor-summary" onClick={() => setOpen(value => !value)}><div><span className="eyebrow">Set {index + 1}</span><h3>{set.name || set.id}</h3><p>{set.role || 'No role label'} · {pieces.length} piece{pieces.length === 1 ? '' : 's'}</p></div><b>{open ? '−' : '+'}</b></button>
    {open && <div className="equipment-set-body">
      <div className="equipment-inline-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate Set</button></div><button className="btn compact danger" disabled={count <= 1} onClick={onDelete}>Delete Set</button></div>
      <div className="form-grid three">
        <label><span>Set name</span><input value={set.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label>
        <label><span>Purpose / slot role</span><input value={set.role || ''} onChange={event => onPatch({ role: event.target.value || undefined })} placeholder="Body set, weapons, mythic…" /></label>
        <label><span>Permanent set ID</span><input className="mono" value={set.id || ''} readOnly /></label>
        <label className="form-span-three"><span>Set bonus or reason</span><textarea rows="2" value={set.bonus || ''} onChange={event => onPatch({ bonus: event.target.value || undefined })} placeholder="What this set contributes to the build." /></label>
      </div>
      <section className="equipment-source-editor"><div className="section-head"><div><span className="eyebrow">Acquisition</span><h4>How to obtain this set</h4></div></div><div className="form-grid four">
        <label><span>Source type</span><input value={set.source?.type || ''} onChange={event => onPatch({ source: { ...(set.source || {}), type: event.target.value } })} placeholder="Crafted, Dungeon, Trial…" /></label>
        <label><span>Location</span><input value={set.source?.location || ''} onChange={event => onPatch({ source: { ...(set.source || {}), location: event.target.value } })} /></label>
        <label><span>Zone</span><input value={set.source?.zone || ''} onChange={event => onPatch({ source: { ...(set.source || {}), zone: event.target.value || undefined } })} /></label>
        <label><span>Tradeable</span><input value={String(set.source?.tradeable ?? '')} onChange={event => onPatch({ source: { ...(set.source || {}), tradeable: event.target.value || undefined } })} placeholder="Yes, No, Varies" /></label>
        <label><span>Access / DLC</span><input value={set.source?.access || set.source?.dlc || ''} onChange={event => onPatch({ source: { ...(set.source || {}), access: event.target.value || undefined } })} /></label>
        <label><span>Requirement</span><input value={set.source?.requirement || ''} onChange={event => onPatch({ source: { ...(set.source || {}), requirement: event.target.value || undefined } })} /></label>
        <label className="form-span-two"><span>Acquisition notes</span><input value={set.source?.notes || ''} onChange={event => onPatch({ source: { ...(set.source || {}), notes: event.target.value || undefined } })} /></label>
      </div></section>
      <section className="equipment-pieces-section"><div className="section-head"><div><span className="eyebrow">Pieces</span><h4>Slot-by-slot setup</h4></div><button className="btn compact primary" onClick={() => patchPieces([...pieces, blankPiece(pieces, `${set.id}-piece`)])}>+ Add Piece</button></div>
        <div className="equipment-piece-list-editor">{pieces.map((piece, pieceIndex) => <PieceEditor key={piece.id} piece={piece} index={pieceIndex} count={pieces.length} onPatch={patch => patchPieces(pieces.map((row, rowIndex) => rowIndex === pieceIndex ? { ...row, ...patch } : row))} onMove={direction => patchPieces(move(pieces, pieceIndex, direction))} onDuplicate={() => { const next = [...pieces]; next.splice(pieceIndex + 1, 0, clonePiece(piece, next)); patchPieces(next) }} onDelete={() => patchPieces(pieces.filter((_, rowIndex) => rowIndex !== pieceIndex))} />)}</div>
      </section>
    </div>}
  </article>
}

function StageEditor({ stage, index, count, onPatch, onMove, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(index === 0)
  const sets = stage.sets || []
  const patchSets = next => onPatch({ sets: next })
  const pieceCount = sets.reduce((sum, set) => sum + (set.pieces?.length || 0), 0)
  return <article className="equipment-stage-editor">
    <button type="button" className="equipment-editor-summary stage" onClick={() => setOpen(value => !value)}><div><span className="eyebrow">Gear stage {index + 1}</span><h2>{stage.name || stage.id}</h2><p>{stage.summary || 'No stage summary.'}</p></div><div><span className="build-kind editable">{sets.length} set{sets.length === 1 ? '' : 's'} · {pieceCount} pieces</span><b>{open ? '−' : '+'}</b></div></button>
    {open && <div className="equipment-stage-body">
      <div className="phase-toolbar"><div><button className="btn compact ghost" disabled={index === 0} onClick={() => onMove(-1)}>↑ Earlier</button><button className="btn compact ghost" disabled={index === count - 1} onClick={() => onMove(1)}>↓ Later</button><button className="btn compact secondary" onClick={onDuplicate}>Duplicate Stage</button></div><button className="btn compact danger" disabled={count <= 1} onClick={onDelete}>Delete Stage</button></div>
      <div className="form-grid four">
        <label><span>Stage name</span><input value={stage.name || ''} onChange={event => onPatch({ name: event.target.value })} /></label>
        <label><span>Permanent stage ID</span><input className="mono" value={stage.id || ''} readOnly /></label>
        <label><span>Minimum level</span><NumberStepper value={Number(stage.min_level) || 1} min={1} max={50} onChange={value => onPatch({ min_level: value, max_level: Math.max(value, Number(stage.max_level) || value) })} label="Minimum gear-stage level" /></label>
        <label><span>Maximum progression value</span><NumberStepper value={Number(stage.max_level) || 9999} min={Number(stage.min_level) || 1} max={9999} onChange={value => onPatch({ max_level: value })} label="Maximum level or CP value" /></label>
        <label className="form-span-four"><span>Stage summary</span><textarea rows="2" value={stage.summary || ''} onChange={event => onPatch({ summary: event.target.value })} /></label>
        <label className="form-span-two"><span>Roles, comma-separated</span><input value={(stage.roles || []).join(', ')} onChange={event => onPatch({ roles: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
        <label className="form-span-two"><span>Content, comma-separated</span><input value={(stage.content || []).join(', ')} onChange={event => onPatch({ content: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></label>
      </div>
      <section className="equipment-sets-section"><div className="section-head"><div><span className="eyebrow">Equipment groups</span><h3>Sets and standalone items</h3><p>Use separate groups for body sets, arena weapons, mythics, monster pieces, or loose leveling gear.</p></div><button className="btn primary" onClick={() => patchSets([...sets, blankSet(sets, stage.id)])}>+ Add Set</button></div>
        <div className="equipment-set-list-editor">{sets.map((set, setIndex) => <SetEditor key={set.id} set={set} index={setIndex} count={sets.length} onPatch={patch => patchSets(sets.map((row, rowIndex) => rowIndex === setIndex ? { ...row, ...patch } : row))} onMove={direction => patchSets(move(sets, setIndex, direction))} onDuplicate={() => { const next = [...sets]; next.splice(setIndex + 1, 0, cloneSet(set, next)); patchSets(next) }} onDelete={() => patchSets(sets.filter((_, rowIndex) => rowIndex !== setIndex))} />)}</div>
      </section>
    </div>}
  </article>
}

export default function BuildEquipmentPage() {
  const { editor } = useApp()
  const dialog = useAppDialog()
  const draft = editor.draft
  if (!draft) return <BuildEditorEmptyState title="Equipment" description="Open or create a draft before editing this section." />
  const data = draft.data
  const stages = data.gear_stages || []
  const progressionScope = resolveProgressionScope(data)
  const roadmapCopy = progressionScope.starting_point === 'cp160_plus'
    ? 'Define the immediate bridge and/or final CP160+ target. Traditional leveling gear is optional for this build scope. Every set retains its source and every item retains its slot, trait, enchantment, quality, and alternatives.'
    : progressionScope.starting_point === 'level_50'
      ? 'Create the transition from an existing Level 50 character through CP160 and the final target. Levels 1-49 gear is intentionally optional.'
      : 'Create the complete gear roadmap from disposable leveling pieces through starter, bridge, and final setups. Every set retains its source and every item retains its slot, trait, enchantment, quality, and alternatives.'
  const totals = stages.reduce((result, stage) => {
    result.sets += stage.sets?.length || 0
    result.pieces += (stage.sets || []).reduce((sum, set) => sum + (set.pieces?.length || 0), 0)
    return result
  }, { sets: 0, pieces: 0 })
  const update = updater => editor.updateDraft(updater)
  const patchStage = (index, patch) => update(current => ({ ...current, gear_stages: (current.gear_stages || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }))
  const deleteStage = async index => {
    if (stages.length <= 1) return
    const stage = stages[index]
    const approved = await dialog.confirm({ title: `Delete ${stage.name || stage.id}?`, message: 'This removes every set and piece in the stage. Leveling phases that reference it will also be cleaned up.', confirmLabel: 'Delete Gear Stage', danger: true })
    if (!approved) return
    update(current => ({
      ...current,
      gear_stages: (current.gear_stages || []).filter((_, rowIndex) => rowIndex !== index),
      phases: (current.phases || []).map(phase => ({ ...phase, recommended_gear_stage_ids: (phase.recommended_gear_stage_ids || []).filter(id => id !== stage.id) }))
    }))
  }

  return <div className="page build-editor-form-page build-equipment-page">
    <datalist id="attb-quality-options">{QUALITIES.filter(Boolean).map(value => <option key={value} value={value} />)}</datalist>
    <div className="page-title"><span className="eyebrow">Current build</span><h1>Equipment</h1><p>{roadmapCopy}</p></div>
    <section className="panel build-equipment-summary"><div><span className="eyebrow">Gear roadmap</span><h2>{stages.length} stage{stages.length === 1 ? '' : 's'} · {totals.sets} set group{totals.sets === 1 ? '' : 's'} · {totals.pieces} pieces</h2><p>Stage IDs, set IDs, and piece IDs are generated once and remain stable so characters, variants, and future revisions can keep reliable references.</p></div><button className="btn primary" onClick={() => update(current => ({ ...current, gear_stages: [...(current.gear_stages || []), blankStage(current.gear_stages || [])] }))}>+ Add Gear Stage</button></section>
    <div className="equipment-stage-list-editor">{stages.map((stage, index) => <StageEditor key={stage.id} stage={stage} index={index} count={stages.length} onPatch={patch => patchStage(index, patch)} onMove={direction => update(current => ({ ...current, gear_stages: move(current.gear_stages || [], index, direction) }))} onDuplicate={() => update(current => { const next = [...(current.gear_stages || [])]; next.splice(index + 1, 0, cloneStage(stage, next)); return { ...current, gear_stages: next } })} onDelete={() => deleteStage(index)} />)}</div>
  </div>
}
