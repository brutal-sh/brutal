import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { iconDrawing, iconGlyph, readIcon, withIcon } from '@open-pencil/scene-graph/icons'
import { scaleVectorNetworkForResize } from '@open-pencil/scene-graph/resize'

import type { IconData } from './types'

/** Material's weight changes outlines in place; paints and layer identities remain authored. */
export function previewIconWeight(
  graph: SceneGraph,
  frame: SceneNode,
  icon: IconData,
  update: (id: string, changes: Partial<SceneNode>) => void
): void {
  const identity = readIcon(frame)
  if (!identity) return
  const children = graph.getChildren(frame.id)
  if (
    children.length !== icon.paths.length ||
    children.some((path) => path.type !== 'VECTOR') ||
    icon.paths.some((path) => path.fill !== 'currentColor' || path.stroke !== null)
  )
    throw new Error('The icon weight preview requires the existing Material glyph topology')
  const verifiedGlyph = identity.glyph === iconGlyph(graph, frame)
  const verifiedDrawing = identity.drawing === iconDrawing(graph, frame)
  for (const [index, path] of children.entries()) {
    const network = icon.paths[index].vectorNetwork
    update(path.id, {
      vectorNetwork:
        scaleVectorNetworkForResize(network, icon.width, icon.height, path.width, path.height) ??
        network
    })
  }
  update(frame.id, {
    pluginData: withIcon(frame, {
      ...identity,
      options: icon.options,
      ...(verifiedGlyph && { glyph: iconGlyph(graph, frame) }),
      ...(verifiedDrawing && { drawing: iconDrawing(graph, frame) })
    })
  })
}
