import type { BoundsPoint, CrossSectionData, LayerInfo, LayerPolygon, Marker, RefLine } from './types'

/**
 * Converts raw series data into closed polygons (one per continuous layer segment).
 * Layers with the same `id` at consecutive series points are connected linearly.
 * When a layer starts or ends mid-section, a pinch point is inserted at the adjacent
 * series point's distance. The pinch elevation is derived from the neighboring layers
 * at that point (the boundary where the layer above and below squeeze together), so
 * the absent layer tapers out naturally to a knife-edge.
 */
export function buildPolygons(data: CrossSectionData): LayerPolygon[] {
  const { series } = data
  if (series.length < 2) return []

  // Build lookup map from layerInfo (first entry per id wins)
  const infoMap = new Map<string, LayerInfo>()
  for (const info of data.layerInfo ?? []) {
    if (!infoMap.has(info.id)) infoMap.set(info.id, info)
  }

  // Collect unique layer ids in order of first appearance
  const ids: string[] = []
  const seen = new Set<string>()
  for (const pt of series) {
    for (const layer of pt.layers) {
      if (!seen.has(layer.id)) { seen.add(layer.id); ids.push(layer.id) }
    }
  }

  const polygons: LayerPolygon[] = []

  for (const layerId of ids) {
    const info = infoMap.get(layerId)
    const layerMeta = {
      label:   info?.name    ?? `Layer ${layerId}`,
      color:   info?.color   ?? '#ffffff',
      pattern: info?.hatch   ? `hatch:${info.hatch}` : '',
    }

    let runStart = -1
    for (let i = 0; i <= series.length; i++) {
      const present = i < series.length && series[i].layers.some(l => l.id === layerId)
      if (present && runStart === -1) {
        runStart = i
      } else if (!present && runStart !== -1) {
        polygons.push(buildRunPolygon(series, layerId, layerMeta, runStart, i - 1))
        runStart = -1
      }
    }
  }

  return polygons
}

/**
 * Returns the elevation at which the absent layer pinches out at `adjacentIdx`.
 * Looks at the layer immediately above or below the absent layer (by its position
 * in the layers array at `presentIdx`) and finds where those neighbors meet at
 * the adjacent point — i.e. the top of the layer below == the bottom of the layer above.
 */
function pinchElevation(
  series: BoundsPoint[],
  layerId: string,
  presentIdx: number,
  adjacentIdx: number,
): number {
  const presentLayers = series[presentIdx].layers
  const adjacentLayers = series[adjacentIdx].layers
  const pos = presentLayers.findIndex(l => l.id === layerId)

  // Try layer immediately above: use its bottom at the adjacent point
  if (pos > 0) {
    const aboveId = presentLayers[pos - 1].id
    const aboveAdj = adjacentLayers.find(l => l.id === aboveId)
    if (aboveAdj) return aboveAdj.bottom
  }

  // Try layer immediately below: use its top at the adjacent point
  if (pos < presentLayers.length - 1) {
    const belowId = presentLayers[pos + 1].id
    const belowAdj = adjacentLayers.find(l => l.id === belowId)
    if (belowAdj) return belowAdj.top
  }

  // Fallback: centre of the layer at the present point
  const layer = presentLayers[pos]
  return (layer.top + layer.bottom) / 2
}

function buildRunPolygon(
  series: BoundsPoint[],
  layerId: string,
  layerMeta: { label: string; pattern: string; color: string },
  from: number,
  to: number,
): LayerPolygon {
  const topEdge: [number, number][] = []
  const bottomEdge: [number, number][] = []

  // Leading taper: layer absent before this run → pinch at previous series point
  if (from > 0) {
    const elev = pinchElevation(series, layerId, from, from - 1)
    topEdge.push([series[from - 1].distance, elev])
    bottomEdge.push([series[from - 1].distance, elev])
  }

  for (let i = from; i <= to; i++) {
    const pt = series[i]
    const layer = pt.layers.find(l => l.id === layerId)!
    topEdge.push([pt.distance, layer.top])
    bottomEdge.push([pt.distance, layer.bottom])
  }

  // Trailing taper: layer absent after this run → pinch at next series point
  if (to < series.length - 1) {
    const elev = pinchElevation(series, layerId, to, to + 1)
    topEdge.push([series[to + 1].distance, elev])
    bottomEdge.push([series[to + 1].distance, elev])
  }

  // Polygon: top edge L→R, bottom edge R→L (closed trapezoid chain)
  return {
    layerId,
    label: layerMeta.label,
    pattern: layerMeta.pattern,
    color: layerMeta.color,
    points: [...topEdge, ...bottomEdge.reverse()],
  }
}

/**
 * Interpolates the top and bottom elevation of `layerId` at horizontal distance `x`.
 * Returns null if the layer is absent at both bracketing series points.
 */
export function interpolateLayerAt(
  data: CrossSectionData,
  x: number,
  layerId: string,
): Pick<Marker, 'layerTop' | 'layerBottom'> | null {
  const { series } = data
  if (series.length < 2) return null

  // Find bracketing indices
  let lo = 0
  let hi = series.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (series[mid].distance <= x) lo = mid
    else hi = mid
  }

  const pLo = series[lo]
  const pHi = series[hi]
  const lLo = pLo.layers.find(l => l.id === layerId)
  const lHi = pHi.layers.find(l => l.id === layerId)
  if (!lLo && !lHi) return null

  const t = (x - pLo.distance) / (pHi.distance - pLo.distance)
  const loTop = lLo?.top    ?? lHi!.top
  const loBtm = lLo?.bottom ?? lHi!.bottom
  const hiTop = lHi?.top    ?? lLo!.top
  const hiBtm = lHi?.bottom ?? lLo!.bottom

  return {
    layerTop:    loTop + (hiTop - loTop) * t,
    layerBottom: loBtm + (hiBtm - loBtm) * t,
  }
}

/**
 * Linearly interpolates geographic coordinates (lat/lon) at a given distance
 * using the nearest bracketing RefLine entries as control points.
 * Returns null if fewer than 2 refLines are provided.
 */
export function interpolateGeoCoords(
  refLines: RefLine[],
  distance: number,
): { lat: number; lon: number } | null {
  if (refLines.length < 2) return null

  // Sort by distance once (defensive — callers should keep them ordered)
  const sorted = [...refLines].sort((a, b) => a.distance - b.distance)

  // Clamp to the range of known ref lines
  if (distance <= sorted[0].distance) {
    return { lat: sorted[0].lat, lon: sorted[0].lon }
  }
  if (distance >= sorted[sorted.length - 1].distance) {
    const last = sorted[sorted.length - 1]
    return { lat: last.lat, lon: last.lon }
  }

  // Find bracketing pair
  let lo = 0
  let hi = sorted.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (sorted[mid].distance <= distance) lo = mid
    else hi = mid
  }

  const a = sorted[lo]
  const b = sorted[hi]
  const t = (distance - a.distance) / (b.distance - a.distance)

  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  }
}
