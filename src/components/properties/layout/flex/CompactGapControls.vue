<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { useId } from 'vue'

import { useLayoutControlsContext } from '@open-pencil/vue/primitives/LayoutControls'

import VariableNumberField from '@/components/properties/VariableNumberField.vue'

const ctx = useLayoutControlsContext()
const id = useId()
const modes = [
  { value: 'FIXED', label: 'Fixed gap' },
  { value: 'SPACE_BETWEEN', label: 'Space Between' },
  { value: 'SPACE_AROUND', label: 'Space Around' }
] as const
function setDistribution(value: unknown) {
  if (value === 'FIXED' || value === 'SPACE_BETWEEN' || value === 'SPACE_AROUND')
    ctx.setGapDistribution(value)
}
</script>

<template>
  <div class="text-[11px] text-surface">
    <div class="mb-1.5 text-muted">Gap</div>
    <RadioGroupRoot
      :model-value="ctx.gapDistribution"
      aria-label="Gap distribution"
      class="flex flex-col gap-1"
      @update:model-value="setDistribution"
    >
      <div v-for="mode in modes" :key="mode.value" class="flex h-5 items-center gap-1">
        <RadioGroupItem
          :id="`${id}-${mode.value}`"
          :value="mode.value"
          :aria-label="mode.label"
          class="flex size-3.5 shrink-0 items-center justify-center rounded-full border border-muted/50 outline-none data-[state=checked]:border-surface data-[state=checked]:bg-surface focus-visible:ring-1 focus-visible:ring-panel-focus"
        >
          <span v-if="ctx.gapDistribution === mode.value" class="size-1 rounded-full bg-panel" />
        </RadioGroupItem>
        <VariableNumberField
          v-if="mode.value === 'FIXED'"
          compact
          class="data-[disabled]:text-muted data-[disabled]:opacity-50"
          aria-label="Fixed gap amount"
          :model-value="Math.round(ctx.node.itemSpacing)"
          :min="0"
          :disabled="ctx.gapDistribution !== 'FIXED'"
          :node-id="ctx.node.id"
          binding-path="itemSpacing"
          @update:model-value="ctx.updateProp('itemSpacing', $event)"
          @commit="(value, previous) => ctx.commitProp('itemSpacing', value, previous)"
          @cancel="ctx.cancelPreview"
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
</template>
