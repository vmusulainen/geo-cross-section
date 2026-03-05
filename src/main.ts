import { CrossSection } from './lib/index'
import type { CrossSectionOptions } from './lib/index'
import type { CrossSectionData } from './lib/types'
import data1Base from './data-1-converted.json'
import { hatchUrls } from './hatch-loader'

const container = document.getElementById('canvas-container') as HTMLElement

// Inject hatch image URLs into layerInfo (hatchCode is a demo-only helper field)
const data: CrossSectionData = {
  series: data1Base.series,
  layerInfo: data1Base.layerInfo.map(l => ({
    id:    l.id,
    name:  l.name,
    color: l.color,
    hatch: hatchUrls[l.hatchCode],
  })),
}

const options: CrossSectionOptions = {
  // ── Canvas padding (px) ─────────────────────────────────────────────────
  padding: {
    top:    16,
    right:  16,
    bottom: 36,
    left:   60,
  },

  // ── PNG hatch tile size on screen (px) ──────────────────────────────────
  hatchPatternSize: 256,

  // ── Measurement unit appended to all distance/elevation labels ───────────
  measurementUnit: 'м',

  // ── Layer polygon borders ────────────────────────────────────────────────
  layer: {
    borderColor: 'rgba(40,40,40,0.4)',
    borderWidth: 1,
  },

  // ── Axes, grid and tick labels ───────────────────────────────────────────
  axes: {
    axisColor:  'rgba(180,180,180,0.7)',
    gridColor:  'rgba(120,120,120,0.18)',
    labelColor: 'rgba(50,50,50)',
    font:       '11px system-ui,sans-serif',
    tickLength: 5,
    xTickCount: 8,
    yTickCount: 6,
  },

  // ── Hover tooltip ────────────────────────────────────────────────────────
  tooltip: {
    background:   'rgba(10,10,10,0.82)',
    color:        '#fff',
    padding:      '5px 11px',
    borderRadius: '5px',
    font:         '13px/1.5 system-ui,sans-serif',
    shadow:       '0 2px 10px rgba(0,0,0,0.35)',
    zIndex:       9999,
    whiteSpace:   'nowrap',
  },

  // ── Click measurement marker ─────────────────────────────────────────────
  marker: {
    // dot
    pointColor:  'rgba(255,220,40,0.9)',
    dotRadius:   5,
    dotRingColor: '#fff',
    // tooltip coordinate text colour on hover
    hoverColor:  'rgba(255,220,40,0.9)',
    // depth lines
    lineColor:   'rgba(255,255,255,1)',
    lineWidth:   1.5,
    lineDash:    [5, 4],
    tickSize:    6,
    // h1 / h2 depth label badges
    depthLabelColor:   'rgba(255,220,40,0.9)',
    depthLabelBg:      'rgba(10,10,10,0.72)',
    depthLabelPadding: 5,
    font:              '11px system-ui,sans-serif',
  },
}

new CrossSection(container, data, options)

