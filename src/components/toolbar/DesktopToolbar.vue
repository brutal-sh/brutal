<script setup lang="ts">
import { ToolbarRoot } from 'reka-ui'
import { tv } from 'tailwind-variants'

import type { EditorToolDef, Tool } from '@open-pencil/core'
import {
  getToolbarToolSelection,
  isToolbarToolActive,
  ToolbarItem
} from '@open-pencil/vue/primitives/Toolbar'
import { toolbarToolTestId } from '@open-pencil/vue/testing'

import type { ToolbarAction, ToolbarItem as ToolbarLayoutItem } from '@/app/editor/toolbar/layout'
import { toolTip } from '@/app/editor/toolbar/shortcuts'
import ShapeToolButton from '@/components/toolbar/ShapeToolButton.vue'
import ToolButton from '@/components/toolbar/ToolButton.vue'
import ToolFlyout from '@/components/toolbar/ToolFlyout.vue'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'
import toolbarTheme from '@/theme/toolbar'

const styles = tv(toolbarTheme)()

const { items, activeTool, flyoutSelections, toolIcons, toolLabels, toolShortcuts, ui } =
  defineProps<{
    items: ToolbarLayoutItem[]
    activeTool: Tool
    flyoutSelections: ReadonlyMap<Tool, Tool>
    toolIcons: ToolIconMap
    toolLabels: ToolLabels
    toolShortcuts: Readonly<Record<Tool, string>>
    ui?: ToolbarUI
  }>()

const emit = defineEmits<{
  setTool: [tool: Tool]
}>()

/** The tool a flyout's button shows: the active one if it is in the flyout, else the last used. */
function selectedTool(tool: EditorToolDef) {
  return getToolbarToolSelection(tool, activeTool, flyoutSelections)
}

defineSlots<{
  /** A button that runs a command, such as placing an icon, rather than picking a tool. */
  action(props: { action: ToolbarAction }): unknown
  /** Additional desktop commands participate in the rail's keyboard navigation. */
  end?(): unknown
  afterTool?(props: { tool: Tool }): unknown
  /** Commands outside the tool rail, such as the application menu. */
  after?(): unknown
}>()
</script>

<template>
  <div data-canvas-obstacle :class="styles.desktopRoot()">
    <ToolbarRoot data-test-id="toolbar" orientation="vertical" :class="styles.desktopRail()">
      <template v-for="item in items" :key="item.kind === 'tool' ? item.tool.key : item.action">
        <slot v-if="item.kind === 'action'" name="action" :action="item.action" />

        <ShapeToolButton v-else-if="item.tool.key === 'SHAPE_WITH_TEXT'" :ui="ui" />

        <Tip
          v-else-if="item.tool.flyout"
          side="right"
          :label="
            toolTip(toolLabels[selectedTool(item.tool)], toolShortcuts[selectedTool(item.tool)])
          "
        >
          <ToolFlyout
            :tool="item.tool"
            :active-tool="activeTool"
            :selected-tool="selectedTool(item.tool)"
            :tool-icons="toolIcons"
            :tool-labels="toolLabels"
            :tool-shortcuts="toolShortcuts"
            :ui="ui"
            @select="emit('setTool', $event)"
          />
        </Tip>

        <ToolbarItem v-else v-slot="{ active, actions }" :tool="item.tool.key">
          <Tip
            :label="toolTip(toolLabels[item.tool.key], toolShortcuts[item.tool.key])"
            side="right"
          >
            <ToolButton
              :data-test-id="toolbarToolTestId(item.tool.key)"
              :icon="toolIcons[item.tool.key]"
              :label="toolLabels[item.tool.key]"
              :active="active || isToolbarToolActive(item.tool, activeTool)"
              :ui="ui"
              @click="actions.select"
            />
          </Tip>
        </ToolbarItem>
        <slot v-if="item.kind === 'tool'" name="afterTool" :tool="item.tool.key" />
      </template>
      <slot name="end" />
    </ToolbarRoot>
    <slot name="after" />
  </div>
</template>
