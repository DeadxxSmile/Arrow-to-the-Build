import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import SkillIcon from '../components/SkillIcon'
import { actionableUnlocks, effectiveCompletedSet, requiredRankFor, unlockState } from '../utils/buildLogic'
import { effectiveAllocation } from '../utils/catalogLogic'

const SUGGESTIONS_PER_PAGE = 5

function SkillItem({ item, build, character, lineName, toggleUnlock, compact = false, disabled = false }) {
  const state = unlockState(item, character, build)
  const blocked = state === 'blocked' || state === 'locked'
  const complete = state === 'complete'
  const currentLineRank = item.line ? Number(character?.skill_ranks?.[item.line] || 0) : 0
  const requiredRank = requiredRankFor(item, build)
  const rankGap = Math.max(0, requiredRank - currentLineRank)
  return <article className={`skill-summary-item ${state} ${compact ? 'compact' : ''}`}>
    <button
      type="button"
      className={`completion-box skill-summary-toggle ${complete ? 'selected' : ''}`}
      role="checkbox"
      aria-checked={complete}
      aria-label={`${complete ? 'Mark incomplete' : 'Mark complete'}: ${item.name}`}
      disabled={disabled}
      title={disabled ? 'This value comes from the synced ESO snapshot. Enable override mode to change it locally.' : undefined}
      onClick={() => toggleUnlock(item.id, !complete)}
    ><span aria-hidden="true">{complete ? '✓' : ''}</span></button>
    <SkillIcon skillId={item.catalog_skill_id} name={item.name} image={item.image} size={compact ? 'compact' : 'list'} />
    <div>
      <div className="skill-title-line">
        <b>{item.name}</b>
        <span className={`mini-tag ${item.status}`}>{item.status}</span>
        <span className={`mini-tag state ${state}`}>{state === 'train' ? 'morph after IV' : state}</span>
      </div>
      <small>{lineName(item.line)} · {item.kind} · Rank {requiredRank}</small>
      {!compact && <p>{item.notes}</p>}
      {item.kind === 'Morph' && <em>Train {item.morph_from || 'the base skill'} to Rank IV, then select this morph.</em>}
      {state === 'locked' && <em>Current {lineName(item.line)} rank: {currentLineRank}. Requires rank {requiredRank}{rankGap ? ` · ${rankGap} rank${rankGap === 1 ? '' : 's'} away` : ''}.</em>}
      {state === 'blocked' && compact && <em>Needs an earlier purchase first.</em>}
    </div>
  </article>
}

export default function SkillsPage() {
  const { character, build, toggleUnlock, skillGroups, skillLines, appSettings } = useApp()
  const [suggestionPage, setSuggestionPage] = useState(0)
  const pendingRecommendations = useMemo(() => actionableUnlocks(build, character), [build, character])
  const totalSuggestionPages = Math.max(1, Math.ceil(pendingRecommendations.length / SUGGESTIONS_PER_PAGE))
  useEffect(() => { setSuggestionPage(page => Math.min(page, totalSuggestionPages - 1)) }, [totalSuggestionPages])
  if (!character || !build) return <EmptyState />

  const lineName = id => skillLines.find(l => l.id === id)?.name || id
  const ordered = [...(build.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
  const recommended = pendingRecommendations.slice(suggestionPage * SUGGESTIONS_PER_PAGE, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)
  const actionableCount = pendingRecommendations.length
  const finalItems = ordered.filter(x => x.status === 'final')
  const completed = effectiveCompletedSet(build, character)
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'
  const completedFinal = finalItems.filter(x => completed.has(x.id)).length
  const firstShown = pendingRecommendations.length ? suggestionPage * SUGGESTIONS_PER_PAGE + 1 : 0
  const lastShown = Math.min(pendingRecommendations.length, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)

  return <div className="page">
    <div className="page-title"><span className="eyebrow">Build-directed progression</span><h1>Skills &amp; passives</h1><p>The recommendation queue is build-specific. Every line page also contains the complete in-game line so you can record optional skills, alternate morphs, crafting passives, and anything else you actually purchased.</p></div>
    {character.addon_sync?.linked && <div className="sync-status-banner"><span className="sync-dot" /><div><b>Build progress matched against your synced ESO skills</b><small>{syncedLocked ? 'Owned skills and passive ranks are read-only here until override mode is enabled in Settings > ESO Addon & Sync.' : 'Changes here create local overrides while the synced ESO values remain available to restore.'}</small></div></div>}

    <section className="panel next-five-panel">
      <div className="section-head"><div><span className="eyebrow">Do these next</span><h2>Unlock roadmap</h2></div><small>{actionableCount ? `${actionableCount} purchase${actionableCount === 1 ? '' : 's'} available right now from your recorded ranks, prerequisites, and unspent Skill Points.` : 'No build purchase is available right now. Raise the relevant skill lines, finish prerequisites, train base skills for morphs, or earn another Skill Point.'}</small></div>
      <div className="next-five-list">{recommended.length ? recommended.map((item, index) => <div className="numbered-skill" key={item.id}><span>{suggestionPage * SUGGESTIONS_PER_PAGE + index + 1}</span><SkillItem item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} disabled={syncedLocked} /></div>) : <div className="quiet-box">Nothing in the build is purchasable right now. ATTB will only place a skill or passive here when your recorded character state can actually take it.</div>}</div>
      {pendingRecommendations.length > SUGGESTIONS_PER_PAGE && <div className="next-five-pagination"><span>Showing {firstShown}-{lastShown} of {pendingRecommendations.length}</span><div><button type="button" className="btn ghost compact" disabled={suggestionPage === 0} onClick={() => setSuggestionPage(page => Math.max(0, page - 1))}>Previous 5</button><b>Page {suggestionPage + 1} / {totalSuggestionPages}</b><button type="button" className="btn secondary compact" disabled={suggestionPage >= totalSuggestionPages - 1} onClick={() => setSuggestionPage(page => Math.min(totalSuggestionPages - 1, page + 1))}>Next 5</button></div></div>}
    </section>

    <section className="section-block">
      <div className="section-head"><div><span className="eyebrow">Destination overview</span><h2>Final build skills &amp; passives</h2></div><p>{completedFinal}/{finalItems.length} final-build purchases tracked. Numbered order and the full line are available from each submenu page.</p></div>
      <div className="final-skill-groups">{skillGroups.map(([group, lines]) => {
        const ids = new Set(lines.filter(x => x.build_relevant).map(x => x.id))
        const items = finalItems.filter(x => ids.has(x.line))
        if (!items.length) return null
        return <article className="panel final-group" key={group}>
          <div className="final-group-head"><h3>{group}</h3><span>{items.filter(x => completed.has(x.id)).length}/{items.length}</span></div>
          <div>{items.map(item => <SkillItem key={item.id} item={item} build={build} character={character} lineName={lineName} toggleUnlock={toggleUnlock} compact disabled={syncedLocked} />)}</div>
        </article>
      })}</div>
    </section>

    <section className="section-block">
      <div className="section-head"><div><span className="eyebrow">Browse by line</span><h2>Tracked skill lines</h2></div><p>Build lines affect suggestions. Additional catalog lines are complete personal trackers and never distort the build queue.</p></div>
      <div className="skill-line-directory">{skillGroups.flatMap(([, lines]) => lines).map(line => {
        const spent = (line.skills || []).reduce((sum, skill) => sum + effectiveAllocation(character, build, line.id, skill), 0)
        return <Link key={line.id} to={`/skills/${line.id}`} className="skill-line-card">
          <div><small>{line.group}{line.tracked_only ? ' · tracking only' : ''}</small><b>{line.name}</b><em>{spent} point{spent === 1 ? '' : 's'} recorded</em></div>
          <span>{character.skill_ranks[line.id] ?? 0}/{line.max || 50}</span>
        </Link>
      })}</div>
    </section>
  </div>
}
