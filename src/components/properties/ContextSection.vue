<script setup lang="ts">
import { ref, watch } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

import { useEditorStore } from '@/app/editor/active-store'
import AppCollapsible from '@/components/ui/collapsible/AppCollapsible.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'

const { nodeId } = defineProps<{ nodeId: string }>()
const store = useEditorStore()
const draft = ref('')
const open = ref(
  !!readPluginData(store.graph.getNode(nodeId)?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)
)
const editingId = ref<string | null>(null)
watch(
  () => [nodeId, store.state.sceneVersion],
  () => {
    if (editingId.value) return
    draft.value =
      readPluginData(
        store.graph.getNode(nodeId)?.pluginData,
        OPEN_PENCIL_PLUGIN_DATA.nodeContext
      ) ?? ''
  },
  { immediate: true }
)
function commit(event: Event) {
  const id = editingId.value
  editingId.value = null
  const node = id ? store.graph.getNode(id) : undefined
  if (
    !node ||
    store.state.readOnly ||
    !(event.target instanceof HTMLTextAreaElement) ||
    !getNodeEditCapability(store.graph, node.id).editable
  )
    return
  const value = event.target.value
  if ((readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext) ?? '') === value) return
  store.updateNodeWithUndo(node.id, {
    pluginData: withPluginData(
      node.pluginData,
      OPEN_PENCIL_PLUGIN_DATA.nodeContext,
      value || undefined
    )
  })
}
function stopEditing(event: FocusEvent) {
  editingId.value = null
  if (event.target instanceof HTMLTextAreaElement) event.target.scrollTop = 0
}
</script>
<template>
  <AppCollapsible
    v-model:open="open"
    label="Context"
    data-inspector-section="context"
    class="border-panel-foreground/6 border-b py-2 pr-3.5 pl-4 data-[state=open]:pb-[15px]"
    :ui="{
      trigger:
        'h-[22px] flex-row-reverse justify-between pr-1 text-[11px] font-medium text-panel-foreground',
      icon: 'rotate-90 group-data-[state=open]:-rotate-90',
      content: 'pt-1.5'
    }"
  >
    <AppTextarea
      v-model="draft"
      :rows="2"
      class="field-sizing-content min-h-14 max-h-20 resize! rounded-sm! bg-input/30! px-2! py-[3px]! text-[11px]! leading-4! text-panel-foreground! focus:ring-0! hover:not-focus:border-border!"
      aria-label="Context information"
      placeholder="Context information"
      :disabled="store.state.readOnly || !getNodeEditCapability(store.graph, nodeId).editable"
      @focus="editingId = nodeId"
      @change="commit"
      @blur="stopEditing"
    />
  </AppCollapsible>
</template>
