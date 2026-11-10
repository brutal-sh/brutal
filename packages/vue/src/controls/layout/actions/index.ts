import type { ComputedRef } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useNodePreview } from '#vue/controls/node-preview/use'

import { createAlignmentActions } from './alignment'
import { createAxisSizeActions } from './axis-size'
import { createPropertyActions } from './properties'
import { createSizingActions } from './sizing'
export function createLayoutActions({
  editor,
  node
}: {
  editor: Editor
  node: ComputedRef<SceneNode | null>
}) {
  const preview = useNodePreview(editor)
  const context = { editor, node, preview }
  const properties = createPropertyActions(context)
  const axis = createAxisSizeActions(context)
  const sizing = createSizingActions(context)
  const alignment = createAlignmentActions(context)
  function setLayoutDirection(direction: SceneNode['layoutDirection']) {
    if (!node.value) return
    editor.updateNodeWithUndo(
      node.value.id,
      { layoutDirection: direction },
      'Change layout direction'
    )
  }
  return {
    cancelPreview: preview.cancel,
    ...properties,
    setAxisSizing: sizing.setAxisSizing,
    updateAxisSize: axis.updateAxisSize,
    commitAxisSize: axis.commitAxisSize,
    toggleAspectRatioLock: sizing.toggleAspectRatioLock,
    ...alignment,
    setLayoutDirection
  }
}
