import { computed, ref, toValue } from 'vue'

import { createAppearanceActions, createAppearanceState } from '#vue/controls/appearance/helpers'
import type { AppearanceOptions } from '#vue/controls/appearance/types'
import { useNodeProps } from '#vue/controls/node-props/use'
import { useEditor } from '#vue/editor/context'

/**
 * Returns appearance-related state and actions for the current selection.
 *
 * Use this composable for visibility, opacity, and corner-radius controls in
 * property panels.
 */
export function useAppearance(options: AppearanceOptions = {}) {
  const editor = useEditor()
  const { nodes, node, active, isMulti, merged, updateProp, commitProp } = useNodeProps()

  const expandedCornerNodeId = ref<string | null>(null)
  const cornerFieldsExpanded = ref(false)
  const manualCornerExpansion = computed(() => toValue(options.cornerExpansion) === 'manual')
  const stateOptions = {
    node,
    nodes,
    isMulti,
    merged,
    expandedCornerNodeId,
    cornerFieldsExpanded,
    manualCornerExpansion
  }
  const appearanceState = createAppearanceState(stateOptions)
  const appearanceActions = createAppearanceActions({ editor, ...stateOptions })

  return {
    editor,
    nodes,
    node,
    active,
    isMulti,
    ...appearanceState,
    updateProp,
    commitProp,
    ...appearanceActions
  }
}
