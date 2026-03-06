export type PatternName =
  | 'clay'
  | 'topsoil'
  | 'sand'
  | 'gravel'
  | 'limestone'
  | 'granite'
  | 'chalk'
  | 'coal'
  | string

// ── Input data format ────────────────────────────────────────────────────────

/** Layer boundary at a single series point */
export interface BoundsLayer {
  /** Layer identifier — must be consistent across all series points */
  id: string
  /** Elevation of the top boundary (units match your measurementUnit setting) */
  top: number
  /** Elevation of the bottom boundary */
  bottom: number
}

/** One point along the transect with ordered layer boundaries */
export interface BoundsPoint {
  /** Horizontal distance along the transect */
  distance: number
  layers: BoundsLayer[]
}

/** Optional visual and metadata info for a layer (keyed by id) */
export interface LayerInfo {
  id: string
  /** Display name shown in tooltips (default: "Layer ${id}") */
  name?: string
  /** Fill colour (default: '#ffffff') */
  color?: string
  /** URL to a PNG hatch pattern image */
  hatch?: string
}

export interface CrossSectionData {
  series: BoundsPoint[]
  /** Optional per-layer visual info. Missing fields fall back to defaults. */
  layerInfo?: LayerInfo[]
  /** Optional vertical reference lines shown across the full section height */
  refLines?: RefLine[]
}

/** A vertical reference line positioned at a known distance with geographic coordinates */
export interface RefLine {
  /** Horizontal distance along the transect (same units as series distances) */
  distance: number
  /** Geographic latitude in decimal degrees */
  lat: number
  /** Geographic longitude in decimal degrees */
  lon: number
  /** Optional custom label. Defaults to formatted lat/lon coordinates. */
  label?: string
}

export interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface AxesStyle {
  /** Axis line + tick colour (default: 'rgba(180,180,180,0.7)') */
  axisColor?: string
  /** Grid line colour (default: 'rgba(120,120,120,0.18)') */
  gridColor?: string
  /** Tick label colour (default: 'rgba(200,200,200,0.9)') */
  labelColor?: string
  /** Font for tick labels (default: '11px system-ui,sans-serif') */
  font?: string
  /** Tick mark length in px (default: 5) */
  tickLength?: number
  /** Approximate number of ticks on the X axis (default: 8) */
  xTickCount?: number
  /** Approximate number of ticks on the Y axis (default: 6) */
  yTickCount?: number
}

export interface MarkerStyle {
  /** Click point dot colour (default: 'rgba(255,220,40,0.9)') */
  pointColor?: string
  /** Dot radius in px (default: 5) */
  dotRadius?: number
  /** Ring colour drawn around the dot (default: '#fff') */
  dotRingColor?: string
  /** Colour applied to tooltip coordinates text on hover (default: same as pointColor) */
  hoverColor?: string
  /** Dashed depth line colour (default: 'rgba(255,220,40,0.5)') */
  lineColor?: string
  /** Depth line stroke width in px (default: 1.5) */
  lineWidth?: number
  /** Depth line dash pattern [dash, gap] in px (default: [5, 4]) */
  lineDash?: [number, number]
  /** Cross-tick half-width at layer boundary intersections in px (default: 6) */
  tickSize?: number
  /** h1 / h2 depth label colour (default: same as pointColor) */
  depthLabelColor?: string
  /** Background fill of the h1/h2 label badge (default: 'rgba(10,10,10,0.72)') */
  depthLabelBg?: string
  /** Horizontal and vertical padding (px) inside the h1/h2 badge (default: 5) */
  depthLabelPadding?: number
  /** Font for depth labels and coordinate label (default: '11px system-ui,sans-serif') */
  font?: string
}

export interface TooltipStyle {
  /** Tooltip background colour (default: 'rgba(10,10,10,0.82)') */
  background?: string
  /** Tooltip text colour (default: '#fff') */
  color?: string
  /** CSS padding string (default: '5px 11px') */
  padding?: string
  /** CSS border-radius string (default: '5px') */
  borderRadius?: string
  /** Tooltip font (default: '13px/1.5 system-ui,sans-serif') */
  font?: string
  /** CSS box-shadow (default: '0 2px 10px rgba(0,0,0,0.35)') */
  shadow?: string
  /** CSS z-index (default: 9999) */
  zIndex?: number
  /** CSS white-space (default: 'nowrap') */
  whiteSpace?: string
}

export interface RefLineStyle {
  /** Line colour (default: 'rgba(100,180,255,0.85)') */
  color?: string
  /** Line width in px (default: 1.5) */
  width?: number
  /** Dash pattern [dash, gap] (default: [6, 4]) */
  dash?: [number, number]
  /** Label text colour (default: same as color) */
  labelColor?: string
  /** Label badge background (default: 'rgba(10,10,10,0.72)') */
  labelBg?: string
  /** Font for the label badge (default: '11px system-ui,sans-serif') */
  font?: string
  /** Padding inside the label badge in px (default: 4) */
  labelPadding?: number
}

export interface LayerStyle {
  /** Layer border stroke colour (default: 'rgba(40,40,40,0.4)') */
  borderColor?: string
  /** Layer border width in canvas pixels before zoom scaling (default: 1) */
  borderWidth?: number
}

export interface CrossSectionOptions {
  padding?: Partial<Padding>
  /** Element to attach the tooltip div to (default: document.body) */
  tooltipContainer?: HTMLElement
  /** Unit label appended to all distance/elevation values (default: 'm') */
  measurementUnit?: string
  axes?: AxesStyle
  marker?: MarkerStyle
  tooltip?: TooltipStyle
  layer?: LayerStyle
  refLine?: RefLineStyle
  /**
   * Desired on-screen size (px) for PNG hatch pattern tiles (default: 48).
   * Increase for coarser patterns, decrease for finer ones.
   */
  hatchPatternSize?: number
}

export interface Transform {
  k: number  // zoom scale
  x: number  // pan x offset (canvas pixels)
  y: number  // pan y offset (canvas pixels)
}

/** A click-placed measurement point on the cross-section */
export interface Marker {
  /** Data-space distance (m) of the click */
  x: number
  /** Data-space elevation (m) of the click */
  y: number
  /** Elevation of the nearest layer boundary above the click point */
  layerTop: number
  /** Elevation of the nearest layer boundary below the click point */
  layerBottom: number
  layerId: string
  /** Geographic latitude interpolated from refLines — present only when refLines are defined */
  lat?: number
  /** Geographic longitude interpolated from refLines — present only when refLines are defined */
  lon?: number
}

/** Internal: a closed polygon in data-space representing one continuous layer segment */
export interface LayerPolygon {
  layerId: string
  label: string
  pattern: PatternName
  color: string
  /** Alternating top-edge (L→R) then bottom-edge (R→L) points in [distance, elevation] */
  points: [number, number][]
}
