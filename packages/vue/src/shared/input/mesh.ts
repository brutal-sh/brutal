import { editedMesh, editedMeshLayout, type Editor } from '@open-pencil/core'
import { createSceneGeometry, hitTestMeshHandles } from '@open-pencil/core/geometry'
import type { MeshHandleSide } from '@open-pencil/scene-graph/gradient/mesh'

import type { DragState } from '#vue/shared/input/types'

const OPPOSITE: Record<MeshHandleSide, MeshHandleSide> = {
  leftHandle: 'rightHandle',
  rightHandle: 'leftHandle',
  topHandle: 'bottomHandle',
  bottomHandle: 'topHandle'
}

export function tryStartMeshDrag(
  editor: Editor,
  sx: number,
  sy: number,
  setDrag: (drag: DragState) => void,
  shiftKey = false
): boolean {
  const edit = editor.state.gradientEdit
  const edited = editedMesh(editor.graph, edit)
  const layout = editedMeshLayout(editor.graph, edit, editor.state)
  if (!edit || !edited || !layout) return false
  const hit = hitTestMeshHandles(layout, { x: sx, y: sy })
  if (!hit) return false
  const originalStop = edit.stop
  const originalPoints = edit.meshPoints
  const previous = originalPoints ?? (originalStop >= 0 ? [originalStop] : [])
  let points = [hit.index]
  if (hit.kind === 'point' && shiftKey)
    points = previous.includes(hit.index)
      ? previous.filter((index) => index !== hit.index)
      : [...previous, hit.index]
  editor.state.gradientEdit = { ...edit, stop: points.at(-1) ?? -1, meshPoints: points }
  editor.requestRepaint()
  if (!points.includes(hit.index)) return true
  const original = structuredClone(edited.paint)
  const preview = editor.beginNodePreview('Edit mesh gradient')
  setDrag({
    type: 'gradient',
    update: (screenX, screenY) => {
      const node = editor.graph.getNode(edited.node.id)
      if (!node || node.width <= 0 || node.height <= 0) return
      const local = createSceneGeometry(editor.graph).screenToLocal(
        node,
        { x: screenX, y: screenY },
        editor.state
      )
      const mesh = original.meshGradient && structuredClone(original.meshGradient)
      if (!local || !mesh) return
      const position = { x: local.x / node.width, y: local.y / node.height }
      const point = mesh.points[hit.index]
      if (hit.kind === 'point') point.position = position
      else {
        const offset = { x: position.x - point.position.x, y: position.y - point.position.y }
        point[hit.side] = offset
        if (editor.state.gradientEdit?.meshMirrored !== false)
          point[OPPOSITE[hit.side]] = { x: -offset.x, y: -offset.y }
      }
      preview.update(node.id, {
        [edit.paint]: node[edit.paint].map((paint, index) =>
          index === edit.index ? { ...original, meshGradient: mesh } : paint
        )
      })
    },
    commit: () => preview.commit(),
    cancel: () => {
      preview.cancel()
      if (editor.state.gradientEdit)
        editor.state.gradientEdit = {
          ...editor.state.gradientEdit,
          stop: originalStop,
          meshPoints: originalPoints
        }
    }
  })
  return true
}
