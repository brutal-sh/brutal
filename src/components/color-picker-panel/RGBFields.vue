<script setup lang="ts">
import { useI18n } from '@open-pencil/vue/i18n'

import ColorPickerPanelNumberField from '@/components/color-picker-panel/ColorPickerPanelNumberField.vue'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const ctx = useColorPickerPanelContext()
const { panels } = useI18n()
</script>

<template>
  <div
    role="group"
    :aria-label="ctx.compact && ctx.showAlpha ? 'RGBA' : panels.colorFormatRgb"
    class="grid"
    :data-alpha="ctx.showAlpha"
    :class="
      ctx.compact
        ? 'grid-cols-3 gap-1 data-[alpha=true]:grid-cols-4'
        : 'grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border'
    "
  >
    <ColorPickerPanelNumberField
      :label="panels.red"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.rgbColor.r)"
      :min="0"
      :max="255"
      @update:model-value="ctx.updateRGBChannelValue('r', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.green"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.rgbColor.g)"
      :min="0"
      :max="255"
      @update:model-value="ctx.updateRGBChannelValue('g', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.blue"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.rgbColor.b)"
      :min="0"
      :max="255"
      @update:model-value="ctx.updateRGBChannelValue('b', $event)"
    />
    <ColorPickerPanelNumberField
      v-if="ctx.compact && ctx.showAlpha"
      :label="panels.alpha"
      class="rounded"
      :model-value="Number(ctx.color.a.toFixed(2))"
      :min="0"
      :max="1"
      :step="0.01"
      @update:model-value="ctx.updateRGBAAlpha($event)"
    />
  </div>
</template>
