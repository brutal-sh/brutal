import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { parseColor } from '@open-pencil/scene-graph/color'
import { BLACK } from '@open-pencil/scene-graph/constants'
import {
  iconGlyph,
  iconDrawing,
  hasIconFills,
  iconLayerName,
  isPlacedIconName,
  readIcon,
  readIconTint,
  withIcon,
  withIconPaintSource,
  withIconTint,
  type IconOptions,
  type IconPaint
} from '@open-pencil/scene-graph/icons'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { transformVectorNetwork } from '@open-pencil/scene-graph/vector-network'

import { createPathStroke, pathStrokeLineStyle } from '#core/icons/path-style'

import type { IconData, IconPath } from './types'

/** The paint an SVG uses for the icon's own color. */
const CURRENT_COLOR = 'currentColor'

export interface PlaceIconOptions {
  size: number
  /** What `currentColor` paints become; paths with their own colors keep them. */
  color: Color
  /** Fields of the icon's frame, such as its position or name. */
  overrides?: Partial<SceneNode>
  /**
   * Record the icon's name on its frame, so it can be swapped and exported as that icon. Off for
   * artwork that has no name in a set, such as inline SVG.
   */
  identity?: boolean
}

function solid(color: Color, opacity = 1) {
  return [{ type: 'SOLID' as const, color, opacity, visible: true }]
}

/** One path of an icon as a vector filling the icon's box, marked where the icon's color paints. */
function addPath(graph: SceneGraph, frameId: string, path: IconPath, size: number, color: Color) {
  const tint: IconPaint[] = []
  const paint = (value: string, kind: IconPaint) => {
    if (value !== CURRENT_COLOR) return parseColor(value)
    tint.push(kind)
    return color
  }
  const vector = graph.createNode('VECTOR', frameId, {
    name: 'path',
    x: 0,
    y: 0,
    width: size,
    height: size,
    vectorNetwork: path.vectorNetwork,
    // Resizing the icon resizes its glyph, as the frame is the icon.
    horizontalConstraint: 'SCALE',
    verticalConstraint: 'SCALE',
    fills: path.fill ? solid(paint(path.fill, 'fill'), path.fillOpacity) : []
  })
  if (path.stroke) {
    const stroke = createPathStroke(
      paint(path.stroke, 'stroke'),
      path.strokeWidth,
      path.strokeCap,
      path.strokeJoin
    )
    graph.updateNode(vector.id, { strokes: [stroke], ...pathStrokeLineStyle(stroke) })
  }
  if (tint.length > 0)
    graph.updateNode(vector.id, {
      pluginData: withIconTint(graph.getNode(vector.id) ?? vector, tint)
    })
  if (tint.length > 0) graph.updateNode(vector.id, { pluginData: withIconPaintSource(vector) })
}

/**
 * An icon as a frame of vector paths that keeps the icon's name, so it can be swapped,
 * recolored, and exported as an icon rather than as anonymous paths.
 */
export function placeIcon(
  graph: SceneGraph,
  parentId: string,
  icon: IconData,
  { size, color, overrides, identity = true }: PlaceIconOptions
): SceneNode {
  const name = `${icon.prefix}:${icon.name}`
  const authoredFills = identity && overrides?.fills === undefined
  const frame = graph.createNode('FRAME', parentId, {
    name: identity ? iconLayerName(name) : icon.name,
    width: size,
    height: size,
    fills: authoredFills ? solid(color, color.a) : [],
    ...overrides
  })
  if (authoredFills)
    graph.updateNode(frame.id, { pluginData: withIcon(frame, { name, paintSource: 'frame' }) })
  for (const path of icon.paths) addPath(graph, frame.id, path, size, color)
  if (identity) recordIcon(graph, frame.id, name, icon.options)
  return graph.getNode(frame.id) ?? frame
}

/** An icon's paths, scaled from the size they were built at to `size`. */
function scaledPaths(icon: IconData, size: number): IconPath[] {
  const scale = size / Math.max(icon.width, icon.height)
  if (scale === 1) return icon.paths
  return icon.paths.map((path) => ({
    ...path,
    vectorNetwork: transformVectorNetwork(Matrix.scaled(scale, scale), path.vectorNetwork),
    strokeWidth: path.strokeWidth * scale
  }))
}

/**
 * Draws an icon into a frame that already exists, `size` square at its origin, and records the
 * icon on it, as for one placed with {@link placeIcon}. The icon may have been built at any size.
 */
export function drawIcon(
  graph: SceneGraph,
  frameId: string,
  icon: IconData,
  size: number,
  color: Color
): void {
  const frame = graph.getNode(frameId)
  if (frame)
    graph.updateNode(frameId, {
      pluginData: withIcon(frame, { name: `${icon.prefix}:${icon.name}`, paintSource: 'frame' })
    })
  for (const path of scaledPaths(icon, size)) addPath(graph, frameId, path, size, color)
  recordIcon(graph, frameId, `${icon.prefix}:${icon.name}`, icon.options)
}

/**
 * Writes the icon `name` on its frame with a fingerprint of the paths it draws now, and how a set
 * we draw ourselves drew it.
 */
function recordIcon(graph: SceneGraph, frameId: string, name: string, options?: IconOptions): void {
  const frame = graph.getNode(frameId)
  if (!frame) return
  const glyph = iconGlyph(graph, frame)
  const drawing = iconDrawing(graph, frame)
  const icon = {
    name,
    glyph,
    drawing,
    ...(options && { options }),
    ...(hasIconFills(frame) && { paintSource: 'frame' as const })
  }
  graph.updateNode(frameId, { pluginData: withIcon(frame, icon) })
}

/**
 * Makes an icon plain artwork: its frame forgets the icon and its paths their tint, so it is
 * no longer swapped, recolored as one, or exported as `<Icon>`. The paths stay as drawn.
 */
export function detachIcon(graph: SceneGraph, frameId: string): void {
  const frame = graph.getNode(frameId)
  if (!frame || !readIcon(frame)) return
  const authoredFills = hasIconFills(frame)
  graph.updateNode(frameId, { pluginData: withIcon(frame, null) })
  if (authoredFills) graph.updateNode(frameId, { fills: [] })
  for (const path of graph.getChildren(frameId))
    if (readIconTint(path).length > 0) {
      graph.updateNode(path.id, { pluginData: withIconTint(path, []) })
      graph.updateNode(path.id, { pluginData: withIconPaintSource(path, null) })
    }
}

/** The color an icon's tinted paths have, or null when none takes the icon's color. */
export function iconColor(graph: SceneGraph, frame: SceneNode): Color | null {
  if (hasIconFills(frame)) return frame.fills.find((fill) => fill.type === 'SOLID')?.color ?? null
  for (const path of graph.getChildren(frame.id)) {
    const tint = readIconTint(path)
    if (tint.includes('fill') && path.fills[0]) return path.fills[0].color
    if (tint.includes('stroke') && path.strokes[0]) return path.strokes[0].color
  }
  return null
}

/** Sets the color of an icon's tinted paints; paths with colors of their own keep them. */
export function recolorIcon(graph: SceneGraph, frameId: string, color: Color): void {
  const frame = graph.getNode(frameId)
  if (frame && hasIconFills(frame)) {
    graph.updateNode(frameId, {
      fills: frame.fills.map((fill) => (fill.type === 'SOLID' ? { ...fill, color } : fill))
    })
    return
  }
  for (const path of graph.getChildren(frameId)) {
    const tint = readIconTint(path)
    if (tint.includes('fill'))
      graph.updateNode(path.id, { fills: path.fills.map((fill) => ({ ...fill, color })) })
    if (tint.includes('stroke'))
      graph.updateNode(path.id, { strokes: path.strokes.map((stroke) => ({ ...stroke, color })) })
  }
}

/**
 * Draws another icon in an icon's frame, keeping its position and color, so the swap reads as
 * a change of glyph. The glyph fits a centered square at the frame's shorter side.
 * Does nothing to a frame that is not an icon.
 */
export function swapIcon(graph: SceneGraph, frameId: string, icon: IconData): void {
  const frame = graph.getNode(frameId)
  if (!frame || !readIcon(frame)) return
  const color = iconColor(graph, frame) ?? BLACK
  const size = Math.min(frame.width, frame.height)
  for (const child of graph.getChildren(frameId)) graph.deleteNode(child.id)
  const name = `${icon.prefix}:${icon.name}`
  const previous = readIcon(frame)
  graph.updateNode(frameId, {
    // A layer still named after its icon takes the new icon's name; a name someone gave stays.
    name: previous && isPlacedIconName(frame.name, previous.name) ? iconLayerName(name) : frame.name
  })
  for (const path of scaledPaths(icon, size)) addPath(graph, frameId, path, size, color)
  for (const path of graph.getChildren(frameId)) {
    graph.updateNode(path.id, {
      x: (frame.width - size) / 2,
      y: (frame.height - size) / 2
    })
  }
  recordIcon(graph, frameId, name, icon.options)
}
