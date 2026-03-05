import type { AxesStyle, MarkerStyle, TooltipStyle, LayerStyle, Padding } from './types'

export const DEFAULT_PADDING: Padding = {
  top: 16, right: 16, bottom: 36, left: 60,
}

export const DEFAULT_HATCH_PATTERN_SIZE = 256

export const DEFAULT_MEASUREMENT_UNIT = 'm'

export const DEFAULT_AXES: Required<AxesStyle> = {
  axisColor:  'rgba(180,180,180,0.7)',
  gridColor:  'rgba(120,120,120,0.18)',
  labelColor: 'rgba(200,200,200,0.9)',
  font:       '11px system-ui,sans-serif',
  tickLength: 5,
  xTickCount: 8,
  yTickCount: 6,
}

export const DEFAULT_MARKER: Required<MarkerStyle> = {
  pointColor:        'rgba(255,220,40,0.9)',
  dotRadius:         5,
  dotRingColor:      '#fff',
  hoverColor:        'rgba(255,220,40,0.9)',
  lineColor:         'rgba(255,220,40,0.5)',
  lineWidth:         1.5,
  lineDash:          [5, 4],
  tickSize:          6,
  depthLabelColor:   'rgba(255,220,40,0.9)',
  depthLabelBg:      'rgba(10,10,10,0.72)',
  depthLabelPadding: 5,
  font:              '11px system-ui,sans-serif',
}

export const DEFAULT_TOOLTIP: Required<TooltipStyle> = {
  background:   'rgba(10,10,10,0.82)',
  color:        '#fff',
  padding:      '5px 11px',
  borderRadius: '5px',
  font:         '13px/1.5 system-ui,sans-serif',
  shadow:       '0 2px 10px rgba(0,0,0,0.35)',
  zIndex:       9999,
  whiteSpace:   'nowrap',
}

export const DEFAULT_LAYER: Required<LayerStyle> = {
  borderColor: 'rgba(40,40,40,0.4)',
  borderWidth: 1,
}
