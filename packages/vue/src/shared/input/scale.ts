import type { Editor } from '@open-pencil/core'
import { createSceneGeometry, type HandlePosition } from '@open-pencil/core/geometry'
import { canRescaleNode } from '@open-pencil/scene-graph/scaling'

import { getHitHandleByMatrix } from './geometry'
import type { DragScale } from './types'

const OPPOSITE_HANDLE: Record<HandlePosition, HandlePosition> = {
  nw: 'se',
  n: 's',
  ne: 'sw',
  e: 'w',
  se: 'nw',
  s: 'n',
  sw: 'ne',
  w: 'e'
}

/** A uniform scale around the opposite handle, including all selected layers' contents. */
export function tryStartScale(cx: number, cy: number, editor: Editor): DragScale | null {
  const ids = [...editor.state.selectedIds]
  if (
    ids.some((id) => {
      const node = editor.graph.getNode(id)
      return !node || node.locked || !canRescaleNode(node)
    })
  )
    return null
  const geometry = createSceneGeometry(editor.graph, editor.state.rotationPreview)
  for (const id of ids) {
    const node = editor.graph.getNode(id)
    if (!node) continue
    const hit = getHitHandleByMatrix(
      cx,
      cy,
      node,
      editor.graph,
      editor.renderer?.zoom,
      editor.state.rotationPreview
    )
    if (!hit) continue
    const handles = geometry.handles(node)
    const anchor = handles[OPPOSITE_HANDLE[hit.handle]]
    const handle = handles[hit.handle]
    const dx = handle.x - anchor.x
    const dy = handle.y - anchor.y
    const lengthSquared = dx * dx + dy * dy
    if (lengthSquared === 0) continue
    const preview = editor.beginScaleNodes(ids, anchor)
    return {
      type: 'scale',
      move(x, y) {
        preview.update(Math.max(0.01, 1 + ((x - cx) * dx + (y - cy) * dy) / lengthSquared))
      },
      commit: () => preview.commit(),
      cancel: () => preview.cancel()
    }
  }
  return null
}
