import { computed, ref, type ComputedRef } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'
import { layoutJustification } from '@open-pencil/scene-graph/layout'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

import { ALIGN_HORIZONTAL, ALIGN_VERTICAL, paddingModeUpdates } from '#vue/controls/layout/helpers'
import { useNodePreview } from '#vue/controls/node-preview/use'
import { MIXED, type MixedValue } from '#vue/controls/node-props/use'

export function shared<T>(values: readonly T[]): MixedValue<T> | undefined {
  if (values.length === 0) return undefined
  const [first] = values
  return values.every((value) => value === first) ? first : MIXED
}

export function createSelectionFlexControls(editor: Editor, containers: ComputedRef<SceneNode[]>) {
  const flexPreview = useNodePreview(editor)
  const paddingEdit = ref(false)
  function containerProp<K extends keyof SceneNode>(key: K): MixedValue<SceneNode[K]> {
    return shared(containers.value.map((node) => node[key])) ?? MIXED
  }
  const gapDistribution = computed(
    () =>
      shared(
        containers.value.map((node) => {
          const alignment = layoutJustification(node)
          return alignment === 'SPACE_AROUND' || alignment === 'SPACE_BETWEEN' ? alignment : 'FIXED'
        })
      ) ?? MIXED
  )
  const individualPadding = computed(
    () =>
      paddingEdit.value ||
      containers.value.some(
        (node) =>
          node.paddingLeft !== node.paddingRight ||
          node.paddingTop !== node.paddingBottom ||
          readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.paddingMode) === 'INDIVIDUAL'
      )
  )
  function updateContainers(
    changes: Partial<SceneNode> | ((node: SceneNode) => Partial<SceneNode>)
  ) {
    // Keep the active side field mounted until its value and binding transaction settle.
    if (individualPadding.value) paddingEdit.value = true
    flexPreview.update(
      containers.value.map((node) => node.id),
      (id) => {
        const node = editor.graph.getNode(id)
        return node ? (typeof changes === 'function' ? changes(node) : changes) : {}
      },
      'Change layout'
    )
  }
  function commitContainers() {
    flexPreview.commit()
    paddingEdit.value = false
  }
  function cancelContainers() {
    flexPreview.cancel()
    paddingEdit.value = false
  }
  const flexAlignment = computed(() =>
    Array.from(
      { length: 9 },
      (_, index) =>
        containers.value.length > 0 &&
        containers.value.every((node) => {
          const cell = (node.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL)[index]
          const justification = layoutJustification(node)
          return (
            node.counterAxisAlign === cell.counter &&
            (justification === 'SPACE_BETWEEN' ||
              justification === 'SPACE_AROUND' ||
              node.primaryAxisAlign === cell.primary)
          )
        })
    )
  )
  function setFlexAlignment(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > 8) return
    updateContainers((node) => {
      const cell = (node.layoutMode === 'VERTICAL' ? ALIGN_VERTICAL : ALIGN_HORIZONTAL)[index]
      const justification = layoutJustification(node)
      return {
        primaryAxisAlign:
          justification === 'SPACE_BETWEEN' || justification === 'SPACE_AROUND'
            ? node.primaryAxisAlign
            : cell.primary,
        counterAxisAlign: cell.counter
      }
    })
    commitContainers()
  }
  function setGapDistribution(mode: 'FIXED' | 'SPACE_BETWEEN' | 'SPACE_AROUND') {
    updateContainers((node) => ({
      primaryAxisAlign: mode === 'SPACE_BETWEEN' ? 'SPACE_BETWEEN' : 'MIN',
      pluginData: withPluginData(
        node.pluginData,
        OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution,
        mode === 'SPACE_AROUND' ? 'SPACE_AROUND' : undefined
      )
    }))
    commitContainers()
  }
  function toggleIndividualPadding() {
    const collapsing = individualPadding.value
    updateContainers((node) => paddingModeUpdates(node, collapsing))
    commitContainers()
  }
  return {
    containerProp,
    gapDistribution,
    individualPadding,
    updateContainers,
    commitContainers,
    cancelContainers,
    rollbackContainers: flexPreview.rollback,
    flexAlignment,
    setFlexAlignment,
    setGapDistribution,
    toggleIndividualPadding
  }
}
