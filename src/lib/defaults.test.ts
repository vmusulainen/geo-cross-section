import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PADDING,
  DEFAULT_AXES,
  DEFAULT_MARKER,
  DEFAULT_TOOLTIP,
  DEFAULT_LAYER,
  DEFAULT_HATCH_PATTERN_SIZE,
  DEFAULT_MEASUREMENT_UNIT,
} from './defaults'

describe('DEFAULT_PADDING', () => {
  it('has all four sides defined as positive numbers', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      expect(typeof DEFAULT_PADDING[side]).toBe('number')
      expect(DEFAULT_PADDING[side]).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_HATCH_PATTERN_SIZE', () => {
  it('is a positive number', () => {
    expect(DEFAULT_HATCH_PATTERN_SIZE).toBeGreaterThan(0)
  })
})

describe('DEFAULT_MEASUREMENT_UNIT', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_MEASUREMENT_UNIT).toBe('string')
    expect(DEFAULT_MEASUREMENT_UNIT.length).toBeGreaterThan(0)
  })
})

describe('DEFAULT_AXES', () => {
  it('has no undefined fields', () => {
    const keys: (keyof typeof DEFAULT_AXES)[] = [
      'axisColor', 'gridColor', 'labelColor', 'font', 'tickLength', 'xTickCount', 'yTickCount',
    ]
    for (const key of keys) expect(DEFAULT_AXES[key]).toBeDefined()
  })

  it('tick counts are positive integers', () => {
    expect(DEFAULT_AXES.xTickCount).toBeGreaterThan(0)
    expect(DEFAULT_AXES.yTickCount).toBeGreaterThan(0)
    expect(Number.isInteger(DEFAULT_AXES.xTickCount)).toBe(true)
    expect(Number.isInteger(DEFAULT_AXES.yTickCount)).toBe(true)
  })
})

describe('DEFAULT_MARKER', () => {
  it('has no undefined fields', () => {
    const keys: (keyof typeof DEFAULT_MARKER)[] = [
      'pointColor', 'dotRadius', 'dotRingColor', 'hoverColor',
      'lineColor', 'lineWidth', 'lineDash', 'tickSize',
      'depthLabelColor', 'depthLabelBg', 'depthLabelPadding', 'font',
    ]
    for (const key of keys) expect(DEFAULT_MARKER[key]).toBeDefined()
  })

  it('lineDash is a two-element array of positive numbers', () => {
    expect(DEFAULT_MARKER.lineDash).toHaveLength(2)
    expect(DEFAULT_MARKER.lineDash[0]).toBeGreaterThan(0)
    expect(DEFAULT_MARKER.lineDash[1]).toBeGreaterThan(0)
  })

  it('dotRadius and tickSize are positive', () => {
    expect(DEFAULT_MARKER.dotRadius).toBeGreaterThan(0)
    expect(DEFAULT_MARKER.tickSize).toBeGreaterThan(0)
  })
})

describe('DEFAULT_TOOLTIP', () => {
  it('has no undefined fields', () => {
    const keys: (keyof typeof DEFAULT_TOOLTIP)[] = [
      'background', 'color', 'padding', 'borderRadius', 'font', 'shadow', 'zIndex', 'whiteSpace',
    ]
    for (const key of keys) expect(DEFAULT_TOOLTIP[key]).toBeDefined()
  })

  it('zIndex is a positive integer', () => {
    expect(DEFAULT_TOOLTIP.zIndex).toBeGreaterThan(0)
    expect(Number.isInteger(DEFAULT_TOOLTIP.zIndex)).toBe(true)
  })
})

describe('DEFAULT_LAYER', () => {
  it('has no undefined fields', () => {
    const keys: (keyof typeof DEFAULT_LAYER)[] = ['borderColor', 'borderWidth']
    for (const key of keys) expect(DEFAULT_LAYER[key]).toBeDefined()
  })

  it('borderWidth is a positive number', () => {
    expect(DEFAULT_LAYER.borderWidth).toBeGreaterThan(0)
  })
})
