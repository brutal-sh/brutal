<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import {
  layerResizes,
  layerStrokesAndEffects,
  noteOfNode
} from '@open-pencil/scene-graph/generated'
import { readIcon } from '@open-pencil/scene-graph/icons'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useEditorEvent } from '@open-pencil/vue/editor/events'
import { useSelectionState } from '@open-pencil/vue/editor/selection-state'
import { useI18n } from '@open-pencil/vue/i18n'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'
import { openVariablesDialog } from '@/app/editor/tokens/dialog'
import { COMPONENT_TYPES } from '@/components/icons'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelHeader from '@/components/ui/panel/PanelHeader.vue'
import designPanelTheme from '@/theme/panel/design'

import AppearanceSection from './properties/AppearanceSection.vue'
import CodeExportSection from './properties/CodeExportSection.vue'
import BehaviourPanel from './properties/component-properties/behaviour/BehaviourPanel.vue'
import ComponentPropertiesSection from './properties/component-properties/ComponentPropertiesSection.vue'
import ComponentPropertyListSection from './properties/component-properties/ComponentPropertyListSection.vue'
import SlotAuthoringSection from './properties/component-properties/slot/SlotAuthoringSection.vue'
import VariantAuthoringSection from './properties/component-properties/variant/VariantAuthoringSection.vue'
import ConnectorSection from './properties/connector/ConnectorSection.vue'
import ConstraintsSection from './properties/constraints/ConstraintsSection.vue'
import ContextSection from './properties/ContextSection.vue'
import DocumentSection from './properties/DocumentSection.vue'
import EffectsSection from './properties/EffectsSection.vue'
import ExportSection from './properties/ExportSection.vue'
import ExportSectionCompact from './properties/ExportSectionCompact.vue'
import FillSection from './properties/FillSection.vue'
import FramePresetSelect from './properties/frame-presets/FramePresetSelect.vue'
import FramePresetsSection from './properties/frame-presets/FramePresetsSection.vue'
import IconSection from './properties/IconSection.vue'
import LayoutGridSection from './properties/layout/guides/LayoutGridSection.vue'
import LayoutSection from './properties/layout/LayoutSection.vue'
import MaskSection from './properties/MaskSection.vue'
import NoteProperties from './properties/notes/NoteProperties.vue'
import PageSection from './properties/PageSection.vue'
import RetainedPanel from './properties/panel/RetainedPanel.vue'
import SelectionHeader from './properties/panel/SelectionHeader.vue'
import PositionSection from './properties/PositionSection.vue'
import ScriptSection from './properties/script/ScriptSection.vue'
import SelectionColorsSection from './properties/selection/SelectionColorsSection.vue'
import SelectionLayoutSection from './properties/selection/SelectionLayoutSection.vue'
import SelectionActionsControl from './properties/SelectionActionsControl.vue'
import ShapeWithTextSection from './properties/shape-with-text/ShapeWithTextSection.vue'
import StatusesSection from './properties/status/StatusesSection.vue'
import StatusSection from './properties/status/StatusSection.vue'
import StickySection from './properties/sticky/StickySection.vue'
import StrokeSection from './properties/stroke/StrokeSection.vue'
import TextContentSection from './properties/text-content/TextContentSection.vue'
import TypographySection from './properties/TypographySection.vue'
import VariablesSection from './properties/VariablesSection.vue'

const store = useEditorStore()
const { advanced = true, collapsible = false } = defineProps<{
  advanced?: boolean
  collapsible?: boolean
}>()
const collapsed = defineModel<boolean>('collapsed', { default: false })
const activeTool = computed(() => store.state.activeTool)
const { selectedNode: node, selectedCount: multiCount, selectedIds } = useSelectionState()
const noteRevision = ref(0)
useEditorEvent('graph:replaced', () => {
  noteRevision.value++
})
const noteIds = useSceneComputed(() => {
  const nodes = store.getSelectedNodes()
  return nodes.length > 0 && nodes.every((selected) => noteOfNode(selected))
    ? nodes.map((selected) => selected.id)
    : []
})
const showBooleanOperations = computed(() => multiCount.value >= 2)
const { getCommand } = useEditorCommands()
const createComponent = getCommand('selection.createComponent')
const isComponentType = computed(() => {
  const type = node.value?.type
  return type ? COMPONENT_TYPES.has(type) : false
})
// A library's components are edited in the library, so Add variant has nothing to change here.
const canAddVariant = computed(
  () => !!node.value && getNodeEditCapability(store.graph, node.value.id).editable
)
const LAYOUT_GUIDE_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'])
// Figma offers layout guides while every selected layer is a frame.
const supportsLayoutGuides = useSceneComputed(() => {
  const nodes = store.getSelectedNodes()
  return nodes.length > 0 && nodes.every((selected) => LAYOUT_GUIDE_TYPES.has(selected.type))
})
// A sticky note has no strokes or effects, so a selection holding one offers neither.
const strokesAndEffects = useSceneComputed(() =>
  store.getSelectedNodes().every((selected) => layerStrokesAndEffects(selected))
)
const { panels } = useI18n()
const panelStyles = tv(designPanelTheme)
</script>

<template>
  <!-- Frame tool presets replace selection properties, matching Figma. -->
  <div
    v-if="activeTool === 'FRAME'"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <FramePresetsSection />
  </div>

  <!-- Multi-select summary -->
  <NoteProperties
    v-else-if="noteIds.length > 0"
    :key="JSON.stringify([noteRevision, ...noteIds])"
    v-model:collapsed="collapsed"
    :ids="noteIds"
    :advanced="advanced"
    :collapsible="collapsible"
  />

  <div
    v-else-if="multiCount > 1"
    data-test-id="design-panel-multi"
    :class="panelStyles({ compact: !advanced, collapsed: collapsible && !advanced && collapsed })"
  >
    <PanelHeader
      :ui="
        advanced
          ? undefined
          : {
              root: 'grid-cols-[24px_minmax(0,1fr)_auto] gap-0 pl-3!',
              icon: 'w-6',
              title: 'mr-2 text-[11px] font-normal text-muted'
            }
      "
    >
      <template #icon>
        <icon-lucide-layers-3 v-if="advanced" class="size-3.5" aria-hidden="true" />
        <icon-lucide-copy v-else class="size-3.5" aria-hidden="true" />
      </template>
      <span role="heading" aria-level="2">
        {{ panels.selectedCount({ count: String(multiCount) }) }}
      </span>
      <template #actions>
        <SelectionActionsControl v-if="advanced" :show-boolean-operations="showBooleanOperations" />
        <IconButton
          v-if="collapsible && !advanced"
          :label="collapsed ? 'Expand inspector' : 'Collapse inspector'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed"
        >
          <icon-lucide-panel-right-open v-if="collapsed" class="size-3.5" />
          <icon-lucide-panel-right v-else class="size-3.5" />
        </IconButton>
      </template>
    </PanelHeader>
    <StatusSection v-if="advanced" />
    <ComponentPropertiesSection />
    <PositionSection :compact="!advanced" />
    <ConstraintsSection v-if="advanced" />
    <SelectionLayoutSection :compact="!advanced" />
    <AppearanceSection :compact="!advanced" />
    <TypographySection />
    <FillSection :compact="!advanced" />
    <template v-if="strokesAndEffects">
      <StrokeSection :compact="!advanced" />
      <EffectsSection :compact="!advanced" />
    </template>
    <SelectionColorsSection v-if="advanced" />
    <LayoutGridSection v-if="advanced && supportsLayoutGuides" />
    <CodeExportSection :node-ids="[...selectedIds]" />
    <component :is="advanced ? ExportSection : ExportSectionCompact" />
  </div>

  <!-- Single selection: retain one paused subtree while frame presets are shown. -->
  <RetainedPanel
    :active="activeTool !== 'FRAME' && multiCount === 1 && !!node && noteIds.length === 0"
  >
    <div
      v-if="node"
      data-test-id="design-panel-single"
      :class="panelStyles({ compact: !advanced, collapsed: collapsible && !advanced && collapsed })"
    >
      <SelectionHeader
        v-model:collapsed="collapsed"
        :node="node"
        :advanced="advanced"
        :collapsible="collapsible"
      />

      <div
        v-if="node.type === 'COMPONENT' && scriptOfNode(node)"
        data-slot="selection-action"
        class="border-b border-border px-3 pb-2"
      >
        <AppButton
          variant="soft"
          size="xs"
          class="w-full justify-center font-normal"
          :disabled="!canAddVariant"
          @click="store.detachScriptComponent(node.id)"
        >
          <icon-lucide-unlink class="size-3.5" />Detach Component
        </AppButton>
      </div>
      <div
        v-else-if="!isComponentType"
        data-slot="selection-action"
        class="border-b border-border px-3 pb-2"
      >
        <AppButton
          variant="soft"
          size="xs"
          class="w-full justify-center font-normal"
          :disabled="!createComponent.enabled.value"
          @click="createComponent.run()"
          ><icon-lucide-diamond-plus class="size-3.5" />Create Component</AppButton
        >
      </div>

      <TextContentSection v-if="node.type === 'TEXT'" :node-id="node.id" />
      <StatusSection v-if="advanced" />
      <ComponentPropertiesSection v-if="node.type === 'INSTANCE' && !scriptOfNode(node)" />
      <VariantAuthoringSection
        v-if="
          node.type === 'COMPONENT_SET' ||
          (node.type === 'COMPONENT' &&
            node.parentId &&
            store.graph.getNode(node.parentId)?.type === 'COMPONENT_SET')
        "
      />

      <ComponentPropertyListSection v-if="!scriptOfNode(node)" />
      <SlotAuthoringSection v-if="!scriptOfNode(node)" />
      <ContextSection :key="node.id" :node-id="node.id" />
      <BehaviourPanel
        v-if="(node.type === 'COMPONENT' && !scriptOfNode(node)) || node.type === 'COMPONENT_SET'"
      />

      <!-- Presets size artboards; an icon is a glyph. -->
      <FramePresetSelect v-if="advanced && node.type === 'FRAME' && !readIcon(node)" />

      <IconSection v-if="advanced" />
      <StickySection />
      <ShapeWithTextSection />
      <ConnectorSection />
      <!-- A connector is placed and shaped by its ends, and styled by its line. -->
      <template v-if="node.type !== 'CONNECTOR'">
        <PositionSection :compact="!advanced" />
        <ConstraintsSection v-if="advanced" />
        <!-- A sticky note's size follows its text and its scale; Figma leaves W and H read-only. -->
        <LayoutSection v-if="layerResizes(node)" :compact="!advanced" />
      </template>
      <AppearanceSection :compact="!advanced" />
      <ScriptSection v-if="scriptOfNode(node)" :key="node.id" :node-id="node.id" />
      <template v-if="node.type !== 'CONNECTOR'">
        <MaskSection />
        <!-- A shape with text's typography is its label's, as in Figma. -->
        <TypographySection v-if="node.type === 'TEXT' || node.type === 'SHAPE_WITH_TEXT'" />
        <FillSection v-if="!scriptOfNode(node)" :compact="!advanced" />
        <IconSection v-if="!advanced" compact />
        <template v-if="strokesAndEffects">
          <StrokeSection
            v-if="!scriptOfNode(node) && (advanced || !readIcon(node))"
            :compact="!advanced"
          />
          <EffectsSection :compact="!advanced" />
        </template>
      </template>
      <SelectionColorsSection v-if="advanced" />
      <LayoutGridSection v-if="advanced && supportsLayoutGuides" />

      <CodeExportSection :node-ids="[node.id]" />
      <component :is="advanced ? ExportSection : ExportSectionCompact" />
    </div>
  </RetainedPanel>

  <div
    v-if="activeTool !== 'FRAME' && multiCount <= 1 && !node"
    data-test-id="design-panel-empty"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <PageSection />
    <VariablesSection @open-dialog="openVariablesDialog(store)" />
    <StatusesSection />
    <DocumentSection />
    <ExportSection v-if="advanced" />
  </div>
</template>
