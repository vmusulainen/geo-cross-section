import type { LayerPolygon, Transform, Marker, MarkerStyle, LayerStyle, AxesStyle, RefLine, RefLineStyle } from './types'
import { getPattern, getHatchImageSize } from './patterns'

export type { Transform }

export interface Viewport {
  minX: number
  maxX: number
  minY: number
  maxY: number
  scaleX: number   // canvas pixels per metre (horizontal)
  scaleY: number   // canvas pixels per metre (vertical)
  offsetX: number  // draw area left edge in canvas pixels (= left padding)
  offsetY: number  // draw area top edge in canvas pixels (= top padding)
  drawRight: number   // draw area right edge in canvas pixels
  drawBottom: number  // draw area bottom edge in canvas pixels
}

export function computeViewport(
  canvasWidth: number,
  canvasHeight: number,
  polygons: LayerPolygon[],
  padding: { top: number; right: number; bottom: number; left: number },
): Viewport {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const poly of polygons) {
    for (const [x, y] of poly.points) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  const drawW = canvasWidth  - padding.left - padding.right
  const drawH = canvasHeight - padding.top  - padding.bottom

  if (!isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, scaleX: 1, scaleY: 1,
      offsetX: padding.left, offsetY: padding.top,
      drawRight: padding.left + drawW, drawBottom: padding.top + drawH }
  }

  const scaleX = drawW / (maxX - minX || 1)
  const scaleY = drawH / (maxY - minY || 1)

  return {
    minX, maxX, minY, maxY, scaleX, scaleY,
    offsetX: padding.left, offsetY: padding.top,
    drawRight: padding.left + drawW, drawBottom: padding.top + drawH,
  }
}

/** Data → canvas pixel (before zoom transform) */
export function toScreen(x: number, y: number, vp: Viewport): [number, number] {
  return [
    (x - vp.minX) * vp.scaleX + vp.offsetX,
    // Y-axis flipped: higher elevation → smaller canvas-Y (closer to top)
    (vp.maxY - y) * vp.scaleY + vp.offsetY,
  ]
}

/** Canvas pixel (before zoom transform) → data */
export function toData(sx: number, sy: number, vp: Viewport): [number, number] {
  return [
    (sx - vp.offsetX) / vp.scaleX + vp.minX,
    vp.maxY - (sy - vp.offsetY) / vp.scaleY,
  ]
}

export function drawPolygons(
  ctx: CanvasRenderingContext2D,
  polygons: LayerPolygon[],
  vp: Viewport,
  transform: Transform,
  hatchPatternSize: number,
  layerStyle: Required<LayerStyle>,
): void {
  const { borderColor, borderWidth } = layerStyle
  ctx.save()
  // Clip to draw area so polygons don't overflow into axis padding
  ctx.beginPath()
  ctx.rect(vp.offsetX, vp.offsetY, vp.drawRight - vp.offsetX, vp.drawBottom - vp.offsetY)
  ctx.clip()

  ctx.translate(transform.x, transform.y)
  ctx.scale(transform.k, transform.k)

  for (const poly of polygons) {
    if (poly.points.length < 3) continue

    const path = new Path2D()
    const [x0, y0] = toScreen(poly.points[0][0], poly.points[0][1], vp)
    path.moveTo(x0, y0)
    for (let i = 1; i < poly.points.length; i++) {
      const [px, py] = toScreen(poly.points[i][0], poly.points[i][1], vp)
      path.lineTo(px, py)
    }
    path.closePath()

    // Base colour fill
    ctx.fillStyle = poly.color
    ctx.fill(path)

    // Geology hatch pattern overlay — counter-scale so tile stays crisp at any zoom
    const pat = getPattern(ctx, poly.pattern)
    if (pat) {
      if (poly.pattern.startsWith('hatch:')) {
        // Scale PNG tile to desired on-screen size regardless of zoom
        const imgSize = getHatchImageSize(poly.pattern.slice(6))
        pat.setTransform(new DOMMatrix().scale(hatchPatternSize / (imgSize * transform.k)))
      } else {
        pat.setTransform(new DOMMatrix().scale(1 / transform.k))
      }
      ctx.fillStyle = pat
      ctx.fill(path)
    }

    // Layer border
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth / transform.k
    ctx.stroke(path)
  }

  ctx.restore()
}

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)))
  const n = rough / mag
  const nice = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10
  return nice * mag
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  transform: Transform,
  style: Required<AxesStyle>,
): void {
  const { axisColor, gridColor, labelColor, font, tickLength: TICK, xTickCount, yTickCount } = style
  const { offsetX: left, offsetY: top, drawRight: right, drawBottom: bottom } = vp

  // Convert data value to actual canvas position (accounting for zoom/pan)
  const dataToCanvasX = (x: number) => toScreen(x, 0, vp)[0] * transform.k + transform.x
  const dataToCanvasY = (y: number) => toScreen(0, y, vp)[1] * transform.k + transform.y

  // Compute visible data range from current zoom/pan
  const visMinX = vp.minX + ((left  - transform.x) / transform.k - vp.offsetX) / vp.scaleX
  const visMaxX = vp.minX + ((right - transform.x) / transform.k - vp.offsetX) / vp.scaleX
  const visMaxY = vp.maxY - ((top - transform.y) / transform.k - vp.offsetY) / vp.scaleY
  const visMinY = vp.maxY - ((bottom - transform.y) / transform.k - vp.offsetY) / vp.scaleY

  ctx.save()
  ctx.font = font
  ctx.lineWidth = 1

  // --- grid lines ---
  ctx.strokeStyle = gridColor
  const xStep = niceStep(visMaxX - visMinX, xTickCount)
  const yStep = niceStep(visMaxY - visMinY, yTickCount)

  for (let x = Math.ceil(visMinX / xStep) * xStep; x <= visMaxX; x += xStep) {
    const cx = dataToCanvasX(x)
    if (cx < left || cx > right) continue
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bottom); ctx.stroke()
  }
  for (let y = Math.ceil(visMinY / yStep) * yStep; y <= visMaxY; y += yStep) {
    const cy = dataToCanvasY(y)
    if (cy < top || cy > bottom) continue
    ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(right, cy); ctx.stroke()
  }

  // --- axis lines ---
  ctx.strokeStyle = axisColor
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke()

  // --- X ticks + labels ---
  ctx.fillStyle = labelColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let x = Math.ceil(visMinX / xStep) * xStep; x <= visMaxX; x += xStep) {
    const cx = dataToCanvasX(x)
    if (cx < left || cx > right) continue
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx, bottom); ctx.lineTo(cx, bottom + TICK); ctx.stroke()
    ctx.fillText(String(Math.round(x)), cx, bottom + TICK + 2)
  }

  // --- Y ticks + labels ---
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let y = Math.ceil(visMinY / yStep) * yStep; y <= visMaxY; y += yStep) {
    const cy = dataToCanvasY(y)
    if (cy < top || cy > bottom) continue
    ctx.strokeStyle = axisColor
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left - TICK, cy); ctx.stroke()
    ctx.fillText(String(Math.round(y)), left - TICK - 3, cy)
  }

  ctx.restore()
}

/**
 * Draw vertical reference lines spanning the full section height.
 * Each line shows a label with lat/lon (or a custom label) at the top.
 */
export function drawRefLines(
  ctx: CanvasRenderingContext2D,
  refLines: RefLine[],
  vp: Viewport,
  transform: Transform,
  style: Required<RefLineStyle>,
): void {
  if (refLines.length === 0) return

  const { color, width, dash, labelColor, labelBg, font, labelPadding: pad } = style

  ctx.save()
  // Clip to draw area
  ctx.beginPath()
  ctx.rect(vp.offsetX, vp.offsetY, vp.drawRight - vp.offsetX, vp.drawBottom - vp.offsetY)
  ctx.clip()

  ctx.font = font
  const fontSize = parseFloat(font) || 11
  const badgeH = fontSize + pad * 2

  for (const line of refLines) {
    const cx = toScreen(line.distance, 0, vp)[0] * transform.k + transform.x
    if (cx < vp.offsetX || cx > vp.drawRight) continue

    // Vertical dashed line
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(cx, vp.offsetY)
    ctx.lineTo(cx, vp.drawBottom)
    ctx.stroke()
    ctx.setLineDash([])

    // Label badge at the top
    const text = line.label
      ?? `${line.lat.toFixed(4)}°, ${line.lon.toFixed(4)}°`
    const tw = ctx.measureText(text).width
    const bw = tw + pad * 2
    // Centre badge on the line, clamped to draw area
    const rx = Math.min(Math.max(cx - bw / 2, vp.offsetX), vp.drawRight - bw)
    const ry = vp.offsetY + 2

    ctx.fillStyle = labelBg
    ctx.fillRect(rx, ry, bw, badgeH)
    ctx.fillStyle = labelColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, rx + pad, ry + badgeH / 2)
  }

  ctx.restore()
}

/** Draw a small dot at the current hover position */
export function drawHoverDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vp: Viewport,
  transform: Transform,
  style: Required<MarkerStyle>,
): void {
  const px = toScreen(x, 0, vp)[0] * transform.k + transform.x
  const py = toScreen(0, y, vp)[1] * transform.k + transform.y
  ctx.save()
  ctx.fillStyle = style.pointColor
  ctx.strokeStyle = style.dotRingColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(px, py, style.dotRadius * 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: Marker,
  vp: Viewport,
  transform: Transform,
  style: Required<MarkerStyle>,
  unit: string,
): void {
  // Helper: data → final canvas pixel
  const scx = (x: number) => toScreen(x, 0, vp)[0] * transform.k + transform.x
  const scy = (y: number) => toScreen(0, y, vp)[1] * transform.k + transform.y

  const px = scx(marker.x)
  const py = scy(marker.y)
  const pyTop = scy(marker.layerTop)
  const pyBot = scy(marker.layerBottom)

  const h1 = marker.layerTop    - marker.y   // metres above click
  const h2 = marker.y - marker.layerBottom   // metres below click

  const {
    pointColor, dotRadius, dotRingColor,
    lineColor, lineWidth, lineDash, tickSize,
    depthLabelColor, depthLabelBg, depthLabelPadding: depthLabelPad,
    font,
  } = style

  ctx.save()
  ctx.font = font

  // Vertical dashed lines to layer boundaries
  ctx.strokeStyle = lineColor
  ctx.lineWidth = lineWidth
  ctx.setLineDash(lineDash)
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, pyTop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, pyBot); ctx.stroke()
  ctx.setLineDash([])

  // Small ticks at layer boundary intersections
  ctx.strokeStyle = lineColor
  ctx.lineWidth = lineWidth
  ctx.beginPath(); ctx.moveTo(px - tickSize, pyTop); ctx.lineTo(px + tickSize, pyTop); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(px - tickSize, pyBot); ctx.lineTo(px + tickSize, pyBot); ctx.stroke()

  // Parse font-size from font string (e.g. '11px ...') for badge height calculation
  const fontSize = parseFloat(font) || 11

  // Helper: draw a label badge — align 'left' anchors rect at bx, 'right' anchors right edge at bx
  const drawBadge = (text: string, bx: number, by: number, align: 'left' | 'right' = 'left') => {
    const tw = ctx.measureText(text).width
    const bw = tw + depthLabelPad * 2
    const bh = fontSize + depthLabelPad * 2
    const rx = align === 'right' ? bx - bw : bx
    ctx.fillStyle = depthLabelBg
    ctx.fillRect(rx, by - bh / 2, bw, bh)
    ctx.fillStyle = depthLabelColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, rx + depthLabelPad, by)
  }

  const badgeH = fontSize + depthLabelPad * 2
  const idealH1y = (py + pyTop) / 2
  const idealH2y = (py + pyBot) / 2
  // If the two ideal positions are too close, stack them: h1 above py, h2 below
  const minGap = badgeH + 2
  let h1y: number, h2y: number
  if (Math.abs(idealH2y - idealH1y) < minGap) {
    h1y = py - badgeH / 2 - 2
    h2y = py + badgeH / 2 + 2
  } else {
    h1y = idealH1y
    h2y = idealH2y
  }

  // h1 badge
  drawBadge(`h1 = ${h1.toFixed(1)} ${unit}`, px + 8, h1y)

  // h2 badge
  drawBadge(`h2 = ${h2.toFixed(1)} ${unit}`, px + 8, h2y)

  // Click point — filled circle with ring
  ctx.fillStyle = pointColor
  ctx.strokeStyle = dotRingColor
  ctx.lineWidth = lineWidth
  ctx.beginPath(); ctx.arc(px, py, dotRadius, 0, Math.PI * 2)
  ctx.fill(); ctx.stroke()

  // Coordinate label to the left of the dot
  const distLabel = `${Math.round(marker.x)} ${unit},  ${(Math.round(marker.y * 10) / 10).toFixed(1)} ${unit}`
  const geoLabel = (marker.lat != null && marker.lon != null)
    ? `${marker.lat.toFixed(5)}°, ${marker.lon.toFixed(5)}°`
    : null

  drawBadge(distLabel, px - 10, geoLabel ? py - (badgeH / 2 + 2) : py, 'right')
  if (geoLabel) {
    drawBadge(geoLabel, px - 10, py + (badgeH / 2 + 2), 'right')
  }

  ctx.restore()
}
