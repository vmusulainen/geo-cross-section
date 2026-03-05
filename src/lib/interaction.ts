import type { LayerPolygon, Transform, MarkerStyle } from './types'
import type { Viewport } from './renderer'
import { toData } from './renderer'

export function setupInteraction(
  canvas: HTMLCanvasElement,
  getPolygons: () => LayerPolygon[],
  getViewport: () => Viewport,
  getTransform: () => Transform,
  onTransform: (t: Transform) => void,
  tooltip: HTMLElement,
  onMarker: (x: number, y: number, hit: LayerPolygon | null) => void,
  onHover: (x: number, y: number, hit: LayerPolygon | null) => void,
  markerStyle: Required<MarkerStyle>,
  unit: string,
): () => void {
  type AnyHandler = (e: Event) => void
  const attached: [string, AnyHandler, AddEventListenerOptions?][] = []

  function on<K extends keyof HTMLElementEventMap>(
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) {
    canvas.addEventListener(type, fn as AnyHandler, opts)
    attached.push([type, fn as AnyHandler, opts])
  }

  // ── Zoom via mouse wheel ─────────────────────────────────────────────────
  on('wheel', (e: WheelEvent) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const t = getTransform()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const k = Math.max(1, Math.min(40, t.k * factor))
    const ratio = k / t.k
    onTransform({ k, x: mx - ratio * (mx - t.x), y: my - ratio * (my - t.y) })
  }, { passive: false })

  // ── Pan via mouse drag ───────────────────────────────────────────────────
  let dragging = false
  let didDrag = false
  let dragOrigin = { x: 0, y: 0 }
  let transformAtDrag: Transform = { k: 1, x: 0, y: 0 }

  on('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return
    dragging = true
    didDrag = false
    dragOrigin = { x: e.clientX, y: e.clientY }
    transformAtDrag = { ...getTransform() }
    canvas.style.cursor = 'grabbing'
  })

  const onDocMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (dragging) {
      const dx = e.clientX - dragOrigin.x
      const dy = e.clientY - dragOrigin.y
      if (Math.sqrt(dx * dx + dy * dy) > 4) didDrag = true
      onTransform({
        k: transformAtDrag.k,
        x: transformAtDrag.x + dx,
        y: transformAtDrag.y + dy,
      })
      return
    }

    // ── Tooltip hit-test ─────────────────────────────────────────────────
    if (mx < 0 || my < 0 || mx > canvas.width || my > canvas.height) {
      tooltip.style.display = 'none'
      return
    }
    const t = getTransform()
    const vp = getViewport()
    const [dataX, dataY] = toData((mx - t.x) / t.k, (my - t.y) / t.k, vp)
    const hit = hitTest(getPolygons(), dataX, dataY)
    onHover(dataX, dataY, hit)
    if (hit) {
      tooltip.style.display = 'block'
      // Position left or right of cursor depending on which half of the canvas the cursor is in
      const rect2 = canvas.getBoundingClientRect()
      const nearRight = e.clientX > rect2.left + rect2.width / 2
      if (nearRight) {
        tooltip.style.left  = ''
        tooltip.style.right = `${window.innerWidth - e.clientX + 14}px`
      } else {
        tooltip.style.right = ''
        tooltip.style.left  = `${e.clientX + 14}px`
      }
      tooltip.style.top = `${e.clientY - 32}px`
      const dx = Math.round(dataX)
      const dy = Math.round(dataY * 10) / 10
      const hoverColor = markerStyle.hoverColor ?? markerStyle.pointColor ?? 'rgba(255,220,40,0.9)'
      tooltip.innerHTML = `<span style="color:${hoverColor};font-size:11px">${dx} ${unit} &nbsp;${dy} ${unit}</span><br>${hit.label}`
    } else {
      tooltip.style.display = 'none'
    }
  }

  const onDocUp = (e: MouseEvent) => {
    if (!dragging) return
    dragging = false
    canvas.style.cursor = 'default'

    // If the mouse didn't move much, treat as a click → place marker
    if (!didDrag) {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const t = getTransform()
      const vp = getViewport()
      const [dataX, dataY] = toData((mx - t.x) / t.k, (my - t.y) / t.k, vp)
      const hit = hitTest(getPolygons(), dataX, dataY)
      onMarker(dataX, dataY, hit)
    }
  }

  document.addEventListener('mousemove', onDocMove)
  document.addEventListener('mouseup', onDocUp)

  on('mouseleave', () => {
    if (!dragging) {
      tooltip.style.display = 'none'
      onHover(0, 0, null)
    }
  })

  on('contextmenu', (e: MouseEvent) => {
    e.preventDefault()
    onMarker(0, 0, null)  // null hit clears the marker
  })

  return () => {
    for (const [type, fn, opts] of attached) canvas.removeEventListener(type, fn, opts)
    document.removeEventListener('mousemove', onDocMove)
    document.removeEventListener('mouseup', onDocUp)
    tooltip.style.display = 'none'
  }
}

function hitTest(polygons: LayerPolygon[], dataX: number, dataY: number): LayerPolygon | null {
  // Check in reverse draw order so topmost-drawn layer wins
  for (let i = polygons.length - 1; i >= 0; i--) {
    if (pointInPolygon(dataX, dataY, polygons[i].points)) return polygons[i]
  }
  return null
}

function pointInPolygon(px: number, py: number, pts: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
