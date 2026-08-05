import React from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import { isPieceChecked, pieceKey } from '../utils/buildLogic'

function Acquisition({ source = {} }) {
  const rows = [
    ['Source', source.type], ['Location', source.location], ['Zone', source.zone], ['Access', source.access],
    ['Requirement', source.requirement], ['Tradeable', source.tradeable], ['Difficulty', source.difficulty]
  ].filter(([, value]) => value)
  return <details className="acquisition-details"><summary>How to obtain</summary><div>{rows.map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)}{source.notes && <p className="acquisition-note">{source.notes}</p>}{source.alternative && <p className="acquisition-alternative"><b>Alternative</b><span>{source.alternative}</span></p>}</div></details>
}

function PieceRow({ piece, checked, onChange }) {
  const details = [piece.weight, piece.trait, piece.enchantment, piece.quality].filter(Boolean)
  return <div className={`gear-piece-v3 ${checked ? 'done' : ''}`}>
    <button type="button" className="completion-box" role="checkbox" aria-checked={checked} aria-label={`${checked ? 'Mark not acquired' : 'Mark acquired'}: ${piece.slot}`} onClick={() => onChange(!checked)}><span aria-hidden="true">{checked ? '✓' : ''}</span></button>
    <div className="gear-piece-slot"><b>{piece.slot}</b>{piece.weapon_type && <small>{piece.weapon_type}</small>}</div>
    <div className="gear-piece-details"><span>{details.map(detail => <em key={detail}>{detail}</em>)}</span>{piece.note && <small>{piece.note}</small>}</div>
    <span className="piece-state">{checked ? 'Acquired' : 'Needed'}</span>
  </div>
}

export default function EquipmentPage() {
  const { character, build, setGearPiece } = useApp()
  const stages = build?.gear_stages || []
  if (!character || !build) return <EmptyState />

  return <div className="page">
    <div className="page-title"><span className="eyebrow">Piece-by-piece tracking</span><h1>Equipment roadmap</h1><p>Every armor slot, jewelry piece, and weapon is tracked separately. Leveling gear is disposable; permanent collection begins at Level 50 / CP160.</p></div>
    {!stages.length && <div className="quiet-box">This build file does not define any gear stages.</div>}
    <div className="gear-stages">{stages.map((stage, stageIndex) => {
      const sets = stage.sets || []
      const pieces = sets.flatMap(set => (set.pieces || []).map(piece => ({ ...piece, setId: set.id })))
      const current = character.level >= (stage.min_level ?? 0) && character.level <= (stage.max_level ?? 9999)
      const done = pieces.filter((piece, index) => isPieceChecked(character.gear, stage.id, piece, index)).length
      return <details className={`gear-stage gear-stage-v3 ${current ? 'current' : ''}`} key={stage.id} open={current || stageIndex === 0}>
        <summary><div><span className="eyebrow">{current ? 'Current stage' : `Stage ${stageIndex + 1}`}</span><h2>{stage.name}</h2><p>{stage.summary}</p></div><strong><b>{done}</b> / {pieces.length}<small>pieces</small></strong></summary>
        <div className="gear-set-list">{sets.map(set => <section className="gear-set-card" key={set.id}>
          <header><div><span className="eyebrow">{set.role || 'Equipment set'}</span><h3>{set.name}</h3>{set.bonus && <p>{set.bonus}</p>}</div><Acquisition source={set.source} /></header>
          <div className="gear-piece-list">{(set.pieces || []).map((piece, pieceIndex) => {
            const globalIndex = pieces.findIndex(item => item.id === piece.id)
            const checked = isPieceChecked(character.gear, stage.id, piece, globalIndex)
            return <PieceRow key={pieceKey(piece, globalIndex)} piece={piece} checked={checked} onChange={doneValue => setGearPiece(stage.id, pieceKey(piece, globalIndex), doneValue)} />
          })}</div>
        </section>)}</div>
      </details>
    })}</div>
  </div>
}
