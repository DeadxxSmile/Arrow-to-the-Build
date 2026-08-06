import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useApp } from '../App'
import EmptyState from './EmptyState'
import CPCard from '../components/CPCard'
import { CP_ACCOUNT_MAX } from '../utils/buildLogic'

const TREES = ['craft', 'warfare', 'fitness']
const FIELD = { craft: 'cp_craft', warfare: 'cp_warfare', fitness: 'cp_fitness' }

export default function ChampionPointsPage() {
  const { tree } = useParams()
  const { character, build, updateCharacter } = useApp()
  if (!character || !build) return <EmptyState />
  if (tree && !TREES.includes(tree)) return <Navigate to="/champion-points" replace />

  const plans = build.cp_plans || {}
  const total = TREES.reduce((sum, key) => sum + Number(character[FIELD[key]] || 0), 0)
  const setTree = key => value => updateCharacter({ [FIELD[key]]: value })

  if (tree) return <div className="page champion-points-page">
    <CPCard tree={tree} plan={plans[tree]} total={character[FIELD[tree]] || 0} onChange={setTree(tree)} detailed />
  </div>

  return <div className="page champion-points-page">
    <div className="page-title"><span className="eyebrow">Character-specific allocation</span><h1>Champion Points</h1><p>Enter the points this character can spend in each constellation. ATTB turns those three budgets into an ordered path through required connections, recommended branches, optional alternatives, and final slottables.</p></div>
    <section className="cp-account-summary panel">
      <div><span className="eyebrow">Entered across all constellations</span><h2>{total.toLocaleString()} Champion Points</h2><p>These values stay with this ATTB character profile. Account-wide tracking can be added later without changing the build plans.</p></div>
      <div className="cp-account-ring" style={{ '--cp-progress': `${Math.min(100, total / CP_ACCOUNT_MAX * 100)}%` }}><b>{total}</b><small>of {CP_ACCOUNT_MAX.toLocaleString()}</small></div>
    </section>
    <div className="cp-overview-grid">{TREES.map(key => <CPCard key={key} tree={key} plan={plans[key]} total={character[FIELD[key]] || 0} onChange={setTree(key)} />)}</div>
    <section className="panel cp-how-it-works"><div><span className="eyebrow">How allocation works</span><h2>Budget in, exact route out</h2></div><div className="cp-how-grid">
      <article><b>1</b><h3>Required connections</h3><p>Points first open the core path in the order defined by the build.</p></article>
      <article><b>2</b><h3>Recommended branches</h3><p>Remaining points fill the build's normal branches from top to bottom.</p></article>
      <article><b>3</b><h3>Optional alternatives</h3><p>Situational branches stay visible but are not silently chosen for you.</p></article>
      <article><b>4</b><h3>Champion Bar</h3><p>The final four slottables are shown for manual placement in ESO.</p></article>
    </div></section>
  </div>
}
