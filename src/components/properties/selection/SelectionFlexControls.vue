<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed, useId } from 'vue'

import type { useSelectionLayout } from '@open-pencil/vue/controls/selection-layout'
import { useI18n } from '@open-pencil/vue/i18n'

import LayoutAlignmentControl from '@/components/properties/layout/alignment/LayoutAlignmentControl.vue'
import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

const { layout } = defineProps<{ layout: ReturnType<typeof useSelectionLayout> }>()
const { panels } = useI18n()
const id = useId()
const nodeIds = computed(() => layout.containers.value.map((node) => node.id))
const modes = [
  { value: 'FIXED', label: 'Fixed gap' },
  { value: 'SPACE_BETWEEN', label: 'Space Between' },
  { value: 'SPACE_AROUND', label: 'Space Around' }
] as const
const cells = computed(() =>
  layout.flexAlignment.value.map((active, index) => ({
    primary: (['MIN', 'CENTER', 'MAX'] as const)[index % 3],
    counter: (['MIN', 'CENTER', 'MAX'] as const)[Math.floor(index / 3)],
    label: `${[panels.value.alignTop, panels.value.alignCenterVertically, panels.value.alignBottom][Math.floor(index / 3)]}, ${[panels.value.alignLeft, panels.value.alignCenterHorizontally, panels.value.alignRight][index % 3]}`,
    active
  }))
)
const paddingFields = computed(() =>
  layout.individualPadding.value
    ? ([
        { prop: 'paddingLeft', label: 'Left padding', paths: ['paddingLeft'] },
        { prop: 'paddingRight', label: 'Right padding', paths: ['paddingRight'] },
        { prop: 'paddingTop', label: 'Top padding', paths: ['paddingTop'] },
        { prop: 'paddingBottom', label: 'Bottom padding', paths: ['paddingBottom'] }
      ] as const)
    : ([
        { prop: 'paddingTop', label: 'Vertical padding', paths: ['paddingTop', 'paddingBottom'] },
        { prop: 'paddingLeft', label: 'Horizontal padding', paths: ['paddingLeft', 'paddingRight'] }
      ] as const)
)
const paddingVisible = computed(() =>
  layout.containers.value.every(
    (node) => node.layoutMode === 'VERTICAL' || node.layoutMode === 'HORIZONTAL'
  )
)

function distribution(value: unknown) {
  if (value === 'FIXED' || value === 'SPACE_BETWEEN' || value === 'SPACE_AROUND')
    layout.setGapDistribution(value)
}
</script>

<template>
  <fieldset
    v-if="nodeIds[0]"
    :disabled="layout.editor.state.readOnly"
    class="m-0 mb-1.5 min-w-0 border-0 p-0"
  >
    <div class="mt-1.5 grid grid-cols-2 items-start gap-1.5">
      <div>
        <div class="mb-1 text-[9px] leading-3 text-muted">{{ panels.alignment }}</div>
        <LayoutAlignmentControl
          :label="panels.alignment"
          :cells="cells"
          compact
          :direction="layout.containerLayoutMode.value === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL'"
          :distributed="
            layout.gapDistribution.value === 'SPACE_BETWEEN' ||
            layout.gapDistribution.value === 'SPACE_AROUND'
          "
          @select="(_primary, _counter, index) => layout.setFlexAlignment(index)"
        />
      </div>
      <div class="text-surface">
        <div class="mb-1 text-[9px] leading-3 text-muted">Gap</div>
        <RadioGroupRoot
          :model-value="
            typeof layout.gapDistribution.value === 'string' ? layout.gapDistribution.value : ''
          "
          aria-label="Gap distribution"
          class="flex flex-col"
          @update:model-value="distribution"
        >
          <div v-for="mode in modes" :key="mode.value" class="flex h-6 items-center gap-1">
            <RadioGroupItem
              :id="`${id}-${mode.value}`"
              :value="mode.value"
              :aria-label="mode.label"
              class="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-muted/50 outline-none data-[state=checked]:border-surface data-[state=checked]:bg-surface focus-visible:ring-1 focus-visible:ring-panel-focus"
            >
              <span
                v-if="layout.gapDistribution.value === mode.value"
                class="size-1 rounded-full bg-panel"
              />
            </RadioGroupItem>
            <VariableNumberField
              v-if="mode.value === 'FIXED'"
              compact
              class="data-[disabled]:text-muted data-[disabled]:opacity-50"
              aria-label="Fixed gap amount"
              :model-value="layout.containerProp('itemSpacing')"
              :min="0"
              :disabled="layout.gapDistribution.value !== 'FIXED'"
              :node-id="nodeIds[0]"
              :node-ids="nodeIds"
              binding-path="itemSpacing"
              @update:model-value="layout.updateContainers({ itemSpacing: $event })"
              @commit="layout.commitContainers()"
              @before-cancel="layout.rollbackContainers()"
              @cancel="layout.cancelContainers()"
            >
              <template #icon><icon-lucide-between-horizontal-end class="size-3" /></template>
            </VariableNumberField>
            <label
              v-else
              :for="`${id}-${mode.value}`"
              class="whitespace-nowrap text-[10px] font-normal text-muted"
              >{{ mode.label }}</label
            >
          </div>
        </RadioGroupRoot>
      </div>
    </div>
    <template v-if="paddingVisible">
      <div class="mt-1.5 mb-1 text-[9px] leading-3 text-muted">Padding</div>
      <div class="flex items-start gap-1">
        <div class="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
          <VariableNumberField
            v-for="field in paddingFields"
            :key="field.prop"
            compact
            :aria-label="field.label"
            :model-value="layout.containerProp(field.prop)"
            :min="0"
            :node-id="nodeIds[0]"
            :node-ids="nodeIds"
            :binding-path="field.prop"
            :binding-paths="field.paths"
            @update:model-value="
              (value) =>
                layout.updateContainers(
                  Object.fromEntries(field.paths.map((path) => [path, value]))
                )
            "
            @commit="layout.commitContainers()"
            @before-cancel="layout.rollbackContainers()"
            @cancel="layout.cancelContainers()"
          >
            <template #icon>
              <icon-lucide-separator-horizontal
                v-if="field.label === 'Vertical padding'"
                class="size-3.5"
              />
              <icon-lucide-separator-vertical
                v-else-if="field.label === 'Horizontal padding'"
                class="size-3.5"
              />
              <icon-lucide-panel-left v-else-if="field.prop === 'paddingLeft'" class="size-3.5" />
              <icon-lucide-panel-right v-else-if="field.prop === 'paddingRight'" class="size-3.5" />
              <icon-lucide-panel-top v-else-if="field.prop === 'paddingTop'" class="size-3.5" />
              <icon-lucide-panel-bottom v-else class="size-3.5" />
            </template>
          </VariableNumberField>
        </div>
        <IconButton
          :label="panels.individualPadding"
          :active="layout.individualPadding.value"
          class="rounded data-[state=on]:border-transparent data-[state=on]:bg-accent/15 data-[state=on]:text-primary"
          @click="layout.toggleIndividualPadding()"
        >
          <icon-lucide-square class="size-3.5" />
        </IconButton>
      </div>
    </template>
  </fieldset>
</template>
