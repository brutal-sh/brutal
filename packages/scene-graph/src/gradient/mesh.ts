import { parseColor } from '../color'
import { MAX_MESH_DIMENSION } from '../constants'
import type { Color } from '../primitives'
import type { MeshGradient, MeshPoint } from '../types'

export const MESH_PATCH_STEPS = 32
const DEFAULT_COLORS = ['#FA8F73', '#8C5CD9', '#47BAD9', '#F2C76B']

export function createMeshGradient(columns = 3, rows = 3): MeshGradient {
  if (
    ![columns, rows].every(
      (value) => Number.isInteger(value) && value >= 2 && value <= MAX_MESH_DIMENSION
    )
  )
    throw new RangeError(`Mesh dimensions must be between 2 and ${MAX_MESH_DIMENSION}.`)
  return {
    columns,
    rows,
    colors: Array.from({ length: columns * rows }, (_, index) =>
      parseColor(DEFAULT_COLORS[index % DEFAULT_COLORS.length])
    ),
    points: Array.from({ length: columns * rows }, (_, index) => ({
      position: {
        x: (index % columns) / (columns - 1),
        y: Math.floor(index / columns) / (rows - 1)
      }
    }))
  }
}

function bezier(a: number, b: number, c: number, d: number, t: number): number {
  const s = 1 - t
  return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d
}

function boundary(a: MeshPoint, b: MeshPoint, side: 'horizontal' | 'vertical', t: number) {
  const from = side === 'horizontal' ? a.rightHandle : a.bottomHandle
  const to = side === 'horizontal' ? b.leftHandle : b.topHandle
  const dx = b.position.x - a.position.x
  const dy = b.position.y - a.position.y
  return {
    x: bezier(
      a.position.x,
      a.position.x + (from?.x ?? dx / 4),
      b.position.x + (to?.x ?? -dx / 4),
      b.position.x,
      t
    ),
    y: bezier(
      a.position.y,
      a.position.y + (from?.y ?? dy / 4),
      b.position.y + (to?.y ?? -dy / 4),
      b.position.y,
      t
    )
  }
}

function interpolate(a: number, b: number, c: number, d: number, u: number, v: number) {
  return (1 - v) * ((1 - u) * a + u * b) + v * ((1 - u) * c + u * d)
}

/** A Coons patch with eased, byte-quantized vertex colors, measured against Pen 1.2.21. */
export function tessellateMeshPatch(
  mesh: MeshGradient,
  row: number,
  column: number,
  width: number,
  height: number
) {
  const at = row * mesh.columns + column
  const pointIndices = [at, at + 1, at + mesh.columns, at + mesh.columns + 1]
  const [a, b, c, d] = pointIndices.map((index) => mesh.points[index])
  const cornerColors = pointIndices.map((index) => mesh.colors[index])
  const vertexCount = (MESH_PATCH_STEPS + 1) ** 2
  const positions = new Float32Array(vertexCount * 2)
  const colors = new Uint32Array(vertexCount)
  const indices: number[] = []
  for (let y = 0; y <= MESH_PATCH_STEPS; y++) {
    const v = y / MESH_PATCH_STEPS
    const left = boundary(a, c, 'vertical', v)
    const right = boundary(b, d, 'vertical', v)
    for (let x = 0; x <= MESH_PATCH_STEPS; x++) {
      const u = x / MESH_PATCH_STEPS
      const top = boundary(a, b, 'horizontal', u)
      const bottom = boundary(c, d, 'horizontal', u)
      const index = y * (MESH_PATCH_STEPS + 1) + x
      positions[index * 2] =
        ((1 - v) * top.x +
          v * bottom.x +
          (1 - u) * left.x +
          u * right.x -
          interpolate(a.position.x, b.position.x, c.position.x, d.position.x, u, v)) *
        width
      positions[index * 2 + 1] =
        ((1 - v) * top.y +
          v * bottom.y +
          (1 - u) * left.y +
          u * right.y -
          interpolate(a.position.y, b.position.y, c.position.y, d.position.y, u, v)) *
        height
      const smoothU = u * u * (3 - 2 * u)
      const smoothV = v * v * (3 - 2 * v)
      const channel = (key: keyof Color) =>
        Math.floor(
          Math.max(
            0,
            Math.min(
              1,
              interpolate(
                cornerColors[0][key],
                cornerColors[1][key],
                cornerColors[2][key],
                cornerColors[3][key],
                smoothU,
                smoothV
              )
            )
          ) * 255
        )
      colors[index] =
        ((channel('a') << 24) | (channel('r') << 16) | (channel('g') << 8) | channel('b')) >>> 0
      if (x < MESH_PATCH_STEPS && y < MESH_PATCH_STEPS) {
        indices.push(
          index,
          index + 1,
          index + MESH_PATCH_STEPS + 1,
          index + 1,
          index + MESH_PATCH_STEPS + 2,
          index + MESH_PATCH_STEPS + 1
        )
      }
    }
  }
  return { positions, colors, indices }
}

/** Pen resets geometry on grid changes and cycles the previous palette in row order. */
export function resizeMeshGradient(
  mesh: MeshGradient,
  columns: number,
  rows: number
): MeshGradient {
  const resized = createMeshGradient(columns, rows)
  resized.colors = resized.colors.map((_, index) => ({
    ...mesh.colors[index % mesh.colors.length]
  }))
  return resized
}

export type MeshHandleSide = 'leftHandle' | 'rightHandle' | 'topHandle' | 'bottomHandle'

const HANDLE_DIRECTIONS: Record<MeshHandleSide, [number, number]> = {
  leftHandle: [-1, 0],
  rightHandle: [1, 0],
  topHandle: [0, -1],
  bottomHandle: [0, 1]
}

export function meshHandleNeighbor(
  mesh: MeshGradient,
  index: number,
  side: MeshHandleSide
): number | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= mesh.points.length) return undefined
  const [dx, dy] = HANDLE_DIRECTIONS[side]
  const column = (index % mesh.columns) + dx
  const row = Math.floor(index / mesh.columns) + dy
  if (column < 0 || column >= mesh.columns || row < 0 || row >= mesh.rows) return undefined
  return row * mesh.columns + column
}

export function meshHandleOffset(mesh: MeshGradient, index: number, side: MeshHandleSide) {
  const point = mesh.points.at(index)
  const neighborIndex = meshHandleNeighbor(mesh, index, side)
  const neighbor = neighborIndex === undefined ? undefined : mesh.points.at(neighborIndex)
  if (!point || !neighbor) return undefined
  return (
    point[side] ?? {
      x: (neighbor.position.x - point.position.x) / 4,
      y: (neighbor.position.y - point.position.y) / 4
    }
  )
}
