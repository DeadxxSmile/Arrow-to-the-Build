import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import DisclosureSection, { DisclosureToolbar } from '../components/DisclosureSection'
import { isPieceChecked, pieceKey } from '../utils/buildLogic'
import { buildLiveSetCoverage, liveEquipmentGroup, liveEquipmentOrder } from '../utils/equipmentDisplay.mjs'


function tradeableLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return { label: '-', detail: '' }
  if (/^yes\b/i.test(raw)) return { label: 'Yes', detail: raw }
  if (/^no\b/i.test(raw)) return { label: 'No', detail: raw }
  return { label: raw, detail: '' }
}

function Acquisition({ source = {} }) {
  const extras = [
    ['Access', source.access], ['Requirement', source.requirement], ['Difficulty', source.difficulty]
  ].filter(([, value]) => value)
  const tradeable = tradeableLabel(source.tradeable)
  return <div className="gear-source-block">
    <div className="gear-source-cell"><small>Where to get it</small><b>{source.type || 'Not documented'}</b></div>
    <div className="gear-source-cell"><small>Location</small><b>{source.location || '-'}</b></div>
    <div className="gear-source-cell"><small>Zone</small><b>{source.zone || '-'}</b></div>
    <div className="gear-source-cell"><small>Tradeable</small><b title={tradeable.detail && tradeable.detail !== tradeable.label ? tradeable.detail : undefined}>{tradeable.label}</b></div>
    {(extras.length > 0 || source.notes || source.alternative) && <div className="gear-source-extra">
      {extras.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}
      {source.notes && <p>{source.notes}</p>}
      {source.alternative && <p><b>Alternative:</b> {source.alternative}</p>}
    </div>}
  </div>
}

function SetCoverage({ items }) {
  const sets = buildLiveSetCoverage(items)
  if (!sets.length) return null
  return <div className="live-set-summary" aria-label="Current armor and jewelry set coverage">
    <div className="live-set-summary-heading"><span className="eyebrow">Set coverage</span></div>
    <div className="live-set-summary-list" style={{ '--live-set-count': sets.length }}>{sets.map(set => {
      const complete = set.displayMax > 0 && set.count >= set.displayMax
      const countLabel = set.displayMax ? `${set.count}/${set.displayMax}` : `${set.count} piece${set.count === 1 ? '' : 's'}`
      const state = complete ? 'Full set active' : set.displayMax ? `${set.count}-piece bonus active` : 'Set piece equipped'
      return <div className={`live-set-summary-item ${complete ? 'complete' : ''}`} key={set.name}>
        <div><b>{set.name}</b><small>{state}</small></div><strong>{countLabel}</strong>
      </div>
    })}</div>
  </div>
}

function LiveEquipmentItem({ item }) {
  const setName = item?.set?.hasSet && item.set.name ? item.set.name : 'No set'
  return <article className="live-equipment-row">
    <div className="live-equipment-row-grid live-equipment-row-top">
      <span className="live-equipment-fact live-equipment-type"><small>Type</small><em>{item.slotName || 'Gear'}</em><b>{item.name || 'Unknown item'}</b></span>
      <span className="live-equipment-fact"><small>Set</small><b>{setName}</b></span>
    </div>
    <div className="live-equipment-row-grid live-equipment-row-bottom">
      <span className="live-equipment-fact"><small>Trait</small><b>{item.trait?.name || '-'}</b></span>
      <span className="live-equipment-fact"><small>Enchantment</small><b>{item.enchantment?.name || '-'}</b></span>
    </div>
  </article>
}

function LiveEquipment({ character }) {
  const items = character?.addon_sync?.observed?.equipment?.items || []
  if (!character?.addon_sync?.linked) return null
  const armor = items.filter(item => liveEquipmentGroup(item) === 'armor').sort((a, b) => liveEquipmentOrder(a) - liveEquipmentOrder(b))
  const weapons = items.filter(item => liveEquipmentGroup(item) === 'weapons').sort((a, b) => liveEquipmentOrder(a) - liveEquipmentOrder(b))
  const jewelry = items.filter(item => liveEquipmentGroup(item) === 'jewelry').sort((a, b) => liveEquipmentOrder(a) - liveEquipmentOrder(b))
  const columns = [
    ['Current Equipped Armor', armor],
    ['Current Equipped Weapons & Jewelry', [...weapons, ...jewelry]]
  ]
  return <section className="panel live-gear-panel">
    <div className="section-head"><div><span className="eyebrow">Observed in ESO</span><h2>What you are wearing now</h2><p>A quick reference for your current slots, traits, enchantments, and armor/jewelry set coverage.</p></div><div className="schema-badges"><span>{items.length} equipped</span><span>{character.addon_sync.world_name}</span></div></div>
    {items.length ? <>
      <SetCoverage items={items} />
      <div className="live-equipment-columns" aria-label="Currently equipped items by category">
        {columns.map(([label, groupItems]) => <section className="live-equipment-group" key={label}>
          <header><h3>{label}</h3><span>{groupItems.length}</span></header>
          <div className="live-equipment-list">{groupItems.length
            ? groupItems.map((item, index) => <LiveEquipmentItem item={item} key={`${item.equipSlot ?? index}:${item.itemId ?? item.name}`} />)
            : <p className="live-equipment-empty">No items recorded.</p>}
          </div>
        </section>)}
      </div>
    </> : <div className="quiet-box">The latest addon snapshot did not contain equipped items.</div>}
  </section>
}

function equipmentCategory(piece = {}) {
  if (piece.weight) return piece.weight
  if (piece.weapon_type) return piece.weapon_type
  const slot = String(piece.slot || '').toLowerCase()
  if (slot.includes('ring') || slot.includes('neck')) return 'Jewelry'
  if (slot.includes('shield')) return 'Shield'
  if (slot.includes('weapon')) return 'Weapon'
  return piece.category || 'Gear'
}

function PieceRow({ piece, checked, onChange }) {
  return <div className={`v3-gear-piece ${checked ? 'done' : ''}`}>
    <button type="button" className="completion-box v3-gear-piece-check" role="checkbox" aria-checked={checked} aria-label={`${checked ? 'Mark not acquired' : 'Mark acquired'}: ${piece.slot}`} onClick={() => onChange(!checked)}><span aria-hidden="true">{checked ? '✓' : ''}</span></button>
    <b className="v3-gear-piece-slot">{piece.slot}</b>
    <b>{equipmentCategory(piece)}</b>
    <b>{piece.enchantment || 'Any'}</b>
    <b>{piece.trait || 'Any'}</b>
    <b>{piece.quality || 'Any'}</b>
    <span className="piece-state">{checked ? 'Acquired' : 'Needed'}</span>
    {piece.note && <p>{piece.note}</p>}
  </div>
}

function SetCard({ set, stage, pieces, character, setGearPiece }) {
  const setPieces = set.pieces || []
  const coverage = setPieces.map(piece => piece.slot).filter(Boolean)
  const done = setPieces.filter(piece => {
    const globalIndex = pieces.findIndex(item => item.id === piece.id)
    return isPieceChecked(character.gear, stage.id, piece, globalIndex)
  }).length
  return <section className="v3-gear-set-card">
    <header>
      <div><span className="eyebrow">{done}/{setPieces.length} acquired</span><h3>{set.name}</h3><p>{coverage.length ? coverage.join(' · ') : 'No pieces documented'}</p>{set.bonus && <small>{set.bonus}</small>}</div>
      <span className="gear-source-chip">{set.source?.type || 'Source'}<small>{set.source?.zone || set.source?.location || ''}</small></span>
    </header>
    <Acquisition source={set.source} />
    <div className="v3-gear-piece-head"><span aria-hidden="true"></span><span>Type</span><span>Category</span><span>Enchantment</span><span>Trait</span><span>Quality</span><span>Status</span></div>
    <div className="v3-gear-piece-list">{setPieces.map(piece => {
      const globalIndex = pieces.findIndex(item => item.id === piece.id)
      const checked = isPieceChecked(character.gear, stage.id, piece, globalIndex)
      return <PieceRow key={pieceKey(piece, globalIndex)} piece={piece} checked={checked} onChange={doneValue => setGearPiece(stage.id, pieceKey(piece, globalIndex), doneValue)} />
    })}</div>
  </section>
}

export default function EquipmentPage() {
  const { character, build, setGearPiece } = useApp()
  const stages = build?.gear_stages || []
  const stageStats = useMemo(() => stages.map(stage => {
    const pieces = (stage.sets || []).flatMap(set => (set.pieces || []).map(piece => ({ ...piece, setId: set.id })))
    const done = character ? pieces.filter((piece, index) => isPieceChecked(character.gear, stage.id, piece, index)).length : 0
    return { stage, pieces, done, total: pieces.length, eligible: character ? character.level >= (stage.min_level ?? 0) && character.level <= (stage.max_level ?? 9999) : false }
  }), [stages, character])
  const focusStage = useMemo(() => stageStats.find(item => item.eligible && item.done < item.total) || [...stageStats].reverse().find(item => item.eligible) || stageStats[0], [stageStats])
  const [openStages, setOpenStages] = useState(() => new Set())

  useEffect(() => {
    if (!focusStage?.stage?.id) return
    setOpenStages(current => current.size ? current : new Set([focusStage.stage.id]))
  }, [character?.id, build?.id, focusStage?.stage?.id])

  if (!character || !build) return <EmptyState />

  const toggleStage = id => setOpenStages(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allStageIds = stageStats.map(item => item.stage.id)

  return <div className="page v3-equipment-page">
    <div className="page-title"><span className="eyebrow">Gear progression</span><h1>Equipment roadmap</h1><p>See what you are wearing, what stage of the build to chase next, where each set comes from, and the exact trait/enchantment target for every slot.</p></div>

    <LiveEquipment character={character} />

    {!stages.length ? <div className="quiet-box">This build file does not define any gear stages.</div> : <>
      <section className="panel gear-roadmap-overview">
        <div className="section-head"><div><span className="eyebrow">Your gear path</span><h2>{focusStage?.stage?.name || 'Build gear stages'}</h2><p>{focusStage ? `This is the first eligible stage that is not yet complete. ${focusStage.stage.summary || ''}` : 'Follow the stages below in order.'}</p></div><DisclosureToolbar onExpandAll={() => setOpenStages(new Set(allStageIds))} onCollapseAll={() => setOpenStages(new Set())} expandDisabled={openStages.size === allStageIds.length} collapseDisabled={!openStages.size} /></div>
        <div className="gear-stage-strip">{stageStats.map(({ stage, done, total, eligible }) => <button type="button" key={stage.id} className={`${stage.id === focusStage?.stage?.id ? 'current' : ''} ${done === total && total ? 'complete' : ''}`} onClick={() => { setOpenStages(current => new Set([...current, stage.id])); document.getElementById(`gear-stage-${stage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><small>{eligible ? 'Available now' : `Level ${stage.min_level || 1}+`}</small><b>{stage.name}</b><span>{done}/{total} pieces</span></button>)}</div>
      </section>

      <div className="v3-gear-stages">{stageStats.map(({ stage, pieces, done, total }) => <DisclosureSection
        id={`gear-stage-${stage.id}`}
        className={`v3-gear-stage ${stage.id === focusStage?.stage?.id ? 'current' : ''}`}
        key={stage.id}
        eyebrow={stage.id === focusStage?.stage?.id ? 'Work on this stage next' : 'Gear stage'}
        title={stage.name}
        summary={stage.summary}
        meta={`${done}/${total} pieces`}
        open={openStages.has(stage.id)}
        onToggle={() => toggleStage(stage.id)}
      >
        <div className="v3-gear-set-list">{(stage.sets || []).map(set => <SetCard key={set.id} set={set} stage={stage} pieces={pieces} character={character} setGearPiece={setGearPiece} />)}</div>
      </DisclosureSection>)}</div>
    </>}
  </div>
}
