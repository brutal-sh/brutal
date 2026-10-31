<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { canCreateInstance } from '@open-pencil/scene-graph/instances'
import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import AssetThumbnail from '@/components/assets-panel/AssetThumbnail.vue'
import AppPicker from '@/components/ui/select/AppPicker.vue'
import theme from '@/theme/select/app'

const {
  nodeId,
  label,
  disabled = false
} = defineProps<{
  nodeId: string
  label: string
  disabled?: boolean
}>()
const value = defineModel<string>({ required: true })
const store = useEditorStore()
const { panels, common } = useI18n()
const styles = tv(theme)()
const items = computed(() => {
  void store.state.sceneVersion
  return [...store.graph.getAllNodes()]
    .filter((node) => node.type === 'COMPONENT' && canCreateInstance(store.graph, node.id, nodeId))
    .map((node) => ({ value: node.id, label: node.name }))
})
const current = computed(() => items.value.find((item) => item.value === value.value))
</script>

<template>
  <AppPicker
    :heading="label"
    :items="items"
    :selected="value"
    layout="cards"
    :search-placeholder="panels.searchInstances"
    :empty-label="panels.noComponentsFound"
    :close-label="common.close"
    @select="!disabled && (value = $event)"
  >
    <template #trigger>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-label="label"
        :disabled="disabled"
        :class="styles.trigger()"
      >
        <span :class="styles.value()">{{ current?.label ?? panels.none }}</span>
        <icon-lucide-chevron-down class="ml-1 size-3 shrink-0 text-muted" />
      </button>
    </template>
    <template #leading="{ item }">
      <AssetThumbnail :node-id="item.value" alt="" :size="96" />
    </template>
  </AppPicker>
</template>
