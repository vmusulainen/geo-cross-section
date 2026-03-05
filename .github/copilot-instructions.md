# Copilot Instructions

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc type-check + vite library build → dist/
npm run preview   # serve the built dist output
```

`build` runs `tsc` (type-check only, `noEmit: true`) then `vite build`. There are no tests or linters configured.

## Architecture

This is a **zero-dependency vanilla TypeScript library** for rendering 2D geological cross-sections on a `<canvas>` element.

**Data flow:**
```
CrossSectionData  →  buildPolygons()  →  LayerPolygon[]
                                              ↓
                                    computeViewport()  →  Viewport
                                              ↓
                                    drawPolygons()  (Canvas 2D)
```

**Module responsibilities:**
- `src/types.ts` — all shared interfaces; single source of truth for data shapes
- `src/geometry.ts` — converts raw series data into `LayerPolygon[]`; groups layers by `id` across series points, finds contiguous runs, and builds trapezoid polygons (top-edge L→R + bottom-edge R→L)
- `src/patterns.ts` — draws 14×14 px hatch tiles onto off-screen canvases (cached in `tileCache`), returns `CanvasPattern` via `getPattern(ctx, name)`
- `src/renderer.ts` — `Viewport` computation (data ↔ screen mapping) and the Canvas 2D draw loop; applies zoom/pan `Transform` via `ctx.save/translate/scale/restore`
- `src/interaction.ts` — wheel zoom (zoom-to-cursor), drag pan, hover tooltip with `pointInPolygon` hit-test in **data space** (not canvas space)
- `src/index.ts` — `CrossSection` public class; owns `polygons`, `viewport`, `transform` state; wires geometry → renderer → interaction; re-exports public types
- `src/main.ts` — demo only (not part of the library build)

**Build output** (`vite.config.ts` library mode):
- `dist/geo-cross-section.es.js` — ESM
- `dist/geo-cross-section.umd.js` — UMD (global name `GeoCrossSection`)

## Key Conventions

**Coordinate systems — two distinct spaces:**
- *Data space*: `distance` (metres along transect, X) and elevation (metres, Y — positive = above datum)
- *Canvas space*: pixels, Y-axis flipped (`higher elevation → smaller canvas-Y`)
- Always use `toScreen(x, y, vp)` / `toData(sx, sy, vp)` from `renderer.ts` to convert between them
- The hit-test in `interaction.ts` converts mouse position to data space before calling `pointInPolygon`

**Transform (`{ k, x, y }`) is a pure value object** — never mutated in place. `interaction.ts` calls `onTransform(newTransform)` and the `CrossSection` class stores it then calls `render()`.

**Pattern tile caching** — `patterns.ts` keeps a module-level `tileCache: Map<string, HTMLCanvasElement>`. Tile canvases are drawn once and reused. `getPattern()` creates a fresh `CanvasPattern` each call (patterns are context-bound and cheap).

**Layer polygon winding** — `buildRunPolygon` builds polygons as top-edge points left→right followed by bottom-edge points right→left. This winding must be preserved for `pointInPolygon` (ray-casting) to work correctly.

**Layer identity across series points** — a layer's `id` field links it across `SeriesPoint` entries. The first `meta` entry for an `id` wins for `label`, `pattern`, and `color`. A layer may be absent at one or more series points and reappear later; `buildPolygons` splits it into multiple independent polygons (one per contiguous run). At each run boundary, a **pinch point** is inserted at the adjacent series point's distance. The pinch elevation is derived from the neighboring layers: the `bottom` of the layer immediately above (or `top` of the layer immediately below) at the adjacent point — so the absent layer tapers to exactly the seam where its neighbors close together.

**`noUnusedLocals` / `noUnusedParameters` are enforced** — TypeScript will error on unused variables. The `_makeTooltip` private method uses the underscore prefix only by convention; it does not suppress warnings.

**Adding a new geology pattern** — add a draw function to the `drawers` record in `patterns.ts` and add the name as a literal to the `PatternName` union in `types.ts`.
