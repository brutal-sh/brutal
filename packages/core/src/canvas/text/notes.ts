import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { noteBody } from '@open-pencil/scene-graph/generated'

import type { SkiaRenderer } from '#core/canvas/renderer'

import { textNodeToOutlinePath } from './outlines'

/** Draw generated Note bodies with shaped glyph outlines and vector coverage. */
export function drawNoteText(
  renderer: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  graph: SceneGraph
): boolean {
  if (node.type !== 'TEXT' || !node.parentId) return false
  const parent = graph.getNode(node.parentId)
  if (!parent || noteBody(graph, parent)?.id !== node.id) return false
  const path = textNodeToOutlinePath(renderer, node, 'pixel')
  if (!path) return false
  try {
    canvas.drawPath(path, renderer.fillPaint)
  } finally {
    path.delete()
  }
  return true
}
