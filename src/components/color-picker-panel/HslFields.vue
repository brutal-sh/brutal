<script setup lang="ts">
import { colorToCSS } from '@open-pencil/scene-graph/color'
import { useI18n } from '@open-pencil/vue/i18n'
import { inputNumberValue } from '@open-pencil/vue/shared/dom-events'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'
import StandardColorSlider from '@/components/color-picker-panel/StandardColorSlider.vue'

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
      :aria-label="panels.hue"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.hslColor.h ?? 0)"
      min="0"
      max="360"
      @change="ctx.updateHSLChannelValue('h', inputNumberValue($event))"
    />
    <input
      type="number"
      :aria-label="panels.saturation"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.hslColor.s ?? 0)"
      min="0"
      max="100"
      @change="ctx.updateHSLChannelValue('s', inputNumberValue($event))"
    />
    <input
      type="number"
      :aria-label="panels.lightness"
      class="min-w-0 bg-input px-2 py-1 text-xs text-surface outline-none"
      :class="{ rounded: ctx.compact }"
      :value="Math.round(ctx.hslColor.l ?? 0)"
      min="0"
      max="100"
      @change="ctx.updateHSLChannelValue('l', inputNumberValue($event))"
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

  <template v-if="!ctx.compact">
    <StandardColorSlider
      :label="panels.saturation"
      :model-value="ctx.rekaColor"
      channel="saturation"
      color-space="hsl"
      :step="0.1"
      :number-value="Math.round(ctx.hslColor.s ?? 0)"
      :number-min="0"
      :number-max="100"
      suffix="%"
      :thumb-fill="colorToCSS(ctx.sliderPreview.hslSaturation)"
      data-test-id="color-slider-hsl-s"
      @update="ctx.onRekaColorUpdate"
      @update-number="ctx.updateHSLChannelValue('s', $event)"
    />

    <StandardColorSlider
      :label="panels.lightness"
      :model-value="ctx.rekaColor"
      channel="lightness"
      color-space="hsl"
      :step="0.1"
      :number-value="Math.round(ctx.hslColor.l ?? 0)"
      :number-min="0"
      :number-max="100"
      suffix="%"
      :thumb-fill="colorToCSS(ctx.sliderPreview.hslLightness)"
      data-test-id="color-slider-hsl-l"
      @update="ctx.onRekaColorUpdate"
      @update-number="ctx.updateHSLChannelValue('l', $event)"
    />

    <p class="text-[10px] leading-4 text-muted">{{ ctx.panels.colorHintHsl }}</p>
  </template>
</template>
