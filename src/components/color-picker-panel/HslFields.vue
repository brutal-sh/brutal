<script setup lang="ts">
import { colorToCSS } from '@open-pencil/scene-graph/color'
import { useI18n } from '@open-pencil/vue/i18n'

import ColorPickerPanelNumberField from '@/components/color-picker-panel/ColorPickerPanelNumberField.vue'
import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'
import StandardColorSlider from '@/components/color-picker-panel/StandardColorSlider.vue'

const ctx = useColorPickerPanelContext()
const { panels } = useI18n()
</script>

<template>
  <div
    role="group"
    :aria-label="panels.colorFormatHsl"
    class="grid"
    :data-alpha="ctx.showAlpha"
    :class="
      ctx.compact
        ? 'grid-cols-3 gap-1 data-[alpha=true]:grid-cols-4'
        : 'grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border'
    "
  >
    <ColorPickerPanelNumberField
      :label="panels.hue"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.hslColor.h ?? 0)"
      :min="0"
      :max="360"
      @update:model-value="ctx.updateHSLChannelValue('h', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.saturation"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.hslColor.s ?? 0)"
      :min="0"
      :max="100"
      @update:model-value="ctx.updateHSLChannelValue('s', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.lightness"
      :class="{ rounded: ctx.compact }"
      :model-value="Math.round(ctx.hslColor.l ?? 0)"
      :min="0"
      :max="100"
      @update:model-value="ctx.updateHSLChannelValue('l', $event)"
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
