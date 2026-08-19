import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import { useAppDialog } from '../components/AppDialogProvider'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import SyncOverrideBar from '../components/SyncOverrideBar'
import DisclosureSection, { DisclosureToolbar } from '../components/DisclosureSection'
import { actionableUnlocks, effectiveCompletedSet, reclaimablePointsFor, requiredRankFor, retiredTemporaryUnlocks, temporaryRetirementState, unlockState } from '../utils/buildLogic'
import { catalogLines, effectiveAllocation } from '../utils/catalogLogic'

const SUGGESTIONS_PER_PAGE = 5

function SkillItem({ item, build, character, lineName, toggleUnlock, onRetireTemporary, onUseBuildCutoff, compact = false, disabled = false }) {
  const state = unlockState(item, character, build)
  const complete = state === 'complete'
  const retirement = temporaryRetirementState(item, character, build)
  const retirementOnly = disabled && item.status === 'temporary' && !retirement.retired
  const currentLineRank = item.line ? Number(character?.skill_ranks?.[item.line] || 0) : 0
  const requiredRank = requiredRankFor(item, build)
  const rankGap = Math.max(0, requiredRank - currentLineRank)
  return <article className={`skill-summary-item ${state} ${compact ? 'compact' : ''}`}>
    <button
      type="button"
      className={`completion-box skill-summary-toggle ${complete ? 'selected' : ''}`}
      role="checkbox"
      aria-checked={complete}
      aria-label={retirementOnly ? `Retire temporary unlock: ${item.name}` : `${complete ? 'Mark incomplete' : 'Mark complete'}: ${item.name}`}
      disabled={disabled && !retirementOnly}
      title={retirementOnly ? 'Temporary build steps can be retired even while synced ESO values are protected.' : disabled ? 'This value comes from the synced ESO snapshot. Turn on overrides to change it locally.' : undefined}
      onClick={() => retirementOnly ? onRetireTemporary?.(item) : toggleUnlock(item.id, !complete)}
    ><span aria-hidden="true">{complete ? '✓' : ''}</span></button>
    <SkillIcon skillId={item.catalog_skill_id} name={item.name} image={item.image} size={compact ? 'compact' : 'list'} />
    <div>
      <div className="skill-title-line">
        <b>{item.name}</b>
        <span className={`mini-tag ${item.status}`}>{item.status}</span>
        <span className={`mini-tag state ${state}`}>{state === 'train' ? 'morph after IV' : state}</span>
      </div>
      <small>{lineName(item.line)} · {item.kind} · Rank {requiredRank}</small>
      {!compact && item.notes && <p>{item.notes}</p>}
      {item.kind === 'Morph' && <em>Train {item.morph_from || 'the base skill'} to Rank IV, then select this morph.</em>}
      {state === 'locked' && <em>Current {lineName(item.line)} rank: {currentLineRank}. Requires rank {requiredRank}{rankGap ? ` · ${rankGap} rank${rankGap === 1 ? '' : 's'} away` : ''}.</em>}
      {state === 'blocked' && compact && <em>Needs an earlier purchase first.</em>}
      {!compact && item.status === 'temporary' && !retirement.retired && (retirement.source === 'manual-active'
        ? <button type="button" className="btn secondary compact temporary-state-button" onClick={() => onUseBuildCutoff?.(item)}>Follow build cutoff</button>
        : <button type="button" className="btn secondary compact temporary-state-button" onClick={() => onRetireTemporary?.(item)}>Retire temporary step</button>)}
    </div>
  </article>
}

export default function SkillsPage() {
  const { character, build, toggleUnlock, setTemporaryUnlockState, skillGroups, skillLines, appSettings, addTrackedSkillLine, deleteTrackedSkillLine } = useApp()
  const dialog = useAppDialog()
  const [suggestionPage, setSuggestionPage] = useState(0)
  const [openFinalLines, setOpenFinalLines] = useState(() => new Set())
  const pendingRecommendations = useMemo(() => character && build ? actionableUnlocks(build, character) : [], [build, character])
  const totalSuggestionPages = Math.max(1, Math.ceil(pendingRecommendations.length / SUGGESTIONS_PER_PAGE))
  const ordered = useMemo(() => [...(build?.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0)), [build])
  const finalItems = useMemo(() => ordered.filter(item => item.status === 'final'), [ordered])
  const finalLineGroups = useMemo(() => skillGroups.map(([group, lines]) => ({
    group,
    lines: lines.map(line => ({
      line,
      items: finalItems.filter(item => item.line === line.id),
      personalItems: line.tracked_only ? (line.skills || []).filter(skill => effectiveAllocation(character, build, line.id, skill) > 0) : []
    })).filter(entry => entry.items.length || entry.line.tracked_only)
  })).filter(entry => entry.lines.length), [skillGroups, finalItems, character, build])
  const finalLineIds = useMemo(() => finalLineGroups.flatMap(group => group.lines.map(entry => entry.line.id)), [finalLineGroups])
  const selectedLineIds = useMemo(() => new Set(skillLines.map(line => line.id)), [skillLines])
  const unusedLines = useMemo(() => catalogLines
    .filter(line => line.group !== 'Class' && !selectedLineIds.has(line.id))
    .sort((a, b) => String(a.group || '').localeCompare(String(b.group || '')) || a.name.localeCompare(b.name)), [selectedLineIds])

  useEffect(() => { setSuggestionPage(page => Math.min(page, totalSuggestionPages - 1)) }, [totalSuggestionPages])
  useEffect(() => { setOpenFinalLines(new Set()) }, [character?.id, build?.id])

  if (!character || !build) return <EmptyState />

  const lineName = id => skillLines.find(line => line.id === id)?.name || id
  const ownedNote = item => {
    if (!item.owned) return ' You never need to buy this for the current plan.'
    if (item.reclaim_blocked_by) return ` Recorded as owned, but ${item.reclaim_blocked_by} still uses this base ability, so the Skill Point stays spent until you drop that morph too.`
    if (item.reclaimable_points) return ` Recorded as owned: ${item.reclaimable_points} Skill Point${item.reclaimable_points === 1 ? '' : 's'} can be refunded when convenient.`
    return ' Recorded as owned. This tracked unlock does not tie up an ordinary Skill Point.'
  }
  const recommended = pendingRecommendations.slice(suggestionPage * SUGGESTIONS_PER_PAGE, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)
  const actionableCount = pendingRecommendations.length
  const completed = effectiveCompletedSet(build, character)
  const retiredTemporary = retiredTemporaryUnlocks(build, character)
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'
  const completedFinal = finalItems.filter(item => completed.has(item.id)).length
  const firstShown = pendingRecommendations.length ? suggestionPage * SUGGESTIONS_PER_PAGE + 1 : 0
  const lastShown = Math.min(pendingRecommendations.length, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)
  const reclaimablePoints = retiredTemporary.reduce((sum, item) => sum + item.reclaimable_points, 0)

  const toggleFinalLine = lineId => setOpenFinalLines(current => {
    const next = new Set(current)
    if (next.has(lineId)) next.delete(lineId); else next.add(lineId)
    return next
  })

  const retireTemporary = async item => {
    const kind = item.kind === 'Passive' ? 'passive' : 'skill'
    const owned = completed.has(item.id)
    const cost = reclaimablePointsFor(item, build, character)
    const ok = await dialog.confirm({
      title: `Are you done with this temporary ${kind}?`,
      message: owned
        ? `${item.name} is currently recorded as owned. Retiring it changes only the ATTB plan: it will stop being recommended${cost ? ` and count its ${cost} Skill Point${cost === 1 ? '' : 's'} as reclaimable` : ''}. ${cost ? 'Refund the skill in ESO whenever you are ready.' : 'This tracked unlock does not use an ordinary Skill Point.'}`
        : `${item.name} will be retired for this character even if the build's normal cutoff has not been reached. ATTB will stop recommending it. This does not change anything in ESO.`,
      confirmLabel: `Retire Temporary ${item.kind === 'Passive' ? 'Passive' : 'Skill'}`
    })
    if (ok) await setTemporaryUnlockState(item.id, 'retired')
  }


  const addPersonalLine = async line => {
    if (syncedLocked) return
    await addTrackedSkillLine(line.id)
  }

  const removePersonalLine = async line => {
    if (syncedLocked) return
    const ok = await dialog.confirm({
      title: `Remove ${line.name} from tracked skills?`,
      message: 'This removes the line from the Character Tracker overview. Saved allocations remain available in character backups if you add the line again later.',
      confirmLabel: 'Remove Skill Line',
      danger: true
    })
    if (ok) await deleteTrackedSkillLine(line.id)
  }

  return <div className="page v3-skills-overview-page">
    <div className="page-title"><span className="eyebrow">Build-directed progression</span><h1>Skills &amp; passives</h1><p>Use the queue for the next purchases, then open a skill line when you need the complete ESO line. The final-build map below stays collapsed until you want the detail.</p></div>
    <SyncOverrideBar title="ESO skill snapshot connected" description="Owned skills and passive ranks stay protected until you turn on overrides. Temporary leveling steps can still be retired without changing the synced ESO snapshot." />

    <section className="panel next-five-panel">
      <div className="section-head"><div><span className="eyebrow">Do these next</span><h2>Unlock roadmap</h2></div><small>{actionableCount ? `${actionableCount} purchase${actionableCount === 1 ? '' : 's'} available right now from your recorded ranks, prerequisites, and unspent Skill Points.` : 'No build purchase is available right now. Raise the relevant skill lines, finish prerequisites, train base skills for morphs, or earn another Skill Point.'}</small></div>
      <div className="next-five-list">{recommended.length ? recommended.map((item, index) => <div className="numbered-skill" key={item.id}><span>{suggestionPage * SUGGESTIONS_PER_PAGE + index + 1}</span><SkillItem item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} onRetireTemporary={retireTemporary} onUseBuildCutoff={item => setTemporaryUnlockState(item.id, null)} disabled={syncedLocked} /></div>) : <div className="quiet-box">Nothing in the build is purchasable right now. ATTB only puts a skill or passive here when your recorded character can actually take it.</div>}</div>
      {pendingRecommendations.length > SUGGESTIONS_PER_PAGE && <div className="next-five-pagination"><span>Showing {firstShown}-{lastShown} of {pendingRecommendations.length}</span><div><button type="button" className="btn ghost compact" disabled={suggestionPage === 0} onClick={() => setSuggestionPage(page => Math.max(0, page - 1))}>Previous 5</button><b>Page {suggestionPage + 1} / {totalSuggestionPages}</b><button type="button" className="btn secondary compact" disabled={suggestionPage >= totalSuggestionPages - 1} onClick={() => setSuggestionPage(page => Math.min(totalSuggestionPages - 1, page + 1))}>Next 5</button></div></div>}
    </section>

    {retiredTemporary.length > 0 && <section className="panel temporary-cleanup-panel">
      <div className="section-head"><div><span className="eyebrow">Leveling cleanup</span><h2>Retired temporary skills &amp; passives</h2></div><small>{reclaimablePoints ? `${reclaimablePoints} Skill Point${reclaimablePoints === 1 ? '' : 's'} currently reclaimable from owned temporary purchases.` : 'These leveling-only steps no longer belong in your active build plan.'}</small></div>
      <div className="temporary-cleanup-list">{retiredTemporary.map(item => <article className="temporary-cleanup-item" key={item.id}>
        <SkillIcon skillId={item.catalog_skill_id} name={item.name} image={item.image} size="compact" />
        <div><div className="skill-title-line"><b>{item.name}</b><span className="mini-tag temporary">temporary</span><span className="mini-tag state retired">retired</span></div><small>{lineName(item.line)} · {item.kind}</small><p>{item.retirement.reason}{ownedNote(item)}</p></div>
        <button type="button" className="btn secondary compact temporary-state-button" onClick={() => setTemporaryUnlockState(item.id, item.retirement.source === 'manual' ? null : 'active')}>{item.retirement.source === 'manual' ? 'Follow build cutoff' : 'Keep active'}</button>
      </article>)}</div>
    </section>}

    <section className="section-block final-build-map">
      <div className="section-head"><div><span className="eyebrow">Destination overview</span><h2>Final Build Skills</h2><p>{completedFinal}/{finalItems.length} build-required purchases tracked. Personal skill lines you add below live here too without affecting the build recommendation queue.</p></div><DisclosureToolbar onExpandAll={() => setOpenFinalLines(new Set(finalLineIds))} onCollapseAll={() => setOpenFinalLines(new Set())} expandDisabled={openFinalLines.size === finalLineIds.length} collapseDisabled={!openFinalLines.size} /></div>
      <div className="final-destination-grid">{finalLineGroups.map(({ group, lines }) => {
        const groupItems = lines.flatMap(entry => entry.items)
        return <article className="panel final-destination-group" key={group}>
          <header><div><span className="eyebrow">{group}</span><h3>{group}</h3></div>{groupItems.length > 0 && <strong>{groupItems.filter(item => completed.has(item.id)).length}/{groupItems.length}</strong>}</header>
          <div className="final-line-disclosures">{lines.map(({ line, items, personalItems }) => {
            const buildLine = items.length > 0
            const meta = buildLine ? `${items.filter(item => completed.has(item.id)).length}/${items.length}` : null
            const summary = buildLine
              ? `${items.filter(item => item.kind === 'Passive').length} passives · ${items.filter(item => item.kind !== 'Passive').length} skills/morphs`
              : `${personalItems.length} selected skill${personalItems.length === 1 ? '' : 's'} · personal tracking`
            const action = line.tracked_only
              ? <button type="button" className="skill-line-remove-button" disabled={syncedLocked} onClick={() => removePersonalLine(line)}>Remove line</button>
              : null
            return <DisclosureSection key={line.id} title={line.name} meta={meta} summary={summary} action={action} open={openFinalLines.has(line.id)} onToggle={() => toggleFinalLine(line.id)}>
              {buildLine
                ? <div className="final-line-items">{items.map(item => <SkillItem key={item.id} item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} onRetireTemporary={retireTemporary} onUseBuildCutoff={item => setTemporaryUnlockState(item.id, null)} compact disabled={syncedLocked} />)}</div>
                : personalItems.length
                  ? <div className="personal-line-skill-list">{personalItems.map(skill => <div key={skill.id}><b>{skill.name}</b><span>{skill.type}</span></div>)}</div>
                  : <div className="quiet-box personal-line-empty">No skills or passives selected yet. <Link to={`/skills/${line.id}`}>Open {line.name}</Link> to track the abilities you actually use.</div>}
            </DisclosureSection>
          })}</div>
        </article>
      })}</div>
    </section>

    <section className="section-block available-skill-lines-section">
      <div className="section-head"><div><span className="eyebrow">Personal tracking</span><h2>Add another skill line</h2><p>These catalog lines are not currently part of the build or your personal tracker. Add one here for quick access without changing build recommendations.</p></div><div className="available-line-status"><span>{unusedLines.length} skill line{unusedLines.length === 1 ? '' : 's'} available</span>{syncedLocked && <em>Overrides off</em>}</div></div>
      {syncedLocked && <p className="available-lines-lock-help">This linked character is read-only while synced-data overrides are off. Turn overrides on above to add or remove personal skill lines.</p>}
      <div className="skill-line-directory available-skill-line-directory">{unusedLines.length ? unusedLines.map(line => <article key={line.id} className="skill-line-card addable-skill-line-card">
        <div><small>{line.group}{line.class ? ` · ${line.class}` : ''}</small><b>{line.name}</b><em>{line.max_rank || 50} ranks</em></div>
        <button type="button" className="btn secondary compact" disabled={syncedLocked} onClick={() => addPersonalLine(line)}>Add</button>
      </article>) : <div className="quiet-box">Every available catalog skill line is already part of the build or your personal tracker.</div>}</div>
    </section>
  </div>
}
