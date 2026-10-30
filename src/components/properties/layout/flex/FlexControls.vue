<script setup lang="ts">
import { computed } from 'vue'

import type { LayoutDirection } from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/vue/i18n'
import { useLayoutControlsContext } from '@open-pencil/vue/primitives/LayoutControls'

import AppSelect from '@/components/ui/select/AppSelect.vue'

import LayoutAlignmentControl from '../alignment/LayoutAlignmentControl.vue'
import ClipContentControl from '../ClipContentControl.vue'
import PaddingControls from '../padding/PaddingControls.vue'
import CompactGapControls from './CompactGapControls.vue'
import FlexGapField from './FlexGapField.vue'

const ctx = useLayoutControlsContext()
const { compact = false } = defineProps<{ compact?: boolean }>()
const { panels } = useI18n()
const alignmentCells = computed(() => {
  const horizontal = [
    panels.value.alignLeft,
    panels.value.alignCenterHorizontally,
    panels.value.alignRight
  ]
  const vertical = [
    panels.value.alignTop,
    panels.value.alignCenterVertically,
    panels.value.alignBottom
  ]
  return ctx.alignGrid.map((cell, index) => ({
    ...cell,
    label: `${vertical[Math.floor(index / 3)]}, ${horizontal[index % 3]}`,
    active:
      (ctx.gapDistribution !== 'FIXED' || ctx.node.primaryAxisAlign === cell.primary) &&
      ctx.node.counterAxisAlign === cell.counter
  }))
})
</script>

<template>
  <div v-if="!compact" class="mt-2">
    <label class="mb-1 block text-[11px] text-muted">{{ panels.direction }}</label>
    <AppSelect
      :label="panels.direction"
      :model-value="ctx.layoutDirection"
      :options="[
        { value: 'AUTO', label: panels.auto },
        { value: 'LTR', label: 'LTR' },
        { value: 'RTL', label: 'RTL' }
      ]"
      @update:model-value="ctx.setLayoutDirection($event as LayoutDirection)"
    />
  </div>
  <div
    :class="[
      'mt-2 grid items-start',
      compact ? 'grid-cols-2 gap-1.5' : 'grid-cols-[78px_minmax(0,1fr)] gap-3'
    ]"
  >
    <div>
      <div v-if="compact" class="mb-1.5 text-[11px] text-muted">{{ panels.alignment }}</div>
      <LayoutAlignmentControl
        data-test-id="layout-alignment-grid"
        :label="panels.alignment"
        :cells="alignmentCells"
        :ui="
          compact
            ? {
                grid: 'w-full gap-0 rounded-md p-0',
                cell: 'group h-6 w-full rounded-none bg-transparent',
                dot:
                  ctx.node.layoutMode === 'VERTICAL'
                    ? 'size-0.5 rounded-none group-data-active:h-px group-data-active:w-2'
                    : 'size-0.5 rounded-none group-data-active:h-2 group-data-active:w-px'
              }
            : undefined
        "
        @select="
          (primary, counter) =>
            ctx.setAlignment(
              ctx.gapAuto ? 'SPACE_BETWEEN' : primary,
              counter,
              ctx.gapDistribution === 'SPACE_AROUND'
            )
        "
      />
    </div>
    <div class="flex min-w-0 flex-col gap-1.5">
      <CompactGapControls v-if="compact" />
      <FlexGapField v-else />
      <FlexGapField v-if="ctx.node.layoutWrap === 'WRAP'" axis="counter" />
    </div>
  </div>
  <PaddingControls :compact="compact" />
  <ClipContentControl v-if="!compact" />
</template>
