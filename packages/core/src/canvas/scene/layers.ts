import type { SceneNode } from '@open-pencil/scene-graph'

import { figmaBlendModeToSkia, needsIsolatedBlendLayer } from '#core/canvas/blend'
import { blurSigma } from '#core/canvas/effects'
import type { RenderOverlays } from '#core/canvas/renderer'

import { nodeIsolationLayerBounds, viewportLayerBounds } from './geometry'
import type { SceneCanvas } from './types'

interface NodeLayers {
  opacity: boolean
  blurred: boolean
}

export function beginNodeLayers(
  context: SceneCanvas,
  node: SceneNode,
  overlays: RenderOverlays
): NodeLayers {
  const { r, canvas, graph } = context
  const opacity = node.opacity < 1 || needsIsolatedBlendLayer(node.blendMode)
  if (opacity) {
    const bounds = nodeIsolationLayerBounds(r, graph, node, overlays.rotationPreview)
    r.opacityPaint.setAlphaf(node.opacity)
    r.opacityPaint.setBlendMode(figmaBlendModeToSkia(r.ck, node.blendMode))
    canvas.saveLayer(r.opacityPaint, bounds)
  }
  const layerBlur = node.effects.find(
    (effect) =>
      effect.visible && (effect.type === 'LAYER_BLUR' || effect.type === 'FOREGROUND_BLUR')
  )
  if (layerBlur) {
    r.effectLayerPaint.setImageFilter(null)
    r.effectLayerPaint.setColorFilter(null)
    r.effectLayerPaint.setBlendMode(r.ck.BlendMode.SrcOver)
    r.effectLayerPaint.setImageFilter(r.getCachedBlur(blurSigma(layerBlur.radius)))
    const padding = layerBlur.radius * 2
    canvas.saveLayer(
      r.effectLayerPaint,
      viewportLayerBounds(r, graph, node, { padding, preview: overlays.rotationPreview }) ??
        r.ck.LTRBRect(-padding, -padding, node.width + padding, node.height + padding)
    )
  }
  return { opacity, blurred: layerBlur !== undefined }
}

export function finishNodeLayers(context: SceneCanvas, layers: NodeLayers): void {
  const { r, canvas } = context
  if (layers.blurred) {
    canvas.restore()
    r.effectLayerPaint.setImageFilter(null)
    r.effectLayerPaint.setColorFilter(null)
    r.effectLayerPaint.setBlendMode(r.ck.BlendMode.SrcOver)
  }
  if (layers.opacity) {
    canvas.restore()
    r.opacityPaint.setAlphaf(1)
    r.opacityPaint.setBlendMode(r.ck.BlendMode.SrcOver)
  }
}
