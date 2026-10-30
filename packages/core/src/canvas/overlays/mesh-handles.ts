import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { editedMesh, editedMeshLayout } from '#core/editor/mesh-edit'
import type { GradientEdit } from '#core/editor/types'
import { MESH_HANDLE, type RotationPreview } from '#core/geometry'

export function drawMeshHandles(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  edit: GradientEdit,
  preview?: RotationPreview | null
) {
  const edited = editedMesh(graph, edit)
  const layout = editedMeshLayout(graph, edit, r, preview)
  if (!edited || !layout) return
  const stroke = r.auxStroke
  const fill = r.auxFill
  stroke.setPathEffect(null)
  stroke.setMaskFilter(null)
  stroke.setStrokeWidth(1)
  stroke.setColor(r.ck.Color4f(0.15, 0.15, 0.15, 0.6))
  if (edit.meshOutline !== false) {
    const builder = new r.ck.PathBuilder()
    for (const curve of layout.curves) {
      builder.moveTo(curve.from.x, curve.from.y)
      builder.cubicTo(
        curve.control1.x,
        curve.control1.y,
        curve.control2.x,
        curve.control2.y,
        curve.to.x,
        curve.to.y
      )
    }
    const path = builder.detachAndDelete()
    canvas.drawPath(path, stroke)
    path.delete()
  }
  const bounds = new r.ck.PathBuilder()
  layout.bounds.forEach((point, index) =>
    index === 0 ? bounds.moveTo(point.x, point.y) : bounds.lineTo(point.x, point.y)
  )
  bounds.close()
  const boundary = bounds.detachAndDelete()
  stroke.setColor(r.selColor())
  canvas.drawPath(boundary, stroke)
  boundary.delete()
  fill.setMaskFilter(null)
  for (const handle of layout.handles) {
    stroke.setColor(r.ck.Color4f(0.15, 0.15, 0.15, 0.7))
    canvas.drawLine(handle.origin.x, handle.origin.y, handle.center.x, handle.center.y, stroke)
    fill.setColor(r.ck.Color4f(0, 0, 0, 1))
    canvas.drawCircle(handle.center.x, handle.center.y, MESH_HANDLE.tangentRadius, fill)
    stroke.setColor(r.ck.Color4f(1, 1, 1, 1))
    canvas.drawCircle(handle.center.x, handle.center.y, MESH_HANDLE.tangentRadius, stroke)
  }
  const mesh =
    resolvedPaintBindings(graph, edited.node)[edit.paint]?.[edit.index]?.meshGradient ?? edited.mesh
  for (const [index, point] of layout.points.entries()) {
    const color = mesh.colors[index]
    const selected = edit.meshPoints?.includes(index) ?? index === edit.stop
    const radius = selected ? MESH_HANDLE.selectedPointRadius : MESH_HANDLE.pointRadius
    fill.setColor(r.ck.Color4f(color.r, color.g, color.b, color.a))
    canvas.drawCircle(point.x, point.y, radius, fill)
    stroke.setStrokeWidth(selected ? 2 : 1)
    stroke.setColor(selected ? r.ck.Color4f(1, 1, 1, 1) : r.ck.Color4f(0.4, 0.4, 0.4, 1))
    canvas.drawCircle(point.x, point.y, radius, stroke)
  }
}
