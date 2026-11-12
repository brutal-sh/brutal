import type { SceneNode } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { renderBooleanOperation } from '#core/canvas/boolean'
import { blurSigma } from '#core/canvas/effects'
import { renderMaskedChildIds } from '#core/canvas/masks'
import type { RenderOverlays } from '#core/canvas/renderer'
import { applyNodeTransforms } from '#core/canvas/scene/geometry'
import type { SceneCanvas } from '#core/canvas/scene/types'

interface ChildPlacement {
  position: Vector
  transformed: boolean
}

export function renderNodeContent(
  context: SceneCanvas,
  node: SceneNode,
  overlays: RenderOverlays
): void {
  const { r, canvas, graph } = context
  if (node.type === 'SECTION') {
    r.renderSection(canvas, node, graph)
  } else if (node.type === 'COMPONENT_SET' && !overlays.playing) {
    // A previewing canvas draws a set as a plain frame.
    r.renderComponentSet(canvas, node, graph)
  } else if (node.type === 'BOOLEAN_OPERATION') {
    renderBooleanOperation(r, canvas, node, graph)
  } else {
    r.renderShape(canvas, node, graph)
  }
}

function renderMaskNodeContent(
  context: SceneCanvas,
  node: SceneNode,
  overlays: RenderOverlays,
  position: Vector
): void {
  const { r, canvas } = context
  canvas.save()
  canvas.translate(node.x, node.y)
  // As in Figma, a mask's opacity and layer blur reach what it masks; its blend mode does not.
  const blur = node.effects.find(
    (effect) =>
      effect.visible && (effect.type === 'LAYER_BLUR' || effect.type === 'FOREGROUND_BLUR')
  )
  const layered = node.opacity < 1 || blur !== undefined
  if (layered) {
    const padding = (blur?.radius ?? 0) * 2
    r.opacityPaint.setAlphaf(node.opacity)
    r.opacityPaint.setBlendMode(r.ck.BlendMode.SrcOver)
    r.opacityPaint.setImageFilter(blur ? r.getCachedBlur(blurSigma(blur.radius)) : null)
    canvas.saveLayer(
      r.opacityPaint,
      r.ck.LTRBRect(-padding, -padding, node.width + padding, node.height + padding)
    )
    r.opacityPaint.setImageFilter(null)
  }
  applyNodeTransforms(canvas, node, overlays)
  renderNodeContent(context, node.maskType === 'VECTOR' ? opaqueFills(node) : node, {})
  // A group or frame used as a mask masks with what its layers draw, as in Figma.
  renderChildren(context, node, overlays, {
    position: { x: position.x + node.x, y: position.y + node.y },
    transformed: true
  })
  if (layered) canvas.restore()
  canvas.restore()
}

/** An outline mask masks with its shape alone, so Figma ignores how opaque its fills are. */
function opaqueFills(node: SceneNode): SceneNode {
  return {
    ...node,
    fills: node.fills.map((fill) => ({ ...fill, opacity: 1, color: { ...fill.color, a: 1 } }))
  }
}

function renderChildIds(
  context: SceneCanvas,
  childIds: string[],
  overlays: RenderOverlays,
  placement: ChildPlacement
): void {
  const { r, canvas, graph } = context
  const { position, transformed } = placement
  renderMaskedChildIds(
    r,
    canvas,
    childIds,
    (childId) => {
      const child = graph.getNode(childId)
      return child?.visible && child.isMask ? child.maskType : null
    },
    (childId) =>
      r.renderNode(canvas, graph, childId, overlays, position.x, position.y, transformed),
    (childId) => {
      const child = graph.getNode(childId)
      if (child) renderMaskNodeContent(context, child, overlays, position)
    },
    (childId) => {
      const child = graph.getNode(childId)
      if (!child) return null
      return { x: child.x, y: child.y, width: child.width, height: child.height }
    }
  )
}

export function renderChildren(
  context: SceneCanvas,
  node: SceneNode,
  overlays: RenderOverlays,
  placement: ChildPlacement
): void {
  const { r, canvas } = context
  if (node.type === 'BOOLEAN_OPERATION') return
  const isClippableContainer =
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  if (isClippableContainer && node.clipsContent && node.childIds.length > 0) {
    canvas.save()
    r.clipNodeShape(canvas, node)
    renderChildIds(context, node.childIds, overlays, placement)
    canvas.restore()
  } else {
    renderChildIds(context, node.childIds, overlays, placement)
  }
}
