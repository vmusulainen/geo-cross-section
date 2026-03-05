import { describe, it, expect } from 'vitest'
import { buildPolygons, interpolateLayerAt } from './geometry'
import type { CrossSectionData } from './types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Two points, two layers present at both — simplest full-coverage case */
const simple: CrossSectionData = {
  series: [
    { distance: 0,   layers: [{ id: 'sand', top: 20, bottom: 10 }, { id: 'clay', top: 10, bottom: 0 }] },
    { distance: 100, layers: [{ id: 'sand', top: 18, bottom: 8  }, { id: 'clay', top:  8, bottom: 0 }] },
  ],
}

/** Layer 'lens' appears only at the middle point — tests leading & trailing taper */
const withLens: CrossSectionData = {
  series: [
    { distance: 0,   layers: [{ id: 'sand', top: 20, bottom: 0 }] },
    { distance: 50,  layers: [{ id: 'sand', top: 20, bottom: 10 }, { id: 'lens', top: 10, bottom: 0 }] },
    { distance: 100, layers: [{ id: 'sand', top: 20, bottom: 0 }] },
  ],
}

// ── buildPolygons ─────────────────────────────────────────────────────────────

describe('buildPolygons', () => {
  it('returns empty array for fewer than 2 series points', () => {
    expect(buildPolygons({ series: [] })).toEqual([])
    expect(buildPolygons({ series: [simple.series[0]] })).toEqual([])
  })

  it('produces one polygon per layer when all layers are present at every point', () => {
    const polygons = buildPolygons(simple)
    expect(polygons).toHaveLength(2)
  })

  it('polygon layerIds match the input layer ids', () => {
    const polygons = buildPolygons(simple)
    const ids = polygons.map(p => p.layerId).sort()
    expect(ids).toEqual(['clay', 'sand'])
  })

  it('polygon has 2×n points (top edge + reversed bottom edge)', () => {
    const polygons = buildPolygons(simple)
    // 2 series points, no taper → 2 top + 2 bottom = 4 points each
    for (const p of polygons) {
      expect(p.points).toHaveLength(4)
    }
  })

  it('top-edge points are ordered left-to-right by distance', () => {
    const [sand] = buildPolygons(simple)
    const half = sand.points.length / 2
    const topEdge = sand.points.slice(0, half)
    for (let i = 1; i < topEdge.length; i++) {
      expect(topEdge[i][0]).toBeGreaterThanOrEqual(topEdge[i - 1][0])
    }
  })

  // ── layerInfo defaults ──────────────────────────────────────────────────────

  it('uses default label "Layer <id>" when layerInfo is absent', () => {
    const [p] = buildPolygons({ series: simple.series })
    expect(p.label).toBe(`Layer ${p.layerId}`)
  })

  it('uses default white color when layerInfo is absent', () => {
    const polygons = buildPolygons({ series: simple.series })
    for (const p of polygons) expect(p.color).toBe('#ffffff')
  })

  it('uses empty pattern string when no hatch is provided', () => {
    const polygons = buildPolygons({ series: simple.series })
    for (const p of polygons) expect(p.pattern).toBe('')
  })

  it('applies name, color, and hatch from layerInfo', () => {
    const data: CrossSectionData = {
      ...simple,
      layerInfo: [
        { id: 'sand', name: 'Fine sand', color: '#f5e0a0', hatch: '/hatches/005.png' },
      ],
    }
    const polygons = buildPolygons(data)
    const sand = polygons.find(p => p.layerId === 'sand')!
    expect(sand.label).toBe('Fine sand')
    expect(sand.color).toBe('#f5e0a0')
    expect(sand.pattern).toBe('hatch:/hatches/005.png')
  })

  it('falls back to defaults for layers not listed in layerInfo', () => {
    const data: CrossSectionData = {
      ...simple,
      layerInfo: [{ id: 'sand', name: 'Sand', color: '#aaa' }],
    }
    const polygons = buildPolygons(data)
    const clay = polygons.find(p => p.layerId === 'clay')!
    expect(clay.label).toBe('Layer clay')
    expect(clay.color).toBe('#ffffff')
  })

  it('first layerInfo entry wins for duplicate ids', () => {
    const data: CrossSectionData = {
      ...simple,
      layerInfo: [
        { id: 'sand', name: 'First',  color: '#111' },
        { id: 'sand', name: 'Second', color: '#222' },
      ],
    }
    const polygons = buildPolygons(data)
    const sand = polygons.find(p => p.layerId === 'sand')!
    expect(sand.label).toBe('First')
    expect(sand.color).toBe('#111')
  })

  // ── taper / pinch ───────────────────────────────────────────────────────────

  it('creates a pinch polygon for a layer that appears mid-section (lens)', () => {
    const polygons = buildPolygons(withLens)
    // sand + lens
    expect(polygons).toHaveLength(2)
  })

  it('lens polygon has leading and trailing taper points at adjacent distances', () => {
    const polygons = buildPolygons(withLens)
    const lens = polygons.find(p => p.layerId === 'lens')!
    const distances = lens.points.map(([d]) => d)
    // taper at distance 0 and 100 (the adjacent points), peak at 50
    expect(distances).toContain(0)
    expect(distances).toContain(100)
    expect(distances).toContain(50)
  })

  it('lens taper points (leading & trailing) have equal top and bottom elevation (knife-edge)', () => {
    const polygons = buildPolygons(withLens)
    const lens = polygons.find(p => p.layerId === 'lens')!
    const half = lens.points.length / 2
    const topEdge    = lens.points.slice(0, half)
    const bottomEdge = [...lens.points.slice(half)].reverse()
    // First and last points (the taper ends) must coincide vertically
    expect(topEdge[0][1]).toBe(bottomEdge[0][1])
    expect(topEdge[topEdge.length - 1][1]).toBe(bottomEdge[bottomEdge.length - 1][1])
  })

  it('preserves layer order from first appearance in series', () => {
    const polygons = buildPolygons(simple)
    expect(polygons[0].layerId).toBe('sand')
    expect(polygons[1].layerId).toBe('clay')
  })
})

// ── interpolateLayerAt ────────────────────────────────────────────────────────

describe('interpolateLayerAt', () => {
  it('returns null for fewer than 2 series points', () => {
    expect(interpolateLayerAt({ series: [simple.series[0]] }, 0, 'sand')).toBeNull()
  })

  it('returns null for a layer id that does not exist', () => {
    expect(interpolateLayerAt(simple, 50, 'rock')).toBeNull()
  })

  it('interpolates top and bottom at the exact midpoint', () => {
    const result = interpolateLayerAt(simple, 50, 'sand')
    expect(result).not.toBeNull()
    // top:  20 + (18 - 20) * 0.5 = 19
    expect(result!.layerTop).toBeCloseTo(19)
    // bottom: 10 + (8 - 10) * 0.5 = 9
    expect(result!.layerBottom).toBeCloseTo(9)
  })

  it('returns exact values at the left boundary (x = distance[0])', () => {
    const result = interpolateLayerAt(simple, 0, 'clay')
    expect(result!.layerTop).toBeCloseTo(10)
    expect(result!.layerBottom).toBeCloseTo(0)
  })

  it('returns exact values at the right boundary (x = distance[last])', () => {
    const result = interpolateLayerAt(simple, 100, 'clay')
    expect(result!.layerTop).toBeCloseTo(8)
    expect(result!.layerBottom).toBeCloseTo(0)
  })

  it('interpolates correctly at one-quarter distance', () => {
    const result = interpolateLayerAt(simple, 25, 'sand')
    // top: 20 + (18 - 20) * 0.25 = 19.5
    expect(result!.layerTop).toBeCloseTo(19.5)
  })

  it('returns a result for a layer present at only one bracket point', () => {
    // 'lens' is only at distance 50; ask at distance 25 (lo=0 absent, hi=50 present)
    const result = interpolateLayerAt(withLens, 25, 'lens')
    expect(result).not.toBeNull()
  })

  it('layerTop is always greater than layerBottom for valid data', () => {
    const result = interpolateLayerAt(simple, 60, 'sand')!
    expect(result.layerTop).toBeGreaterThan(result.layerBottom)
  })
})
