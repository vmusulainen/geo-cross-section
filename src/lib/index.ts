import type { CrossSectionData, CrossSectionOptions, Padding, LayerPolygon, Transform, AxesStyle, Marker, MarkerStyle, TooltipStyle, LayerStyle } from './types'
import { buildPolygons, interpolateLayerAt } from './geometry'
import { computeViewport, drawPolygons, drawAxes, drawMarker, drawHoverDot } from './renderer'
import type { Viewport } from './renderer'
import { setupInteraction } from './interaction'
import { preloadHatchImages } from './patterns'
import {
  DEFAULT_PADDING, DEFAULT_HATCH_PATTERN_SIZE, DEFAULT_MEASUREMENT_UNIT,
  DEFAULT_AXES, DEFAULT_MARKER, DEFAULT_TOOLTIP, DEFAULT_LAYER,
} from './defaults'

export type { CrossSectionData, BoundsPoint, BoundsLayer, LayerInfo, CrossSectionOptions, PatternName, AxesStyle, Marker, MarkerStyle, TooltipStyle, LayerStyle } from './types'

export class CrossSection {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly tooltip: HTMLElement
  private readonly padding: Padding
  private readonly axesStyle: Required<AxesStyle>
  private readonly hatchPatternSize: number
  private readonly markerStyle: Required<MarkerStyle>
  private readonly layerStyle: Required<LayerStyle>
  private readonly unit: string
  private readonly teardown: () => void
  private readonly resizeObserver: ResizeObserver

  private data: CrossSectionData
  private polygons: LayerPolygon[] = []
  private viewport: Viewport
  private transform: Transform = { k: 1, x: 0, y: 0 }
  private marker: Marker | null = null
  private hoverPoint: { x: number; y: number } | null = null

  constructor(
    container: HTMLElement,
    data: CrossSectionData,
    options: CrossSectionOptions = {},
  ) {
    // Create and mount canvas filling the container
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:default'
    canvas.width  = container.clientWidth  || 800
    canvas.height = container.clientHeight || 400
    container.appendChild(canvas)
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D canvas context')
    this.ctx = ctx
    this.padding = { ...DEFAULT_PADDING, ...options.padding }
    this.axesStyle = { ...DEFAULT_AXES, ...options.axes }
    this.hatchPatternSize = options.hatchPatternSize ?? DEFAULT_HATCH_PATTERN_SIZE
    this.markerStyle = { ...DEFAULT_MARKER, ...options.marker }
    this.layerStyle = { ...DEFAULT_LAYER, ...options.layer }
    this.unit = options.measurementUnit ?? DEFAULT_MEASUREMENT_UNIT

    this.data = data
    this.tooltip = this._makeTooltip(
      options.tooltipContainer ?? document.body,
      { ...DEFAULT_TOOLTIP, ...options.tooltip },
    )
    this.polygons = buildPolygons(data)
    this.viewport = computeViewport(canvas.width, canvas.height, this.polygons, this.padding)

    this.teardown = setupInteraction(
      canvas,
      () => this.polygons,
      () => this.viewport,
      () => this.transform,
      (t) => { this.transform = t; this.render() },
      this.tooltip,
      (x, y, hit) => {
        if (!hit) {
          this.marker = null
        } else {
          const bounds = interpolateLayerAt(this.data, x, hit.layerId)
          this.marker = bounds ? { x, y, ...bounds, layerId: hit.layerId } : null
        }
        this.render()
      },
      (x, y, hit) => { this.hoverPoint = hit ? { x, y } : null; this.render() },
      this.markerStyle,
      this.unit,
    )

    const hatchUrls = data.layerInfo?.flatMap(l => l.hatch ? [l.hatch] : []) ?? []
    preloadHatchImages(hatchUrls, () => this.render())

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        canvas.width  = Math.round(width)
        canvas.height = Math.round(height)
        this.viewport = computeViewport(canvas.width, canvas.height, this.polygons, this.padding)
        this.render()
      }
    })
    this.resizeObserver.observe(container)

    this.render()
  }

  /** Redraw the current data with the current viewport/transform */
  render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    drawPolygons(this.ctx, this.polygons, this.viewport, this.transform, this.hatchPatternSize, this.layerStyle)
    drawAxes(this.ctx, this.viewport, this.transform, this.axesStyle)
    if (this.hoverPoint) drawHoverDot(this.ctx, this.hoverPoint.x, this.hoverPoint.y, this.viewport, this.transform, this.markerStyle)
    if (this.marker) drawMarker(this.ctx, this.marker, this.viewport, this.transform, this.markerStyle, this.unit)
  }

  /** Replace data and reset zoom/pan */
  update(data: CrossSectionData): void {
    this.data = data
    this.polygons = buildPolygons(data)
    this.viewport = computeViewport(this.canvas.width, this.canvas.height, this.polygons, this.padding)
    this.transform = { k: 1, x: 0, y: 0 }
    this.render()
  }

  /** Remove event listeners, resize observer, and canvas element */
  destroy(): void {
    this.resizeObserver.disconnect()
    this.teardown()
    this.tooltip.remove()
    this.canvas.remove()
  }

  private _makeTooltip(container: HTMLElement, style: Required<TooltipStyle>): HTMLElement {
    const el = document.createElement('div')
    el.style.cssText = [
      'position:fixed',
      'display:none',
      `background:${style.background}`,
      `color:${style.color}`,
      `padding:${style.padding}`,
      `border-radius:${style.borderRadius}`,
      `font:${style.font}`,
      'pointer-events:none',
      `z-index:${style.zIndex}`,
      `white-space:${style.whiteSpace}`,
      `box-shadow:${style.shadow}`,
    ].join(';')
    container.appendChild(el)
    return el
  }
}
