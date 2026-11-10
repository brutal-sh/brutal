import type { LayoutSizing } from '@open-pencil/scene-graph'
import {
  authoredLayoutSizingUpdates,
  aspectRatioLockEditable,
  lockedAspectRatioTarget
} from '@open-pencil/scene-graph/layout'

import { axisSizingPatchForNode, sizingAxis, type LayoutAxis } from '#vue/controls/layout/axis'

import type { LayoutActionsContext } from './context'
export function createSizingActions({ editor, node, preview }: LayoutActionsContext) {
  function setAxisSizing(axis: LayoutAxis, sizing: LayoutSizing, authored = false) {
    const n = node.value
    if (!n) return
    preview.update(
      [n.id],
      authored
        ? authoredLayoutSizingUpdates(editor.graph, n, sizingAxis(axis), sizing)
        : axisSizingPatchForNode(editor.graph, n, axis, sizing),
      `Set ${axis} sizing`
    )
    preview.commit()
  }

  function toggleAspectRatioLock() {
    const n = node.value
    if (!n || !aspectRatioLockEditable(editor.graph, n)) return
    const locked = n.targetAspectRatio !== null
    editor.updateNodeWithUndo(
      n.id,
      { targetAspectRatio: locked ? null : lockedAspectRatioTarget(n.width, n.height) },
      'Toggle aspect ratio lock'
    )
  }
  return { setAxisSizing, toggleAspectRatioLock }
}
