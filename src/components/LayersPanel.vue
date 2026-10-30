<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'
import { vTestId } from '@open-pencil/vue/testing'

import { useEditorStore } from '@/app/editor/active-store'
import AppMenu from '@/components/shell/AppMenu.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import splitterTheme from '@/theme/splitter'

import AssetsPanel from './assets-panel/AssetsPanel.vue'
import LayerTree from './LayerTree/LayerTree.vue'
import PagesPanel from './PagesPanel.vue'

const { embedded = false } = defineProps<{ embedded?: boolean }>()
const { menu, panels } = useI18n()
const store = useEditorStore()
const hasMultiplePages = useSceneComputed(() => store.graph.getPages().length > 1)
const activePanel = ref<'file' | 'assets'>('file')
const panelModel = computed({
  get: () => activePanel.value,
  set: (value: string) => {
    if (value === 'file' || value === 'assets') activePanel.value = value
  }
})
const panelOptions = computed(() => [
  { value: 'file', label: menu.value.file },
  { value: 'assets', label: panels.value.assets }
])
const panelTabsUI = { root: 'w-full' }
const splitterStyles = tv(splitterTheme)({ direction: 'vertical' })
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel"
    :class="!embedded && 'border-r border-border'"
    style="contain: paint layout style"
  >
    <AppMenu v-if="!embedded" />
    <div v-if="!embedded" class="shrink-0 border-b border-border px-2 py-1.5">
      <SegmentedControl
        v-model="panelModel"
        :options="panelOptions"
        :label="panels.layers"
        :ui="panelTabsUI"
      >
        <template #option="{ option }">
          <span
            v-test-id="option.value === 'file' ? 'left-panel-layers-tab' : 'left-panel-assets-tab'"
            class="truncate"
          >
            {{ option.label }}
          </span>
        </template>
      </SegmentedControl>
    </div>
    <AssetsPanel v-if="activePanel === 'assets'" />
    <LayerTree v-else-if="embedded && !hasMultiplePages" data-test-id="layers-tree" />
    <SplitterGroup
      v-else
      direction="vertical"
      auto-save-id="layers-layout"
      class="flex-1 overflow-hidden"
    >
      <SplitterPanel
        :default-size="30"
        :min-size="10"
        :max-size="60"
        class="flex flex-col overflow-hidden"
      >
        <PagesPanel />
      </SplitterPanel>
      <SplitterResizeHandle :class="splitterStyles.handle()">
        <div :class="splitterStyles.divider()" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="70" :min-size="20" class="flex flex-col overflow-hidden">
        <header
          v-if="!embedded"
          data-test-id="layers-header"
          class="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface"
        >
          {{ panels.layers }}
        </header>
        <LayerTree data-test-id="layers-tree" />
      </SplitterPanel>
    </SplitterGroup>
  </aside>
</template>
