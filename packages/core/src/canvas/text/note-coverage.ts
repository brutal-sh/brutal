import type { CanvasKit, Path } from 'canvaskit-wasm'

interface TextTransform {
  scale: number
  x: number
  y: number
}

type PixelCoverage = (x: number, y: number) => number

interface Point {
  x: number
  y: number
}

interface Edge {
  top: Point
  bottom: Point
  winding: number
}

const SUBPIXELS = 256
const normalSamples: readonly Point[] = [
  { x: 1, y: 5 },
  { x: 3, y: 1 },
  { x: 5, y: 7 },
  { x: 7, y: 3 }
]
const transposedSamples = normalSamples.map(({ x, y }) => ({ x: y, y: x }))
const coverageAlpha = [0, 64 / 255, 128 / 255, 191 / 255, 1]

function flattenQuadratic(
  point: Point,
  control: Point,
  end: Point,
  add: (from: Point, to: Point) => void
): void {
  const deviation = Math.hypot(point.x - 2 * control.x + end.x, point.y - 2 * control.y + end.y)
  // Skia's quadratic tessellation limits the error to a quarter of a device pixel.
  const segments = 2 ** Math.max(0, Math.ceil(Math.log2(Math.sqrt(deviation))))
  let previous = point
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const u = 1 - t
    const next = {
      x: u * u * point.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * point.y + 2 * u * t * control.y + t * t * end.y
    }
    add(previous, next)
    previous = next
  }
}

function pathEdges(ck: CanvasKit, path: Path, transform: TextTransform): Edge[] | null {
  const commands = path.toCmds()
  const edges: Edge[] = []
  let point: Point | undefined
  let first: Point | undefined
  let offset = 0
  const read = (): Point => ({
    x: commands[offset++] * transform.scale + transform.x,
    y: commands[offset++] * transform.scale + transform.y
  })
  const snapped = (p: Point): Point => ({
    x: Math.round(p.x * SUBPIXELS),
    y: Math.round(p.y * SUBPIXELS)
  })
  const add = (from: Point, to: Point) => {
    const a = snapped(from)
    const b = snapped(to)
    if (a.y < b.y) edges.push({ top: a, bottom: b, winding: 1 })
    if (a.y > b.y) edges.push({ top: b, bottom: a, winding: -1 })
  }
  while (offset < commands.length) {
    const verb = commands[offset++]
    if (verb === ck.MOVE_VERB) {
      if (first && point) add(point, first)
      first = point = read()
    } else if (!point || !first) {
      return null
    } else if (verb === ck.LINE_VERB) {
      const end = read()
      add(point, end)
      point = end
    } else if (verb === ck.QUAD_VERB) {
      const control = read()
      const end = read()
      flattenQuadratic(point, control, end, add)
      point = end
    } else if (verb === ck.CLOSE_VERB) {
      add(point, first)
      point = first
    } else {
      return null
    }
  }
  if (point && first) add(point, first)
  return edges
}

function rowCoverage(edges: Edge[], samplePoints: readonly Point[]): PixelCoverage {
  let previousY = Number.NaN
  let crossings: { x: number; winding: number }[][] = []
  let positions: number[] = []
  let winding: number[] = []
  return (x, y) => {
    if (y !== previousY) {
      previousY = y
      positions = samplePoints.map(() => 0)
      winding = samplePoints.map(() => 0)
      crossings = samplePoints.map((sample) => {
        const sy = (y + sample.y / 8) * SUBPIXELS
        const row = []
        for (const edge of edges) {
          const { top, bottom } = edge
          if (sy < top.y || sy >= bottom.y) continue
          row.push({
            x: top.x + ((sy - top.y) * (bottom.x - top.x)) / (bottom.y - top.y),
            winding: edge.winding
          })
        }
        return row.sort((a, b) => a.x - b.x)
      })
    }
    let count = 0
    for (const [index, sample] of samplePoints.entries()) {
      const sx = (x + sample.x / 8) * SUBPIXELS
      const row = crossings[index]
      // Include left edges and exclude right edges on the fixed subpixel grid.
      while (positions[index] < row.length && row[positions[index]].x <= sx) {
        winding[index] += row[positions[index]++].winding
      }
      if (winding[index] !== 0) count++
    }
    return coverageAlpha[count]
  }
}

export function noteTextCoverage(ck: CanvasKit, path: Path, transform: TextTransform) {
  const [l, t, r, b] = path.getBounds()
  const { scale, x, y } = transform
  const left = Math.floor(l * scale + x)
  const top = Math.floor(t * scale + y)
  const right = Math.ceil(r * scale + x)
  const bottom = Math.ceil(b * scale + y)
  const width = right - left
  const height = bottom - top
  // Larger paths use Skia's regular rasterizer instead of the four-sample path atlas.
  if (width * height > 256 ** 2 || Math.max(width, height) > 1024) return null
  const edges = pathEdges(ck, path, transform)
  if (!edges) return null

  const sameBand = Math.ceil(Math.log2(width)) === Math.ceil(Math.log2(height))
  const transposed = sameBand ? width > height : height > width
  const coverage = rowCoverage(edges, transposed ? transposedSamples : normalSamples)
  return { bounds: { left, top, right, bottom }, coverage }
}
