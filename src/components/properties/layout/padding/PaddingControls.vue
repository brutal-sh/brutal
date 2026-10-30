<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'
import { useLayoutControlsContext } from '@open-pencil/vue/primitives/LayoutControls'

import type { PaddingProp } from '@/components/properties/layout/types'
import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

const ctx = useLayoutControlsContext()
const { compact = false } = defineProps<{ compact?: boolean }>()
const { panels } = useI18n()

const paddingSides: Array<{ prop: PaddingProp; icon: string }> = [
  { prop: 'paddingTop', icon: 'top' },
  { prop: 'paddingRight', icon: 'right' },
  { prop: 'paddingBottom', icon: 'bottom' },
  { prop: 'paddingLeft', icon: 'left' }
]
const displayedSides = computed(() =>
  compact ? [paddingSides[3], paddingSides[1], paddingSides[0], paddingSides[2]] : paddingSides
)
</script>

<template>
  <div v-if="compact" class="mt-1.5 text-[11px] text-muted">Padding</div>
  <div class="flex items-start gap-1.5">
    <div class="min-w-0 flex-1">
      <div
        v-if="!ctx.showIndividualPadding && ctx.hasSymmetricPadding"
        class="mt-1.5 grid grid-cols-2 gap-1.5"
      >
        <VariableNumberField
          data-test-id="layout-horizontal-padding-input"
          :compact="compact"
          aria-label="Horizontal padding"
          :class="compact ? 'order-2' : undefined"
          :model-value="Math.round(ctx.node.paddingLeft)"
          :min="0"
          :node-id="ctx.node.id"
          binding-path="paddingLeft"
          @update:model-value="ctx.setHorizontalPadding"
          @commit="ctx.commitHorizontalPadding"
          @cancel="ctx.cancelPreview"
        >
          <template #icon>
            <icon-lucide-separator-vertical class="size-3.5" />
          </template>
        </VariableNumberField>
        <VariableNumberField
          data-test-id="layout-vertical-padding-input"
          :compact="compact"
          aria-label="Vertical padding"
          :model-value="Math.round(ctx.node.paddingTop)"
          :min="0"
          :node-id="ctx.node.id"
          binding-path="paddingTop"
          @update:model-value="ctx.setVerticalPadding"
          @commit="ctx.commitVerticalPadding"
          @cancel="ctx.cancelPreview"
        >
          <template #icon>
            <icon-lucide-separator-horizontal class="size-3.5" />
          </template>
        </VariableNumberField>
      </div>

      <div v-else-if="ctx.isGrid || ctx.isFlex" class="mt-1.5 grid grid-cols-2 gap-1.5">
        <VariableNumberField
          v-for="side in displayedSides"
          :key="side.prop"
          :compact="compact"
          :model-value="Math.round(ctx.node[side.prop])"
          :min="0"
          :node-id="ctx.node.id"
          :binding-path="side.prop"
          @update:model-value="ctx.updateProp(side.prop, $event)"
          @commit="(v: number, p: number) => ctx.commitProp(side.prop, v, p)"
          @cancel="ctx.cancelPreview"
        >
          <template #icon>
            <icon-lucide-panel-top v-if="side.icon === 'top'" class="size-3.5" />
            <icon-lucide-panel-right v-else-if="side.icon === 'right'" class="size-3.5" />
            <icon-lucide-panel-bottom v-else-if="side.icon === 'bottom'" class="size-3.5" />
            <icon-lucide-panel-left v-else class="size-3.5" />
          </template>
        </VariableNumberField>
      </div>
    </div>
    <IconButton
      v-if="ctx.isFlex || ctx.isGrid"
      :label="panels.individualPadding"
      :active="ctx.showIndividualPadding"
      class="mt-1.5"
      :class="
        compact
          ? 'rounded data-[state=on]:border-transparent data-[state=on]:bg-accent/15 data-[state=on]:text-primary'
          : undefined
      "
      @click="ctx.toggleIndividualPadding"
    >
      <icon-lucide-square v-if="compact" class="size-3.5" />
      <icon-lucide-scan v-else class="size-3.5" />
    </IconButton>
  </div>
</template>
