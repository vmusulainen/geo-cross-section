const TILE = 14  // pattern tile size in pixels

type DrawFn = (ctx: CanvasRenderingContext2D) => void

const drawers: Record<string, DrawFn> = {
  topsoil: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 0.9
    for (let y = 4; y <= TILE; y += 5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath(); ctx.arc(3, 2, 1.1, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(10, 2, 1.1, 0, Math.PI * 2); ctx.fill()
  },

  clay: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 0.9
    for (let y = 3; y <= TILE; y += 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke()
    }
  },

  sand: (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    const pts: [number, number][] = [[2, 2], [9, 2], [5, 6], [2, 11], [9, 11], [6, 14]]
    for (const [x, y] of pts) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
    }
  },

  gravel: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 0.9
    ctx.beginPath(); ctx.arc(3.5, 3.5, 2.5, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(10.5, 3.5, 2.5, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(7,   10,   2.5, 0, Math.PI * 2); ctx.stroke()
  },

  limestone: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    ctx.lineWidth = 0.8
    // horizontal rows
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(TILE, 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(TILE, 10); ctx.stroke()
    // vertical joints — offset per row (brick pattern)
    ctx.beginPath(); ctx.moveTo(7, 0);  ctx.lineTo(7, 5);  ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 5);  ctx.lineTo(0, 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(TILE, 5); ctx.lineTo(TILE, 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(3, TILE); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(10, TILE); ctx.stroke()
  },

  granite: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 0.8
    for (let i = -TILE; i <= 2 * TILE; i += 8) {
      ctx.beginPath(); ctx.moveTo(i, 0);    ctx.lineTo(i + TILE, TILE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(i + TILE, 0); ctx.lineTo(i, TILE);    ctx.stroke()
    }
  },

  chalk: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 0.7
    for (let y = 4; y <= TILE; y += 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke()
      for (let x = 2; x < TILE; x += 4) {
        ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y + 2); ctx.stroke()
      }
    }
  },

  coal: (ctx) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 0.7
    for (let y = 0; y <= TILE; y += 3) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TILE, y); ctx.stroke()
    }
    for (let x = 0; x <= TILE; x += 3) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TILE); ctx.stroke()
    }
  },
}

// Cache loaded hatch images (code → HTMLImageElement)
const imageCache = new Map<string, HTMLImageElement>()

/**
 * Pre-load all PNG hatch tiles. Call once at startup; re-renders via onReady
 * callback when all images are ready.
 * @param urls  Array of image URLs to pre-load (keyed by URL in the cache)
 */
export function preloadHatchImages(
  urls: string[],
  onReady: () => void,
): void {
  if (urls.length === 0) { onReady(); return }
  let pending = urls.length
  const done = () => { if (--pending === 0) onReady() }
  for (const url of urls) {
    const img = new Image()
    img.onload  = () => { imageCache.set(url, img); done() }
    img.onerror = done
    img.src = url
  }
}

/** Returns the natural width of a loaded hatch image (for scale calculation). */
export function getHatchImageSize(url: string): number {
  return imageCache.get(url)?.naturalWidth ?? 14
}
const tileCache = new Map<string, HTMLCanvasElement>()

function getTileCanvas(name: string): HTMLCanvasElement | null {
  if (tileCache.has(name)) return tileCache.get(name)!
  const draw = drawers[name]
  if (!draw) return null
  const c = document.createElement('canvas')
  c.width = TILE
  c.height = TILE
  draw(c.getContext('2d')!)
  tileCache.set(name, c)
  return c
}

/**
 * Returns a CanvasPattern for the given pattern name, or null if unknown.
 * Supports 'hatch:NNN' (PNG-based) and named canvas-drawn patterns.
 */
export function getPattern(ctx: CanvasRenderingContext2D, name: string): CanvasPattern | null {
  if (name.startsWith('hatch:')) {
    const img = imageCache.get(name.slice(6))
    if (!img) return null
    return ctx.createPattern(img, 'repeat')
  }
  const tile = getTileCanvas(name)
  if (!tile) return null
  return ctx.createPattern(tile, 'repeat')
}
