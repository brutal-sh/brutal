<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import { useSelectionState } from '@open-pencil/vue/editor/selection-state'
import { useNoteMessages, usePanelMessages } from '@open-pencil/vue/i18n'
import { vTestId } from '@open-pencil/vue/testing'

import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/components/icons'
import CodeExportSection from '@/components/properties/CodeExportSection.vue'
import ContextSection from '@/components/properties/ContextSection.vue'
import EffectsSection from '@/components/properties/EffectsSection.vue'
import ExportSection from '@/components/properties/ExportSection.vue'
import ExportSectionCompact from '@/components/properties/ExportSectionCompact.vue'
import SelectionHeader from '@/components/properties/panel/SelectionHeader.vue'
import PositionSection from '@/components/properties/PositionSection.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelHeader from '@/components/ui/panel/PanelHeader.vue'
import theme from '@/theme/notes'
import designPanelTheme from '@/theme/panel/design'

import NoteAppearance from './NoteAppearance.vue'
import NoteComponentControl from './NoteComponentControl.vue'
import NoteLayout from './NoteLayout.vue'
import NoteSection from './NoteSection.vue'

const {
  ids,
  advanced = true,
  collapsible = false
} = defineProps<{
  ids: readonly string[]
  advanced?: boolean
  collapsible?: boolean
}>()
const collapsed = defineModel<boolean>('collapsed', { default: false })
const { selectedNode: node } = useSelectionState()
const store = useEditorStore()
const panels = usePanelMessages()
const notes = useNoteMessages()
const disabled = computed(() => {
  void store.state.sceneVersion
  return store.state.readOnly || ids.some((id) => !getNodeEditCapability(store.graph, id).editable)
})
const panelStyles = tv(designPanelTheme)
const styles = tv(theme)()
const panelId = computed(() => (ids.length === 1 ? 'design-panel-single' : 'design-panel-multi'))
</script>

<template>
  <div
    v-test-id="panelId"
    :class="panelStyles({ compact: !advanced, collapsed: collapsible && !advanced && collapsed })"
  >
    <SelectionHeader
      v-if="node"
      v-model:collapsed="collapsed"
      :node="node"
      :advanced="advanced"
      :collapsible="collapsible"
    />
    <PanelHeader v-else>
      <template #icon><component :is="toolIcons.NOTE" class="size-3.5" /></template>
      <span role="heading" aria-level="2">{{
        panels.selectedCount({ count: String(ids.length) })
      }}</span>
      <template v-if="collapsible && !advanced" #actions>
        <IconButton
          :label="collapsed ? 'Expand inspector' : 'Collapse inspector'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed"
        >
          <icon-lucide-panel-right-open v-if="collapsed" class="size-3.5" />
          <icon-lucide-panel-right v-else class="size-3.5" />
        </IconButton>
      </template>
    </PanelHeader>
    <fieldset :disabled="disabled" :aria-label="notes.title" :class="styles.fields()">
      <div :class="panelStyles({ compact: !advanced, class: 'contents' })">
        <NoteComponentControl v-if="node" :node="node" :disabled="disabled" />
        <ContextSection v-if="node" :key="node.id" :node-id="node.id" />
        <PositionSection :compact="!advanced" />
        <NoteLayout :multiple="ids.length > 1" />
        <NoteAppearance />
        <NoteSection :ids="ids" />
        <EffectsSection :compact="!advanced" />
      </div>
    </fieldset>
    <CodeExportSection :node-ids="[...ids]" />
    <component :is="advanced ? ExportSection : ExportSectionCompact" />
  </div>
</template>
