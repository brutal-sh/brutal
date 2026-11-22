import type { Canvas, Path } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import { readableForeground } from '@open-pencil/scene-graph/color'
import { getWorldMatrix } from '@open-pencil/scene-graph/coordinate'
import Matrix from '@open-pencil/scene-graph/matrix'

import type { PresenceCursor, SkiaRenderer } from '#core/canvas/renderer'
import { POINTER_ARROW } from '#core/constants'

const LABEL_PADDING_X = 4
const LABEL_PADDING_Y = 2
const LABEL_FONT_SIZE = 10
const LABEL_OFFSET_X = 15
const LABEL_OFFSET_Y = 12
/** Longer names end with an ellipsis. */
const LABEL_MAX_WIDTH = 160

function drawSelection(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph, cursor: PresenceCursor) {
  if (!cursor.selection?.length && !cursor.outline?.length) return
  const { r: red, g, b } = cursor.color
  r.auxStroke.setColor(r.ck.Color4f(red, g, b, 0.6))
  r.auxStroke.setStrokeWidth(1.5)
  r.auxStroke.setPathEffect(null)
  // Outlines of what is not a layer yet, such as JSX an agent is still streaming.
  for (const rect of cursor.outline ?? []) {
    canvas.drawRect(
      r.ck.XYWHRect(
        rect.x * r.zoom + r.panX,
        rect.y * r.zoom + r.panY,
        rect.width * r.zoom,
        rect.height * r.zoom
      ),
      r.auxStroke
    )
  }
  for (const nodeId of cursor.selection ?? []) {
    const node = graph.getNode(nodeId)
    if (!node) continue
    // Map the corners through the node's world matrix, as the shape is rendered, so the
    // box tracks rotation, flips, and parent transforms.
    const corners = Matrix.mapPoints(getWorldMatrix(node, graph), [
      0,
      0,
      node.width,
      0,
      node.width,
      node.height,
      0,
      node.height
    ])
    const box = new r.ck.PathBuilder()
    box.moveTo(corners[0] * r.zoom + r.panX, corners[1] * r.zoom + r.panY)
    for (let i = 2; i < corners.length; i += 2) {
      box.lineTo(corners[i] * r.zoom + r.panX, corners[i + 1] * r.zoom + r.panY)
    }
    box.close()
    const path = box.detachAndDelete()
    canvas.drawPath(path, r.auxStroke)
    path.delete()
  }
}

/** Color identifies the person or agent and the rim keeps the pointer visible on the canvas. */
function drawPointer(
  r: SkiaRenderer,
  canvas: Canvas,
  path: Path,
  x: number,
  y: number,
  cursor: PresenceCursor,
  mirrored: boolean
) {
  canvas.save()
  canvas.translate(x, y)
  canvas.scale(mirrored ? -1 : 1, 1)
  canvas.translate(-POINTER_ARROW.tipX, -POINTER_ARROW.tipY)

  r.auxStroke.setColor(r.ck.WHITE)
  r.auxStroke.setStrokeWidth(2)
  r.auxStroke.setPathEffect(null)
  canvas.drawPath(path, r.auxStroke)
  const { r: red, g, b } = cursor.color
  r.auxFill.setColor(r.ck.Color4f(red, g, b, 1))
  canvas.drawPath(path, r.auxFill)
  canvas.restore()
}

/** A solid identity label, including the agent's model when known. */
function drawLabel(
  r: SkiaRenderer,
  canvas: Canvas,
  x: number,
  y: number,
  cursor: PresenceCursor,
  mirrored: boolean
) {
  const provider = r.fontProvider
  if (!cursor.name || !provider || x < 0 || x >= r.viewportWidth) return
  const { r: red, g, b } = cursor.color
  const color = r.ck.Color4f(red, g, b, 1)
  const agent = cursor.kind === 'agent'
  const title = agent && cursor.model ? `${cursor.name} · ${cursor.model}` : cursor.name
  const ink = readableForeground(cursor.color)
  const labelInk = r.ck.Color4f(ink.r, ink.g, ink.b, 1)
  const pillY = y + LABEL_OFFSET_Y
  const pillHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2
  // Shaped like other canvas labels: kerning, fallback fonts, and RTL names.
  r.labelParagraphCache.use(
    r.ck,
    provider,
    title,
    LABEL_FONT_SIZE,
    LABEL_MAX_WIDTH,
    labelInk,
    r.fontGeneration,
    ({ paragraph, metrics }) => {
      const radius = agent ? pillHeight / 2 : 4
      const width = metrics.width + LABEL_PADDING_X * 2
      const targetX = mirrored ? x - LABEL_OFFSET_X - width : x + LABEL_OFFSET_X
      const pillX = Math.max(0, Math.min(targetX, r.viewportWidth - width))
      const pill = r.ck.RRectXY(r.ck.XYWHRect(pillX, pillY, width, pillHeight), radius, radius)
      r.auxFill.setColor(color)
      canvas.drawRRect(pill, r.auxFill)
      canvas.drawParagraph(
        paragraph,
        pillX + LABEL_PADDING_X,
        pillY + (pillHeight - metrics.height) / 2
      )
    }
  )
}

/** Cursors of people and agents in screen space, with outlines of what they selected. */
export function drawPresenceCursors(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  cursors?: PresenceCursor[],
  mirrored = false
): void {
  if (!cursors?.length) return
  const path = r.ck.Path.MakeFromSVGString(POINTER_ARROW.path)
  try {
    for (const cursor of cursors) {
      const x = cursor.x * r.zoom + r.panX
      const y = cursor.y * r.zoom + r.panY
      drawSelection(r, canvas, graph, cursor)
      if (path) drawPointer(r, canvas, path, x, y, cursor, mirrored)
      drawLabel(r, canvas, x, y, cursor, mirrored)
    }
  } finally {
    path?.delete()
  }
}
