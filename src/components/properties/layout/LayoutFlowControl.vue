<script setup lang="ts">
import { computed } from 'vue'
import type { VNode } from 'vue'

import type { LayoutMode } from '@open-pencil/scene-graph'
import { MIXED } from '@open-pencil/vue/controls/node-props'
import { useSelectionLayout } from '@open-pencil/vue/controls/selection-layout'
import { useI18n } from '@open-pencil/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

defineSlots<{ default?(): VNode[] }>()

const layout = useSelectionLayout()
const { compact = false } = defineProps<{ compact?: boolean }>()
const { panels } = useI18n()

const layoutModes = computed<Array<{ value: LayoutMode; label: string }>>(() => [
  { value: 'NONE', label: panels.value.freeform },
  { value: 'VERTICAL', label: panels.value.layoutVertical },
  { value: 'HORIZONTAL', label: panels.value.layoutHorizontal },
  ...(!compact || layout.containerLayoutMode.value === 'GRID'
    ? [{ value: 'GRID' as const, label: panels.value.layoutGrid }]
    : [])
])

// Layers with different flows leave every option off.
const mode = computed(() => {
  const value = compact ? layout.containerLayoutMode.value : layout.layoutMode.value
  return value === MIXED || value === undefined ? '' : value
})
</script>

<template>
  <div>
    <label v-if="!compact" class="mb-1 block text-[11px] text-muted">{{ panels.flow }}</label>
    <div class="flex items-center gap-1.5">
      <SegmentedControl
        :model-value="mode"
        :options="layoutModes"
        :label="panels.flow"
        :ui="{ root: 'flex min-w-0 flex-1' }"
        @change="layout.setLayoutMode($event as LayoutMode, compact)"
      >
        <template #option="{ option }">
          <Tip :label="option.label">
            <span class="flex items-center justify-center">
              <icon-lucide-layout-grid v-if="option.value === 'NONE' && compact" class="size-3.5" />
              <icon-lucide-move v-else-if="option.value === 'NONE'" class="size-3.5" />
              <icon-lucide-arrow-down-to-line
                v-else-if="option.value === 'VERTICAL'"
                class="size-3.5"
              />
              <icon-lucide-arrow-right-to-line
                v-else-if="option.value === 'HORIZONTAL'"
                class="size-3.5"
              />
              <icon-lucide-layout-grid v-else class="size-3.5" />
            </span>
          </Tip>
        </template>
      </SegmentedControl>
      <slot />
    </div>
  </div>
</template>
