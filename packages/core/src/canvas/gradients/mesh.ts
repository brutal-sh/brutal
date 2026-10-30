import type { Paint } from 'canvaskit-wasm'
import * as v from 'valibot'

import type { Fill, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { resolveRGBAForPreview } from '@open-pencil/scene-graph/color'
import { tessellateMeshPatch } from '@open-pencil/scene-graph/gradient/mesh'
import { meshGradientSchema } from '@open-pencil/scene-graph/paints'

import type { SkiaRenderer } from '#core/canvas/renderer'

/** Record the mesh once into the node picture; the paint then clips it to any outline. */
export function applyMeshFill(
  r: SkiaRenderer,
  fill: Fill,
  node: SceneNode,
  paint: Paint,
  graph: SceneGraph,
  field: 'fills' | 'strokes',
  paintIndex: number
): boolean {
  const parsed = v.safeParse(meshGradientSchema, fill.meshGradient)
  if (!parsed.success || node.width <= 0 || node.height <= 0) return false
  const mesh = {
    ...parsed.output,
    colors: parsed.output.colors.map((color, index) => {
      const variable = node.boundVariables[`${field}/${paintIndex}/meshGradient/colors/${index}`]
      return resolveRGBAForPreview(
        (variable && graph.resolveColorVariableForNode(node.id, variable)) || color,
        { documentColorSpace: graph.documentColorSpace, colorSpace: r.presentationColorSpace }
      ).color
    })
  }
  const recorder = new r.ck.PictureRecorder()
  const bounds = r.ck.XYWHRect(0, 0, node.width, node.height)
  const canvas = recorder.beginRecording(bounds)
  const meshPaint = new r.ck.Paint()
  meshPaint.setColor(r.ck.Color(255, 255, 255))
  let picture
  try {
    for (let row = 0; row < mesh.rows - 1; row++) {
      for (let column = 0; column < mesh.columns - 1; column++) {
        const patch = tessellateMeshPatch(mesh, row, column, node.width, node.height)
        if (!patch.positions.every(Number.isFinite)) return false
        const vertices = r.ck.MakeVertices(
          r.ck.VertexMode.Triangles,
          patch.positions,
          null,
          patch.colors,
          patch.indices
        )
        try {
          canvas.drawVertices(vertices, r.ck.BlendMode.Modulate, meshPaint)
        } finally {
          vertices.delete()
        }
      }
    }
    picture = recorder.finishRecordingAsPicture()
  } finally {
    meshPaint.delete()
    recorder.delete()
  }
  try {
    const shader = picture.makeShader(
      r.ck.TileMode.Clamp,
      r.ck.TileMode.Clamp,
      r.ck.FilterMode.Linear,
      undefined,
      bounds
    )
    try {
      paint.setShader(shader)
    } finally {
      shader.delete()
    }
  } finally {
    picture.delete()
  }
  return true
}
