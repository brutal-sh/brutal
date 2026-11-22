import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { inNodeSpace, withScreenStroke } from '#core/canvas/overlays/outline'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { drawOutline, withNodeOutline } from '#core/canvas/shapes'
import { AI_ACTIVE_COLOR, AI_DONE_DURATION_MS, AI_PULSE_PERIOD_MS } from '#core/constants'
import { createSceneGeometry, type RotationPreview } from '#core/geometry'

function cueColor(r: SkiaRenderer, alpha: number) {
  const { r: red, g, b } = AI_ACTIVE_COLOR
  return r.ck.Color4f(red, g, b, alpha)
}

/** Draw a diagonal band through the same shape as the stationary tint. */
function drawSweep(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  outline: Parameters<typeof drawOutline>[1],
  phase: number,
  opacity: number
): void {
  if (!r.aiMotionEnabled || opacity <= 0) return
  const band = Math.min(node.width * 0.7, 120 / r.zoom)
  const tilt = Math.min(node.width * 0.28, node.height * 0.32)
  const center = (node.width + band * 2) * phase - band
  const shader = r.ck.Shader.MakeLinearGradient(
    [center - band / 2, tilt],
    [center + band / 2, -tilt],
    [cueColor(r, 0), cueColor(r, opacity), cueColor(r, 0)],
    [0, 0.5, 1],
    r.ck.TileMode.Clamp
  )
  r.auxFill.setColor(r.ck.WHITE)
  r.auxFill.setShader(shader)
  try {
    drawOutline(canvas, outline, r.auxFill)
  } finally {
    r.auxFill.setShader(null)
    shader.delete()
  }
}

export function drawAIOverlays(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  rotationPreview?: RotationPreview | null
): void {
  if (!r._aiActiveNodes.size && !r._aiDoneFlashes.size) return
  const now = performance.now()
  const geometry = createSceneGeometry(graph, rotationPreview)

  function draw(nodeId: string, elapsed: number, active: boolean): boolean {
    const node = graph.getNode(nodeId)
    if (!node) return false
    if (
      graph.pageOf(nodeId) !== r.pageId ||
      graph.closest(nodeId, (ancestor) => !ancestor.visible) ||
      node.width <= 0 ||
      node.height <= 0
    )
      return true

    const phase = active
      ? (elapsed % AI_PULSE_PERIOD_MS) / AI_PULSE_PERIOD_MS
      : elapsed / AI_DONE_DURATION_MS
    const opacity = active || !r.aiMotionEnabled ? 1 : 1 - phase
    inNodeSpace(r, canvas, geometry, node, () => {
      withNodeOutline(r, node, (outline) => {
        r.auxFill.setColor(cueColor(r, opacity * (active ? 0.12 : 0.09)))
        drawOutline(canvas, outline, r.auxFill)
        drawSweep(r, canvas, node, outline, phase, opacity * (active ? 0.48 : 0.44))
        withScreenStroke(r, { color: cueColor(r, opacity * 0.86), width: 1.5 }, (paint) =>
          drawOutline(canvas, outline, paint)
        )
      })
    })
    return true
  }

  for (const [nodeId, start] of r._aiActiveNodes) {
    if (!draw(nodeId, now - start, true)) r._aiActiveNodes.delete(nodeId)
  }
  for (const [nodeId, start] of r._aiDoneFlashes) {
    const elapsed = now - start
    if (elapsed >= AI_DONE_DURATION_MS || !draw(nodeId, elapsed, false)) {
      r._aiDoneFlashes.delete(nodeId)
    }
  }
}
