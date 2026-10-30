import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  createSceneGeometry,
  meshHandleLayout,
  type RotationPreview,
  type ViewportTransform
} from '#core/geometry'

import type { GradientEdit } from './types'

export function editedMesh(graph: SceneGraph, edit: GradientEdit | null | undefined) {
  if (!edit) return null
  const node = graph.getNode(edit.nodeId)
  const paint = node?.[edit.paint][edit.index]
  if (!node || paint?.type !== 'GRADIENT_MESH' || !paint.meshGradient) return null
  return { node, paint, mesh: paint.meshGradient }
}

export function editedMeshLayout(
  graph: SceneGraph,
  edit: GradientEdit | null | undefined,
  viewport: ViewportTransform,
  preview?: RotationPreview | null
) {
  const edited = editedMesh(graph, edit)
  if (!edited || !edit) return null
  const geometry = createSceneGeometry(graph, preview)
  return meshHandleLayout(
    edited.mesh,
    edited.node.width,
    edited.node.height,
    (local) => geometry.toScreen(edited.node, local, viewport),
    edit.stop
  )
}
