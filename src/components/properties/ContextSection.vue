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
</script>
<template>
  <AppCollapsible
    v-model:open="open"
    label="Context"
    class="border-b border-border px-3"
    :ui="{
      trigger: 'h-[38px] flex-row-reverse justify-between text-[11px]',
      icon: 'rotate-90 group-data-[state=open]:-rotate-90'
    }"
  >
    <AppTextarea
      v-model="draft"
      aria-label="Context information"
      placeholder="Context information"
      :disabled="!getNodeEditCapability(store.graph, nodeId).editable"
      @focus="editingId = nodeId"
      @change="commit"
      @blur="editingId = null"
    />
  </AppCollapsible>
</template>
