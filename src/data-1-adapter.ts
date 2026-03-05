import type { CrossSectionData } from './lib/types'
// @ts-ignore – data-1.js has no TS declarations
import rawData from './data-1.js'

// ── Canonical layer order (top → bottom) matching definition keys ──────────
const LAYER_ORDER = [
  'layer_002', 'layer_003', 'layer_004', 'layer_005', 'layer_006',
  'layer_007', 'layer_017', 'layer_020', 'layer_021', 'layer_024',
  'layer_026', 'layer_030', 'layer_038', 'layer_039', 'layer_045',
  'layer_049', 'layer_057', 'layer_071', 'layer_073', 'layer_075',
  'layer_076', 'layer_078', 'layer_083', 'layer_094', 'layer_095',
  'layer_097', 'layer_098', 'layer_100', 'layer_105', 'layer_107',
]

// Geology-based pattern assignments kept as reference/fallback documentation
// (active layers now use PNG hatch tiles via 'hatch:NNN' pattern names)

interface RawData {
  partLength: number
  colors: string[]
  definition: Record<string, string>
  layers: Array<Record<string, number>>
}

function convert(raw: RawData): CrossSectionData {
  // Build color lookup: colors[i] corresponds to LAYER_ORDER[i]
  const colorMap: Record<string, string> = {}
  LAYER_ORDER.forEach((key, i) => { colorMap[key] = raw.colors[i] ?? '#888' })

  // Section base: extend 20 m below the shallowest layer_105 occurrence
  const layer105Tops = raw.layers.map(p => p['layer_105'] ?? 0).filter(v => v > 0)
  const sectionBase = Math.min(...layer105Tops) - 20

  const series = raw.layers.map(point => {
    const distance = (point['index'] ?? 0) * raw.partLength

    // Ordered entries with a real (> 0) elevation value
    const present = LAYER_ORDER
      .map(key => ({ key, value: point[key] ?? 0 }))
      .filter(e => e.value > 0)

    const layers = []
    for (let i = 0; i < present.length; i++) {
      const top    = present[i].value
      const bottom = i + 1 < present.length ? present[i + 1].value : sectionBase
      if (top <= bottom) continue  // zero/negative thickness → absent

      const key = present[i].key
      // Derive zero-padded hatch code from key (e.g. 'layer_038' → 'hatch:038')
      const hatchCode = key.replace('layer_', '').padStart(3, '0')
      layers.push({
        id:      key,
        label:   raw.definition[key] ?? key,
        top,
        bottom,
        pattern: `hatch:${hatchCode}`,
        color:   colorMap[key] ?? '#aaa',
      })
    }

    return { distance, layers }
  })

  return { series }
}

export const data1Converted: CrossSectionData = convert(rawData as RawData)
