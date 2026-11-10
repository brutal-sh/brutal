import type { SceneNode } from '@open-pencil/scene-graph'
import { withGeneratedFrameSize } from '@open-pencil/scene-graph/generated'
import {
  authoredLayoutSizing,
  authoredLayoutSizingUpdates,
  enforcedAspectRatio,
  sizeKeepingAspectRatio
} from '@open-pencil/scene-graph/layout'

import { sizingAxis, type LayoutAxis } from '#vue/controls/layout/axis'

import type { LayoutActionsContext } from './context'
export function createAxisSizeActions({ editor, node, preview }: LayoutActionsContext) {
  function fixedAxisPatch(n: SceneNode, axis: LayoutAxis, retainFill: boolean): Partial<SceneNode> {
    const sizing = authoredLayoutSizing(editor.graph, n, sizingAxis(axis))
    return sizing === 'FIXED' || (retainFill && sizing === 'FILL')
      ? {}
      : authoredLayoutSizingUpdates(editor.graph, n, sizingAxis(axis), 'FIXED')
  }

  // A locked layer keeps its ratio as either side is typed, as in Figma.
  function updateAxisSize(axis: LayoutAxis, value: number, retainFill = false) {
    const n = node.value
    if (!n) return
    const ratio = enforcedAspectRatio(n)
    if (ratio === null) {
      const sizing = fixedAxisPatch(n, axis, retainFill)
      preview.update(
        [n.id],
        { ...sizing, ...withGeneratedFrameSize({ ...n, ...sizing }, { [axis]: value }) },
        `Change ${axis}`
      )
      return
    }
    const size = sizeKeepingAspectRatio(ratio, axis, value)
    const widthPatch = fixedAxisPatch(n, 'width', retainFill)
    const patch = {
      ...widthPatch,
      ...fixedAxisPatch({ ...n, ...widthPatch }, 'height', retainFill),
      ...size
    }
    preview.update(
      [n.id],
      { ...patch, ...withGeneratedFrameSize({ ...n, ...patch }, size) },
      `Change ${axis}`
    )
  }

  function commitAxisSize(_axis: LayoutAxis, _value: number, _previous: number) {
    preview.commit()
  }
  return { updateAxisSize, commitAxisSize }
}
