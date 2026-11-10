import type { ComputedRef } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'

import type { useNodePreview } from '#vue/controls/node-preview/use'
export interface LayoutActionsContext {
  editor: Editor
  node: ComputedRef<SceneNode | null>
  preview: ReturnType<typeof useNodePreview>
}
