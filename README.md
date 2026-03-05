# geo-cross-section

Zero-dependency TypeScript/Canvas 2D library for rendering interactive 2D geological cross-sections in web browsers.

## Features

- Renders filled layer polygons with optional PNG hatch patterns
- Zoom (scroll wheel, capped at original scale) and pan interactions
- Hover tooltip showing layer name and coordinates
- Click to place a measurement marker with depth-to-layer-boundary labels
- Right-click to remove the marker
- Hover dot that follows the cursor over layers
- Configurable axes, grid, colors, fonts, and all styling via options
- Automatic resize via `ResizeObserver`
- Zero runtime dependencies

## Install

```bash
npm install geo-cross-section
```

## Quick start

```ts
import { CrossSection } from 'geo-cross-section'

const cs = new CrossSection(
  document.getElementById('container'),
  {
    series: [
      {
        distance: 0,
        layers: [
          { id: 'sand',  top: 120, bottom: 110 },
          { id: 'clay',  top: 110, bottom: 95  },
        ],
      },
      {
        distance: 500,
        layers: [
          { id: 'sand',  top: 118, bottom: 105 },
          { id: 'clay',  top: 105, bottom: 90  },
        ],
      },
    ],
    layerInfo: [
      { id: 'sand', name: 'Fine sand',  color: '#f5dfa0' },
      { id: 'clay', name: 'Blue clay',  color: '#a0b4c8' },
    ],
  },
)
```

The container element must have an explicit width and height (CSS).

## Data format

### `CrossSectionData`

```ts
interface CrossSectionData {
  series: BoundsPoint[]
  layerInfo?: LayerInfo[]
}
```

#### `BoundsPoint`

| Field      | Type           | Description                                    |
|------------|----------------|------------------------------------------------|
| `distance` | `number`       | Horizontal distance along the transect         |
| `layers`   | `BoundsLayer[]`| Ordered list of layer boundaries at this point |

#### `BoundsLayer`

| Field    | Type     | Description                        |
|----------|----------|------------------------------------|
| `id`     | `string` | Layer identifier (stable across points) |
| `top`    | `number` | Elevation of the top boundary      |
| `bottom` | `number` | Elevation of the bottom boundary   |

#### `LayerInfo` (optional)

| Field   | Type     | Default              | Description              |
|---------|----------|----------------------|--------------------------|
| `id`    | `string` | —                    | Matches a `BoundsLayer.id` |
| `name`  | `string` | `"Layer ${id}"`      | Display name in tooltip  |
| `color` | `string` | `'#ffffff'`          | CSS fill color           |
| `hatch` | `string` | none                 | URL to a PNG hatch tile  |

Any field may be omitted — missing entries fall back to defaults.

Layers may be absent at some series points; the library tapers them to a knife-edge automatically.

## Constructor

```ts
new CrossSection(container: HTMLElement, data: CrossSectionData, options?: CrossSectionOptions)
```

## Options (`CrossSectionOptions`)

```ts
{
  padding?: { top, right, bottom, left }   // canvas padding in px
  measurementUnit?: string                  // appended to labels (default: 'm')
  hatchPatternSize?: number                 // on-screen PNG tile size in px (default: 48)
  tooltipContainer?: HTMLElement           // where to append the tooltip div (default: document.body)

  axes?: {
    axisColor?: string    // default: 'rgba(180,180,180,0.7)'
    gridColor?: string    // default: 'rgba(120,120,120,0.18)'
    labelColor?: string   // default: 'rgba(200,200,200,0.9)'
    font?: string         // default: '11px system-ui,sans-serif'
    tickLength?: number   // default: 5
    xTickCount?: number   // default: 8
    yTickCount?: number   // default: 6
  }

  layer?: {
    borderColor?: string  // default: 'rgba(40,40,40,0.4)'
    borderWidth?: number  // default: 1
  }

  marker?: {
    pointColor?: string         // default: 'rgba(255,220,40,0.9)'
    dotRadius?: number          // default: 5
    dotRingColor?: string       // default: '#fff'
    hoverColor?: string         // default: same as pointColor
    lineColor?: string          // default: 'rgba(255,220,40,0.5)'
    lineWidth?: number          // default: 1.5
    lineDash?: [number, number] // default: [5, 4]
    tickSize?: number           // default: 6
    depthLabelColor?: string    // default: same as pointColor
    depthLabelBg?: string       // default: 'rgba(10,10,10,0.72)'
    depthLabelPadding?: number  // default: 5
    font?: string               // default: '11px system-ui,sans-serif'
  }

  tooltip?: {
    background?: string    // default: 'rgba(10,10,10,0.82)'
    color?: string         // default: '#fff'
    padding?: string       // default: '5px 11px'
    borderRadius?: string  // default: '5px'
    font?: string          // default: '13px/1.5 system-ui,sans-serif'
    shadow?: string        // default: '0 2px 10px rgba(0,0,0,0.35)'
    zIndex?: number        // default: 9999
    whiteSpace?: string    // default: 'nowrap'
  }
}
```

## Instance methods

| Method              | Description                                      |
|---------------------|--------------------------------------------------|
| `render()`          | Redraw (called automatically after interactions) |
| `update(data)`      | Replace data and reset zoom/pan                  |
| `destroy()`         | Remove event listeners, observer, and canvas     |

## Browser support

Requires Canvas 2D API and `ResizeObserver` — all modern browsers.

## License

MIT
