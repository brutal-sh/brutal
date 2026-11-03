<script setup lang="ts">
import { computed } from 'vue'

import { MIXED } from '@open-pencil/vue/controls/node-props'
import { useSelectionLayout } from '@open-pencil/vue/controls/selection-layout'
import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useI18n } from '@open-pencil/vue/i18n'
import { PositionControlsRoot } from '@open-pencil/vue/primitives/PositionControls'

import NumberField from '@/components/inputs/NumberField.vue'
import ClipContentControl from '@/components/properties/layout/ClipContentControl.vue'
import LayoutFlowControl from '@/components/properties/layout/LayoutFlowControl.vue'
import TextResizingControl from '@/components/properties/layout/TextResizingControl.vue'
import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

/**
 * Layout of several selected layers, as in Figma: flow when all can hold an auto layout, resizing
 * for the text among them, their sizes, the spacing of a row or column, and clip content for
 * those that can clip.
 */
const layout = useSelectionLayout()
const nodeIds = computed(() => layout.nodes.value.map((node) => node.id))
const { compact = false } = defineProps<{ compact?: boolean }>()
const { getCommand } = useEditorCommands()
const wrapInAutoLayout = getCommand('selection.wrapInAutoLayout')
const { panels } = useI18n()
const flexSelection = computed(
  () =>
    layout.containers.value.length > 0 &&
    layout.containers.value.every((node) => ['VERTICAL', 'HORIZONTAL'].includes(node.layoutMode))
)
</script>

<template>
  <PanelSection
    :label="compact && flexSelection ? 'Flex Layout' : panels.layout"
    data-test-id="selection-layout"
  >
    <template #actions>
      <IconButton
        :label="wrapInAutoLayout.label"
        size="xs"
        :disabled="!wrapInAutoLayout.enabled.value"
        @click="wrapInAutoLayout.run()"
      >
        <icon-lucide-layout-panel-top class="size-3.5" />
      </IconButton>
    </template>

    <LayoutFlowControl
      v-if="(compact ? layout.containerLayoutMode.value : layout.layoutMode.value) !== undefined"
      :compact="compact"
      class="mb-2"
    />
    <TextResizingControl v-if="layout.textResize.value !== undefined" />
    <div
      :class="compact ? 'mb-1 text-[9px] leading-3 text-muted' : 'mt-2 mb-1 text-[11px] text-muted'"
    >
      {{ panels.dimensions }}
    </div>

    <PositionControlsRoot v-slot="{ wValue, hValue, actions }">
      <PanelGrid v-if="nodeIds[0]" :key="JSON.stringify(nodeIds)" :columns="2">
        <Tip :label="panels.width">
          <VariableNumberField
            compact
            :node-id="nodeIds[0]"
            :node-ids="nodeIds"
            binding-path="width"
            icon="W"
            data-property="width"
            :aria-label="panels.width"
            :model-value="wValue"
            :precision="compact ? 2 : undefined"
            :min="1"
            @update:model-value="actions.updateProp('width', $event)"
            @commit="(v: number, p: number) => actions.commitProp('width', v, p)"
            @cancel="actions.cancelProp('width')"
          />
        </Tip>
        <Tip :label="panels.height">
          <VariableNumberField
            compact
            :node-id="nodeIds[0]"
            :node-ids="nodeIds"
            binding-path="height"
            icon="H"
            data-property="height"
            :aria-label="panels.height"
            :model-value="hValue"
            :precision="compact ? 2 : undefined"
            :min="1"
            @update:model-value="actions.updateProp('height', $event)"
            @commit="(v: number, p: number) => actions.commitProp('height', v, p)"
            @cancel="actions.cancelProp('height')"
          />
        </Tip>
      </PanelGrid>
    </PositionControlsRoot>

    <div v-if="compact" class="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-surface">
      <label
        v-for="axis in ['width', 'height'] as const"
        :key="axis"
        class="flex items-center gap-1.5"
      >
        <AppCheckbox
          neutral
          :ariaLabel="axis === 'width' ? 'Fill Width' : 'Fill Height'"
          :model-value="
            (axis === 'width' ? layout.widthSizing.value : layout.heightSizing.value) === MIXED
              ? 'indeterminate'
              : (axis === 'width' ? layout.widthSizing.value : layout.heightSizing.value) === 'FILL'
          "
          :disabled="layout.fillDisabled.value"
          @update:model-value="layout.setAxisSizing(axis, $event ? 'FILL' : 'FIXED')"
        />{{ axis === 'width' ? 'Fill Width' : 'Fill Height' }}
      </label>
      <template v-if="layout.flexContainers.value.length">
        <label
          v-for="axis in ['width', 'height'] as const"
          :key="`hug-${axis}`"
          class="flex items-center gap-1.5"
        >
          <AppCheckbox
            neutral
            :ariaLabel="axis === 'width' ? 'Hug Width' : 'Hug Height'"
            :model-value="
              (axis === 'width' ? layout.widthSizing.value : layout.heightSizing.value) === MIXED
                ? 'indeterminate'
                : (axis === 'width' ? layout.widthSizing.value : layout.heightSizing.value) ===
                  'HUG'
            "
            :disabled="layout.editor.state.readOnly"
            @update:model-value="layout.setAxisSizing(axis, $event === true ? 'HUG' : 'FIXED')"
          />{{ axis === 'width' ? 'Hug Width' : 'Hug Height' }}
        </label>
      </template>
    </div>

    <template v-if="!compact && layout.spacingAxis.value">
      <div class="mt-2 mb-1 text-[11px] text-muted">{{ panels.spacing }}</div>
      <PanelGrid :columns="2">
        <Tip :label="panels.spacing">
          <NumberField
            data-property="selection-spacing"
            :aria-label="panels.spacing"
            :model-value="layout.spacing.value"
            @update:model-value="layout.setSpacing($event)"
            @commit="layout.flushSpacing()"
          >
            <template #icon>
              <icon-lucide-move-horizontal
                v-if="layout.spacingAxis.value === 'horizontal'"
                class="size-3"
              />
              <icon-lucide-move-vertical v-else class="size-3" />
            </template>
          </NumberField>
        </Tip>
      </PanelGrid>
    </template>

    <ClipContentControl v-if="!compact && layout.clipsContent.value !== undefined" />
  </PanelSection>
</template>
