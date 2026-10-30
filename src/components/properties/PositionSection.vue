<script setup lang="ts">
import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useI18n } from '@open-pencil/vue/i18n'
import { PositionControlsRoot } from '@open-pencil/vue/primitives/PositionControls'

import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField.vue'
import AlignmentActionsMenu from '@/components/properties/AlignmentActionsMenu.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const { compact = false } = defineProps<{ compact?: boolean }>()
const { panels } = useI18n()
const store = useEditorStore()
const { getCommand } = useEditorCommands()
const canTidy = getCommand('selection.tidyUp').enabled

function alignmentDisabled(ids: string[]) {
  if (!compact || (store.state.nodeEditState?.selectedVertexIndices.size ?? 0) >= 2) return false
  return ids.some((id) => {
    const node = store.graph.getNode(id)
    const parent = node?.parentId ? store.graph.getNode(node.parentId) : undefined
    return (
      !node ||
      !parent ||
      (ids.length === 1 && parent.type === 'CANVAS') ||
      (parent.layoutMode !== 'NONE' && node.layoutPositioning !== 'ABSOLUTE')
    )
  })
}

function handleAlign(
  nodeAlign: (axis: 'horizontal' | 'vertical', pos: 'min' | 'center' | 'max') => void,
  axis: 'horizontal' | 'vertical',
  pos: 'min' | 'center' | 'max'
) {
  const editState = store.state.nodeEditState
  if (editState && editState.selectedVertexIndices.size >= 2) {
    store.nodeEditAlignVertices(axis, pos)
  } else {
    nodeAlign(axis, pos)
  }
}
</script>

<template>
  <PositionControlsRoot
    v-slot="{
      active,
      ids,
      xValue,
      yValue,
      rotationValue,
      rotates,
      inAutoLayout,
      ignoresAutoLayout,
      actions
    }"
  >
    <PanelSection v-if="active" :label="panels.alignment">
      <div
        role="toolbar"
        :aria-label="panels.alignment"
        :class="compact ? 'grid grid-cols-2 gap-1.5' : 'flex justify-between'"
      >
        <div
          class="flex gap-0.5"
          :class="compact ? 'justify-between rounded-md bg-panel-field' : undefined"
        >
          <IconButton
            :label="panels.alignLeft"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'horizontal', 'min')"
            ><icon-lucide-align-start-vertical class="size-3.5"
          /></IconButton>
          <IconButton
            :label="panels.alignCenterHorizontally"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'horizontal', 'center')"
            ><icon-lucide-align-center-vertical class="size-3.5"
          /></IconButton>
          <IconButton
            :label="panels.alignRight"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'horizontal', 'max')"
            ><icon-lucide-align-end-vertical class="size-3.5"
          /></IconButton>
        </div>
        <div
          class="flex gap-0.5"
          :class="compact ? 'justify-between rounded-md bg-panel-field' : undefined"
        >
          <IconButton
            :label="panels.alignTop"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'vertical', 'min')"
            ><icon-lucide-align-start-horizontal class="size-3.5"
          /></IconButton>
          <IconButton
            :label="panels.alignCenterVertically"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'vertical', 'center')"
            ><icon-lucide-align-center-horizontal class="size-3.5"
          /></IconButton>
          <IconButton
            :label="panels.alignBottom"
            size="xs"
            :disabled="alignmentDisabled(ids)"
            @click="handleAlign(actions.align, 'vertical', 'max')"
            ><icon-lucide-align-end-horizontal class="size-3.5"
          /></IconButton>
          <AlignmentActionsMenu v-if="canTidy" />
        </div>
      </div>
    </PanelSection>
    <PanelSection v-if="active" :label="panels.position">
      <template v-if="inAutoLayout && !compact" #actions>
        <IconButton
          :label="panels.ignoreAutoLayout"
          :active="ignoresAutoLayout"
          @click="actions.toggleIgnoreAutoLayout"
        >
          <icon-lucide-scan class="size-3.5" />
        </IconButton>
      </template>
      <PanelGrid :columns="2">
        <Tip :label="panels.xAxis">
          <NumberField
            icon="X"
            data-property="x"
            :aria-label="panels.xAxis"
            :model-value="xValue"
            @update:model-value="actions.updateProp('x', $event)"
            @commit="(v: number, p: number) => actions.commitProp('x', v, p)"
            @cancel="actions.cancelProp('x')"
          />
        </Tip>
        <Tip :label="panels.yAxis">
          <NumberField
            icon="Y"
            data-property="y"
            :aria-label="panels.yAxis"
            :model-value="yValue"
            @update:model-value="actions.updateProp('y', $event)"
            @commit="(v: number, p: number) => actions.commitProp('y', v, p)"
            @cancel="actions.cancelProp('y')"
          />
        </Tip>
      </PanelGrid>

      <PanelGrid v-if="rotates" :columns="2" class="mt-1.5">
        <Tip :label="panels.rotation">
          <NumberField
            suffix="°"
            data-property="rotation"
            :aria-label="panels.rotation"
            :model-value="rotationValue"
            :min="-360"
            :max="360"
            @update:model-value="actions.updateProp('rotation', $event)"
            @commit="(v: number, p: number) => actions.commitProp('rotation', v, p)"
            @cancel="actions.cancelProp('rotation')"
          >
            <template #icon>
              <icon-lucide-rotate-cw class="size-3" />
            </template>
          </NumberField>
        </Tip>
        <div
          class="flex h-6 items-center justify-end gap-0.5"
          :class="compact ? 'rounded-md bg-panel-field' : undefined"
        >
          <IconButton v-if="compact" :label="panels.rotate90" size="xs" @click="actions.rotate(90)">
            <icon-lucide-rotate-cw-square class="size-3.5" />
          </IconButton>
          <IconButton :label="panels.flipHorizontal" size="xs" @click="actions.flip('horizontal')">
            <icon-lucide-flip-horizontal-2 class="size-3.5" />
          </IconButton>
          <IconButton :label="panels.flipVertical" size="xs" @click="actions.flip('vertical')">
            <icon-lucide-flip-vertical-2 class="size-3.5" />
          </IconButton>
          <IconButton
            v-if="!compact"
            :label="panels.rotate90"
            size="xs"
            @click="actions.rotate(90)"
          >
            <icon-lucide-rotate-cw-square class="size-3.5" />
          </IconButton>
        </div>
      </PanelGrid>
      <label
        v-if="compact && inAutoLayout"
        class="mt-2 flex items-center gap-1.5 text-[11px] text-surface"
      >
        <AppCheckbox
          neutral
          ariaLabel="Absolute Position"
          :model-value="ignoresAutoLayout"
          @update:model-value="actions.toggleIgnoreAutoLayout"
        />Absolute Position
      </label>
    </PanelSection>
  </PositionControlsRoot>
</template>
