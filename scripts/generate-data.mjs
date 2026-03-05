#!/usr/bin/env node
// Run: node scripts/generate-data.mjs
// Outputs: src/data-1-converted.json

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load raw data — strip ES export syntax and evaluate as a plain object
const rawSrc = readFileSync(resolve(__dirname, '../src/data-1.js'), 'utf8')
// Remove the trailing `export default data1` statement
const objSrc = rawSrc.replace(/\bexport\s+default\s+\w+\s*;?\s*$/, '').trim()
const fn = new Function(`${objSrc}; return data1;`)
const raw = fn()

const LAYER_ORDER = [
  'layer_002', 'layer_003', 'layer_004', 'layer_005', 'layer_006',
  'layer_007', 'layer_017', 'layer_020', 'layer_021', 'layer_024',
  'layer_026', 'layer_030', 'layer_038', 'layer_039', 'layer_045',
  'layer_049', 'layer_057', 'layer_071', 'layer_073', 'layer_075',
  'layer_076', 'layer_078', 'layer_083', 'layer_094', 'layer_095',
  'layer_097', 'layer_098', 'layer_100', 'layer_105', 'layer_107',
]

const colorMap = {}
LAYER_ORDER.forEach((key, i) => { colorMap[key] = raw.colors[i] ?? '#888' })

const layer105Tops = raw.layers.map(p => p['layer_105'] ?? 0).filter(v => v > 0)
const sectionBase = Math.min(...layer105Tops) - 20

const series = raw.layers.map(point => {
  const distance = (point['index'] ?? 0) * raw.partLength
  const present = LAYER_ORDER
    .map(key => ({ key, value: point[key] ?? 0 }))
    .filter(e => e.value > 0)

  const layers = []
  for (let i = 0; i < present.length; i++) {
    const top    = present[i].value
    const bottom = i + 1 < present.length ? present[i + 1].value : sectionBase
    if (top <= bottom) continue
    layers.push({ id: present[i].key, top, bottom })
  }
  return { distance, layers }
})

const layerInfo = LAYER_ORDER.map(key => {
  const hatchCode = key.replace('layer_', '').padStart(3, '0')
  return {
    id:        key,
    name:      raw.definition[key] ?? key,
    color:     colorMap[key] ?? '#aaa',
    hatchCode,
  }
})

const result = { series, layerInfo }
const outPath = resolve(__dirname, '../src/data-1-converted.json')
writeFileSync(outPath, JSON.stringify(result, null, 2))
console.log(`Written ${series.length} series points → ${outPath}`)
