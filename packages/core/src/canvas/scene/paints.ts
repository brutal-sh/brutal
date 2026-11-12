import type { Fill, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { hasIconFills } from '@open-pencil/scene-graph/icons'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { figmaBlendModeToSkia } from '#core/canvas/blend'
import { paintFills } from '#core/canvas/fills'
import { resolvedNodePaints } from '#core/canvas/node-paints'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { applyStrokeShader } from '#core/canvas/strokes'

export function drawVisibleFills(
  r: SkiaRenderer,
  node: SceneNode,
  graph: SceneGraph,
  draw: (fill: Fill) => void
): void {
  if (hasIconFills(node)) return
  paintFills(r, resolvedNodePaints(graph, node).fills ?? node.fills, node, graph, draw)
}

export function forVisibleStrokes(
  r: SkiaRenderer,
  node: SceneNode,
  graph: SceneGraph,
  draw: (stroke: SceneNode['strokes'][number], color: Color) => void
): void {
  const strokes = resolvedNodePaints(graph, node).strokes ?? node.strokes
  for (let index = 0; index < strokes.length; index++) {
    const stroke = strokes[index]
    if (!stroke.visible) continue
    const draws = applyStrokeShader(r, stroke, index, node, graph)
    try {
      const blendMode = figmaBlendModeToSkia(r.ck, stroke.blendMode)
      r.strokePaint.setBlendMode(blendMode)
      r.fillPaint.setBlendMode(blendMode)
      if (draws) draw(stroke, r.resolveStrokeColor(stroke, index, node, graph))
    } finally {
      r.strokePaint.setShader(null)
      r.fillPaint.setShader(null)
      r.strokePaint.setBlendMode(r.ck.BlendMode.SrcOver)
      r.fillPaint.setBlendMode(r.ck.BlendMode.SrcOver)
    }
  }
}
