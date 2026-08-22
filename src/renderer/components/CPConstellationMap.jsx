import { useEffect, useMemo, useRef, useState } from 'react'
import { cpLayoutForTree, cpStarsForTree, getCpLayout, getCpStar } from '../utils/cpCatalog.mjs'

const LABELS = { craft: 'Craft', warfare: 'Warfare', fitness: 'Fitness' }
const MAIN_FRAME = { x: 72, y: 72, width: 856, height: 536 }
const BASE_VIEW = { x: 0, y: 0, width: 1000, height: 700 }
const MIN_ZOOM = 0.7
const MAX_ZOOM = 3.5

function lineKey(a, b) { return [a, b].sort().join(':') }
const finite = value => Number.isFinite(Number(value))
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function fitPoints(rows, readPoint, frame, invertY = false) {
  const valid = rows.map(row => ({ row, point: readPoint(row) })).filter(item => finite(item.point?.x) && finite(item.point?.y))
  if (!valid.length) return new Map()
  const xs = valid.map(item => Number(item.point.x))
  const ys = valid.map(item => Number(item.point.y))
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY)
  const scale = Math.min(frame.width / spanX, frame.height / spanY)
  const drawnWidth = spanX * scale, drawnHeight = spanY * scale
  const offsetX = frame.x + (frame.width - drawnWidth) / 2
  const offsetY = frame.y + (frame.height - drawnHeight) / 2
  const result = new Map()
  for (const { row, point } of valid) {
    const x = offsetX + (Number(point.x) - minX) * scale
    const rawY = invertY ? maxY - Number(point.y) : Number(point.y) - minY
    const y = offsetY + rawY * scale
    result.set(row.id, { x, y })
  }
  return result
}

function statusText({ star, routeIds, targetIds, focusId, nextId, invested }) {
  const bits = [star.name]
  if (star.id === nextId) bits.push('Do this next')
  else if (star.id === focusId) bits.push('Selected')
  if (targetIds.has(star.id)) bits.push('Build target')
  else if (routeIds.has(star.id)) bits.push('Route to selected node')
  if (invested > 0) bits.push(`${invested} point${invested === 1 ? '' : 's'} invested`)
  return bits.join(' · ')
}

function NodeGlyph({ star, point, routeIds, targetIds, focusId, nextId, observedPoints, portal = false, label = false, portalDetail = '', onHover }) {
  if (!point) return null
  const invested = observedPoints instanceof Map ? (observedPoints.get(star.id) || 0) : 0
  const classes = [
    routeIds.has(star.id) ? 'route' : '', targetIds.has(star.id) ? 'target' : '',
    star.id === focusId ? 'focus' : '', star.id === nextId ? 'next' : '', invested > 0 ? 'invested' : '',
    star.slottable ? 'slottable' : 'passive', portal ? 'portal' : ''
  ].filter(Boolean).join(' ')
  const ariaLabel = [statusText({ star, routeIds, targetIds, focusId, nextId, invested }), portalDetail].filter(Boolean).join(' · ')
  return <g
    className={`cp-map-node ${classes}`}
    transform={`translate(${point.x} ${point.y})`}
    aria-label={ariaLabel}
    onPointerEnter={event => onHover?.(event, star.name)}
    onPointerMove={event => onHover?.(event, star.name)}
    onPointerLeave={() => onHover?.(null, null)}
  >
    {portal ? <rect x="-15" y="-15" width="30" height="30" rx="7" /> : <circle r={star.slottable ? 14 : 11} />}
    {invested > 0 && <circle className="invested-ring" r={star.slottable ? 20 : 17} />}
    {label && <text x="0" y={portal ? -24 : star.slottable ? -22 : -19} textAnchor="middle">{star.name}</text>}
    {(star.id === nextId || star.id === focusId) && <text className="cp-map-node-points" x="0" y="4" textAnchor="middle">{invested || ''}</text>}
  </g>
}

export default function CPConstellationMap({ tree, route = [], focusId = null, nextId = null, observedPoints = null, compact = false }) {
  const stars = useMemo(() => cpStarsForTree(tree), [tree])
  const byId = useMemo(() => new Map(stars.map(star => [star.id, star])), [stars])
  const layoutRows = useMemo(() => cpLayoutForTree(tree), [tree])
  const layoutById = useMemo(() => new Map(layoutRows.map(row => [row.id, row])), [layoutRows])
  const svgRef = useRef(null)
  const mapRef = useRef(null)
  const dragRef = useRef(null)
  const [viewBox, setViewBox] = useState(BASE_VIEW)
  const [dragging, setDragging] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  // The constellation belongs to ESO, not to a character. ATTB ships the
  // verified Update 50 geometry as canonical offline data so this map is exact
  // even when the ESO addon has never been installed. Sync only supplies CURRENT
  // investment/slotted state; it is never required to place nodes.
  const mainIdFor = id => {
    const row = layoutById.get(id) || getCpLayout(id)
    return row?.cluster_root_id || id
  }

  // The map is a locator for one selected star. Only show the documented route
  // up to that star so later build targets do not look already owned or immediate.
  const focusedRoute = useMemo(() => {
    if (!focusId) return route
    const index = route.findIndex(entry => (entry?.node?.id || entry?.id) === focusId)
    if (index < 0) return route.filter(entry => (entry?.node?.id || entry?.id) === focusId)
    return route.slice(0, index + 1)
  }, [route, focusId])

  const routeIds = useMemo(() => new Set(focusedRoute.map(entry => entry?.node?.id || entry?.id).filter(Boolean)), [focusedRoute])
  const targetIds = useMemo(() => {
    if (focusId) {
      const selected = focusedRoute.find(entry => (entry?.node?.id || entry?.id) === focusId)
      return new Set(selected && selected?.authored !== false && !selected?.prerequisite ? [focusId] : [])
    }
    return new Set(route.filter(entry => entry?.authored !== false && !entry?.prerequisite).map(entry => entry?.node?.id || entry?.id).filter(Boolean))
  }, [route, focusedRoute, focusId])

  // Nested ESO clusters stay collapsed to their outer portal on this locator.
  // Exact cluster membership is bundled beside the canonical CP catalog.
  const mainRows = layoutRows.filter(row => !row.cluster_root_id || row.cluster_root === true)
  const mainPositions = fitPoints(mainRows, row => ({ x: row.x, y: row.y }), MAIN_FRAME, true)
  const mainRouteIds = useMemo(() => new Set([...routeIds].map(mainIdFor)), [routeIds, layoutById])
  const mainTargetIds = useMemo(() => new Set([...targetIds].map(mainIdFor)), [targetIds, layoutById])
  const mainFocusId = focusId ? mainIdFor(focusId) : null
  const mainNextId = nextId ? mainIdFor(nextId) : null

  useEffect(() => {
    setViewBox(BASE_VIEW)
    setTooltip(null)
  }, [tree, focusId])

  // Topology remains canonical catalog data. Map nested cluster members back to
  // their visible portal before drawing the outer constellation graph.
  const edges = []
  const seen = new Set()
  for (const star of stars) for (const linkedId of star.links || []) {
    if (!star.links_verified || !byId.has(linkedId)) continue
    const fromId = mainIdFor(star.id)
    const toId = mainIdFor(linkedId)
    if (!fromId || !toId || fromId === toId || !byId.has(fromId) || !byId.has(toId)) continue
    const key = lineKey(fromId, toId)
    if (seen.has(key)) continue
    seen.add(key)
    edges.push([byId.get(fromId), byId.get(toId), mainRouteIds.has(fromId) && mainRouteIds.has(toId)])
  }

  const portalDetails = useMemo(() => {
    const result = new Map()
    for (const id of routeIds) {
      const mainId = mainIdFor(id)
      if (!mainId || mainId === id) continue
      const star = getCpStar(id)
      if (!star) continue
      if (!result.has(mainId)) result.set(mainId, new Set())
      result.get(mainId).add(star.name)
    }
    return new Map([...result].map(([id, names]) => [id, `Route inside: ${[...names].join(', ')}`]))
  }, [routeIds, layoutById])

  const zoom = BASE_VIEW.width / viewBox.width
  const changeZoom = (factor, anchor = null) => {
    setViewBox(previous => {
      const currentZoom = BASE_VIEW.width / previous.width
      const nextZoom = clamp(currentZoom * factor, MIN_ZOOM, MAX_ZOOM)
      if (Math.abs(nextZoom - currentZoom) < 0.0001) return previous
      const nextWidth = BASE_VIEW.width / nextZoom
      const nextHeight = BASE_VIEW.height / nextZoom
      const point = anchor || { x: previous.x + previous.width / 2, y: previous.y + previous.height / 2 }
      const relativeX = (point.x - previous.x) / previous.width
      const relativeY = (point.y - previous.y) / previous.height
      return {
        x: point.x - relativeX * nextWidth,
        y: point.y - relativeY * nextHeight,
        width: nextWidth,
        height: nextHeight
      }
    })
  }

  const clientToSvg = event => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM?.()
    if (!svg || !matrix) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(matrix.inverse())
  }

  const handleWheel = event => {
    if (compact) return
    event.preventDefault()
    setTooltip(null)
    changeZoom(event.deltaY < 0 ? 1.16 : 1 / 1.16, clientToSvg(event))
  }

  const handlePointerDown = event => {
    if (compact || event.button !== 0) return
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM?.()
    if (!svg || !matrix) return
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      viewBox,
      scaleX: Math.abs(matrix.a) || 1,
      scaleY: Math.abs(matrix.d) || 1
    }
    setTooltip(null)
    setDragging(true)
    svg.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = event => {
    const drag = dragRef.current
    if (!drag) return
    setViewBox({
      ...drag.viewBox,
      x: drag.viewBox.x - (event.clientX - drag.clientX) / drag.scaleX,
      y: drag.viewBox.y - (event.clientY - drag.clientY) / drag.scaleY
    })
  }

  const endDrag = event => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    svgRef.current?.releasePointerCapture?.(event.pointerId)
  }

  const handleHover = (event, name) => {
    if (!event || !name || dragging) {
      setTooltip(null)
      return
    }
    const rect = mapRef.current?.getBoundingClientRect?.()
    if (!rect) return
    const widthGuess = Math.min(260, Math.max(120, name.length * 8 + 24))
    let left = event.clientX - rect.left + 14
    let top = event.clientY - rect.top + 14
    if (left + widthGuess > rect.width - 10) left = Math.max(10, event.clientX - rect.left - widthGuess - 14)
    if (top + 36 > rect.height - 10) top = Math.max(10, event.clientY - rect.top - 42)
    setTooltip({ name, left, top })
  }

  const aria = `${LABELS[tree] || tree} Champion Point map. Layout follows the canonical Update 50 ESO constellation bundled with ATTB and works without addon sync. ${focusId ? `Only the route through ${getCpStar(focusId)?.name || focusId} is emphasized; later build targets stay dim.` : ''}`

  const sourceLabel = 'ESO layout · Update 50'

  return <div ref={mapRef} className={`cp-constellation-map ${compact ? 'compact' : 'full'} eso-layout ${focusId ? 'focused-route' : 'full-route'} ${dragging ? 'dragging' : ''}`}>
    <div className="cp-map-source live">{sourceLabel}</div>
    {!compact && <div className="cp-map-controls" aria-label="Constellation map zoom controls">
      <button type="button" onClick={() => changeZoom(1 / 1.2)} aria-label="Zoom out">−</button>
      <button type="button" onClick={() => { setViewBox(BASE_VIEW); setTooltip(null) }} aria-label="Fit constellation to view">Fit</button>
      <button type="button" onClick={() => changeZoom(1.2)} aria-label="Zoom in">+</button>
      <span>{Math.round(zoom * 100)}%</span>
    </div>}
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      role="img"
      aria-label={aria}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <g className="cp-map-edges">
        {edges.map(([from, to, active]) => {
          const a = mainPositions.get(from.id), b = mainPositions.get(to.id)
          if (!a || !b) return null
          return <line key={lineKey(from.id, to.id)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={active ? 'route' : ''} />
        })}
      </g>
      <g className="cp-map-nodes">
        {mainRows.map(row => byId.get(row.id)).filter(Boolean).map(star => {
          const row = layoutById.get(star.id)
          const portal = row?.cluster_root === true
          const label = star.id === mainFocusId || star.id === mainNextId
          return <NodeGlyph key={star.id} star={star} point={mainPositions.get(star.id)} routeIds={mainRouteIds} targetIds={mainTargetIds} focusId={mainFocusId} nextId={mainNextId} observedPoints={observedPoints} portal={portal} label={label} portalDetail={portalDetails.get(star.id) || ''} onHover={handleHover} />
        })}
      </g>
    </svg>
    {tooltip && <div className="cp-map-hover-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.name}</div>}
    {!compact && <div className="cp-map-legend"><span><i className="target" />Selected build target</span><span><i className="route" />Route to selected node</span><span><i className="invested" />Invested in ESO</span><span><i className="next" />Do this next</span><span><i className="portal" />Open this ESO cluster</span></div>}
  </div>
}

export function CPMapButton({ focusId, onOpen, label = 'Show on constellation map' }) {
  return <span className="cp-map-button-wrap">
    <button type="button" className="cp-map-button" aria-label={label} title={label} onClick={event => { event.stopPropagation(); onOpen?.(focusId) }}>⌖</button>
  </span>
}
