<script setup lang="ts">
import { useI18n } from '@open-pencil/vue/i18n'
import { inputNumberValue } from '@open-pencil/vue/shared/dom-events'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const ctx = useColorPickerPanelContext()
const { panels } = useI18n()
</script>

<template>
  <div
    class="grid"
    :class="
      ctx.compact
        ? 'grid-cols-4 gap-1'
        : 'grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border'
    "
  >
    <input
      type="number"
      :aria-label="panels.red"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.rgbColor.r)"
      min="0"
      max="255"
      @change="ctx.updateRGBChannelValue('r', inputNumberValue($event))"
    />
    <input
      type="number"
      :aria-label="panels.green"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.rgbColor.g)"
      min="0"
      max="255"
      @change="ctx.updateRGBChannelValue('g', inputNumberValue($event))"
    />
    <input
      type="number"
      :aria-label="panels.blue"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.rgbColor.b)"
      min="0"
      max="255"
      @change="ctx.updateRGBChannelValue('b', inputNumberValue($event))"
    />
    <input
      v-if="ctx.compact"
      type="number"
      :aria-label="panels.alpha"
      class="min-w-0 rounded bg-input px-2 py-1 text-xs text-surface outline-none"
      :value="Number(ctx.color.a.toFixed(2))"
      min="0"
      max="1"
      step="0.01"
      @change="ctx.updateRGBAAlpha(inputNumberValue($event))"
    />
  </div>
</template>
