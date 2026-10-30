import type { MeshGradient } from '@open-pencil/scene-graph'
import {
  meshHandleOffset,
  meshHandleNeighbor,
  type MeshHandleSide
} from '@open-pencil/scene-graph/gradient/mesh'
import type { Vector } from '@open-pencil/scene-graph/primitives'

export const MESH_HANDLE = {
  pointRadius: 5,
  selectedPointRadius: 6,
  tangentRadius: 3,
  hitRadius: 8
} as const
const SIDES: MeshHandleSide[] = ['leftHandle', 'rightHandle', 'topHandle', 'bottomHandle']

export interface MeshHandleLayout {
  points: Vector[]
  bounds: Vector[]
  curves: { from: Vector; control1: Vector; control2: Vector; to: Vector }[]
  handles: { index: number; side: MeshHandleSide; center: Vector; origin: Vector }[]
}

export function meshHandleLayout(
  mesh: MeshGradient,
  width: number,
  height: number,
  toScreen: (point: Vector) => Vector,
  selected: number | readonly number[]
): MeshHandleLayout {
  const selection = new Set(typeof selected === 'number' ? [selected] : selected)
  const screen = (point: Vector) => toScreen({ x: point.x * width, y: point.y * height })
  const points = mesh.points.map((point) => screen(point.position))
  const tangent = (index: number, side: MeshHandleSide) => {
    const offset = meshHandleOffset(mesh, index, side)
    const point = mesh.points[index].position
    return offset ? screen({ x: point.x + offset.x, y: point.y + offset.y }) : undefined
  }
  const curves: MeshHandleLayout['curves'] = []
  const handles: MeshHandleLayout['handles'] = []
  for (const [index, point] of points.entries()) {
    for (const side of SIDES) {
      const center = tangent(index, side)
      if (!center) continue
      const neighbor = meshHandleNeighbor(mesh, index, side)
      if (neighbor === undefined) continue
      if (selection.has(index) || selection.has(neighbor))
        handles.push({ index, side, center, origin: point })
      if (side !== 'rightHandle' && side !== 'bottomHandle') continue
      const control2 = tangent(neighbor, side === 'rightHandle' ? 'leftHandle' : 'topHandle')
      if (control2) curves.push({ from: point, control1: center, control2, to: points[neighbor] })
    }
  }
  return {
    points,
    curves,
    handles,
    bounds: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ].map(screen)
  }
}

export type MeshHit =
  | { kind: 'point'; index: number }
  | { kind: 'handle'; index: number; side: MeshHandleSide }

export function hitTestMeshHandles(layout: MeshHandleLayout, point: Vector): MeshHit | null {
  const near = (center: Vector) =>
    Math.hypot(center.x - point.x, center.y - point.y) <= MESH_HANDLE.hitRadius
  const handle = layout.handles.find((entry) => near(entry.center))
  if (handle) return { kind: 'handle', index: handle.index, side: handle.side }
  const index = layout.points.findIndex(near)
  return index === -1 ? null : { kind: 'point', index }
}
