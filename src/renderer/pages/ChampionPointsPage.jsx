import { Navigate, useParams } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import CPCard from '../components/CPCard'
import { CP_ACCOUNT_MAX } from '../utils/buildLogic'

const TREES = ['craft', 'warfare', 'fitness']
const FIELD = { craft: 'cp_craft', warfare: 'cp_warfare', fitness: 'cp_fitness' }

function LiveChampionState({ character }) {
  const observed = character?.addon_sync?.observed?.champion
  if (!character?.addon_sync?.linked || !observed) return null
  const disciplines = observed.disciplines || []
  const slots = observed.slotted?.slots || []
  return <section className="panel live-observed-panel">
    <div className="section-head"><div><span className="eyebrow">Observed in ESO</span><h2>Invested and slotted Champion Points</h2><p>Tree totals feed ATTB's progression budget. The detailed snapshot below preserves the stars and Champion Bar ESO reported.</p></div><div className="schema-badges"><span>{observed.totalEarned || 0} earned</span><span>{slots.filter(slot => slot.skillId).length} slotted</span></div></div>
    <div className="live-observed-grid">{disciplines.map((discipline, index) => {
      const earned = Number(discipline.spent || 0) + Number(discipline.unspent || 0)
      return <article className="live-observed-card" key={discipline.disciplineId || index}>
      <header><div><small>{discipline.name || `Tree ${index + 1}`}</small><h3>{earned} earned</h3><em>{Number(discipline.unspent || 0)} unspent</em></div><span className="mini-tag state selected">{discipline.spent || 0} spent</span></header>
      <div className="live-observed-list">{(discipline.stars || []).length ? (discipline.stars || []).map(star => <div key={star.skillId}><b>{star.points || 0}/{star.maximumPoints || '?'}</b><span>{star.name}{star.slottable ? ' · slottable' : ''}</span></div>) : <div><b>Stars</b><span>No invested stars reported</span></div>}</div>
    </article>})}</div>
    {slots.length > 0 && <div className="live-bar"><header><div><span className="eyebrow">Champion Bar</span><h3>Current slottables</h3></div></header><div className="live-bar-slots">{slots.map((slot, index) => <div className="live-bar-slot" key={`${slot.position || index}:${slot.skillId || 0}`}><small>{slot.position || index + 1}</small><b>{slot.name || 'Empty'}</b><span className="mini-tag tracking">{slot.disciplineName || 'Tree'}</span></div>)}</div></div>}
  </section>
}

export default function ChampionPointsPage() {
  const { tree } = useParams()
  const { character, build, updateCharacter, appSettings } = useApp()
  if (!character || !build) return <EmptyState />
  const syncedLocked = character.addon_sync?.linked && appSettings.addon_allow_overrides !== 'true'
  if (tree && !TREES.includes(tree)) return <Navigate to="/champion-points" replace />

  const plans = build.cp_plans || {}
  const total = TREES.reduce((sum, key) => sum + Number(character[FIELD[key]] || 0), 0)
  const setTree = key => value => updateCharacter({ [FIELD[key]]: value })

  if (tree) return <div className="page champion-points-page">
    <CPCard tree={tree} plan={plans[tree]} total={character[FIELD[tree]] || 0} onChange={setTree(tree)} detailed disabled={syncedLocked} />
  </div>

  return <div className="page champion-points-page">
    <div className="page-title"><span className="eyebrow">Character-specific allocation</span><h1>Champion Points</h1><p>{character.addon_sync?.linked ? 'Constellation totals are synced from ESO. Enable override mode in App Settings to test another budget.' : 'Enter the total Champion Points earned in each constellation. ATTB turns those three budgets into an ordered path through required connections, recommended branches, optional alternatives, and final slottables.'}</p></div>
    <LiveChampionState character={character} />
    <section className="cp-account-summary panel">
      <div><span className="eyebrow">Tracked across all constellations</span><h2>{total.toLocaleString()} earned Champion Points</h2><p>These values stay with this ATTB character profile. Account-wide tracking can be added later without changing the build plans.</p></div>
      <div className="cp-account-ring" style={{ '--cp-progress': `${Math.min(100, total / CP_ACCOUNT_MAX * 100)}%` }}><b>{total}</b><small>of {CP_ACCOUNT_MAX.toLocaleString()}</small></div>
    </section>
    <div className="cp-overview-grid">{TREES.map(key => <CPCard key={key} tree={key} plan={plans[key]} total={character[FIELD[key]] || 0} onChange={setTree(key)} disabled={syncedLocked} />)}</div>
    <section className="panel cp-how-it-works"><div><span className="eyebrow">How allocation works</span><h2>Budget in, exact route out</h2></div><div className="cp-how-grid">
      <article><b>1</b><h3>Required connections</h3><p>Points first open the core path in the order defined by the build.</p></article>
      <article><b>2</b><h3>Recommended branches</h3><p>Remaining points fill the build's normal branches from top to bottom.</p></article>
      <article><b>3</b><h3>Optional alternatives</h3><p>Situational branches stay visible but are not silently chosen for you.</p></article>
      <article><b>4</b><h3>Champion Bar</h3><p>The final four slottables are shown for manual placement in ESO.</p></article>
    </div></section>
  </div>
}
