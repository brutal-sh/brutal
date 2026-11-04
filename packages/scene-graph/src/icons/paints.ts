import { isEqual, pick } from 'es-toolkit'

import { copyFill } from '../copy'
import { composeGradientTransforms } from '../gradient'
import type { SceneGraph } from '../graph'
import { recordInstanceOverride } from '../instances'
import type { Fill, GradientTransform, SceneNode } from '../types'
import { hasIconFills, readIconPaintSource, readIconTint, withIconPaintSource } from './model'
import type { IconPaintSource } from './schema'

const STROKE_GEOMETRY = ['weight', 'align', 'cap', 'join', 'dashPattern'] as const

function sourceAtPathSize(source: IconPaintSource, path: SceneNode): IconPaintSource {
  const scale = Math.min(
    path.width / (source.width || path.width || 1),
    path.height / (source.height || path.height || 1)
  )
  return {
    fills: source.fills,
    strokes: source.strokes.map((stroke, index) => ({
      ...stroke,
      ...(path.strokes[index]
        ? pick(path.strokes[index], STROKE_GEOMETRY)
        : { weight: stroke.weight * scale })
    })),
    width: path.width,
    height: path.height
  }
}

function painted<T extends Fill>(source: T[], fills: Fill[], local: GradientTransform): T[] {
  return fills.flatMap((fill) =>
    source.map((base) => {
      const next = copyFill({ ...base, ...fill, opacity: base.opacity * fill.opacity })
      if (next.gradientTransform)
        next.gradientTransform = composeGradientTransforms(next.gradientTransform, local)
      if (next.meshGradient && local.m00 > 0 && local.m11 > 0) {
        for (const point of next.meshGradient.points) {
          point.position = {
            x: (point.position.x - local.m02) / local.m00,
            y: (point.position.y - local.m12) / local.m11
          }
          for (const side of ['leftHandle', 'rightHandle', 'topHandle', 'bottomHandle'] as const) {
            const offset = point[side]
            if (offset) point[side] = { x: offset.x / local.m00, y: offset.y / local.m11 }
          }
        }
      }
      return next
    })
  )
}

/** The paints a path derives from its icon, or null for legacy/independently painted artwork. */
export function iconPathPaints(frame: SceneNode, path: SceneNode, fills = frame.fills) {
  if (!hasIconFills(frame)) return null
  const stored = readIconPaintSource(path)
  if (!stored) return null
  const source = sourceAtPathSize(stored, path)
  const tint = readIconTint(path)
  const local = {
    m00: frame.width > 0 ? path.width / frame.width : 0,
    m01: 0,
    m02: frame.width > 0 ? path.x / frame.width : 0,
    m10: 0,
    m11: frame.height > 0 ? path.height / frame.height : 0,
    m12: frame.height > 0 ? path.y / frame.height : 0
  }
  return {
    fills: tint.includes('fill') ? painted(source.fills, fills, local) : path.fills,
    strokes: tint.includes('stroke') ? painted(source.strokes, fills, local) : path.strokes
  }
}

/** Called by the graph for committed, previewed and restored properties alike. */
export function synchronizeIconPaints(
  graph: SceneGraph,
  node: SceneNode,
  changes?: Partial<SceneNode>
): void {
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  const candidate = hasIconFills(node) ? node : parent
  const frame = candidate && hasIconFills(candidate) ? candidate : undefined
  if (!frame) return
  const fields =
    frame === node
      ? [
          'fills',
          'boundVariables',
          'variableBindingScales',
          'pluginData',
          'childIds',
          'width',
          'height'
        ]
      : ['x', 'y', 'width', 'height', 'pluginData']
  if (changes && !fields.some((field) => Object.hasOwn(changes, field))) return
  for (const path of graph.getChildren(frame.id)) {
    const source = readIconPaintSource(path)
    if (source) {
      const current = sourceAtPathSize(source, path)
      if (!isEqual(source, current))
        graph.updateNode(path.id, { pluginData: withIconPaintSource(path, current) })
    }
    const next = iconPathPaints(frame, path)
    if (!next) continue
    const changed = [
      ...(isEqual(next.fills, path.fills) ? [] : ['fills']),
      ...(isEqual(next.strokes, path.strokes) ? [] : ['strokes'])
    ]
    if (!changed.length) continue
    graph.updateNode(path.id, next)
    recordInstanceOverride(graph, path.id, changed)
  }
}
