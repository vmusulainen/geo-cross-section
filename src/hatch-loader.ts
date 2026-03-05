// Eagerly import all PNG hatch tiles as asset URLs via Vite
const modules = import.meta.glob<string>(
  './hatches/*.png',
  { eager: true, query: '?url', import: 'default' },
)

/** Map from zero-padded hatch code (e.g. "038") to resolved asset URL */
export const hatchUrls: Record<string, string> = {}

for (const [path, url] of Object.entries(modules)) {
  const m = path.match(/(\d+)\.png$/)
  if (m) hatchUrls[m[1]] = url
}
