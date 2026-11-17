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
    :aria-label="panels.colorFormatHsb"
    class="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded border border-border bg-border"
  >
    <ColorPickerPanelNumberField
      :label="panels.hue"
      :model-value="Math.round(ctx.hsbColor.h)"
      :min="0"
      :max="360"
      @update:model-value="ctx.updateHSBChannelValue('h', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.saturation"
      :model-value="Math.round(ctx.hsbColor.s)"
      :min="0"
      :max="100"
      @update:model-value="ctx.updateHSBChannelValue('s', $event)"
    />
    <ColorPickerPanelNumberField
      :label="panels.brightness"
      :model-value="Math.round(ctx.hsbColor.b)"
      :min="0"
      :max="100"
      @update:model-value="ctx.updateHSBChannelValue('b', $event)"
    />
  </div>

  <StandardColorSlider
    :label="panels.saturation"
    :model-value="ctx.rekaColor"
    channel="saturation"
    color-space="hsb"
    :step="0.1"
    :number-value="ctx.hsbColor.s"
    :number-min="0"
    :number-max="100"
    suffix="%"
    :thumb-fill="colorToCSS(ctx.sliderPreview.hsbSaturation)"
    data-test-id="color-slider-hsb-s"
    @update="ctx.onRekaColorUpdate"
    @update-number="ctx.updateHSBChannelValue('s', $event)"
  />

  <StandardColorSlider
    :label="panels.brightness"
    :model-value="ctx.rekaColor"
    channel="brightness"
    color-space="hsb"
    :step="0.1"
    :number-value="ctx.hsbColor.b"
    :number-min="0"
    :number-max="100"
    suffix="%"
    :thumb-fill="colorToCSS(ctx.sliderPreview.hsbBrightness)"
    data-test-id="color-slider-hsb-b"
    @update="ctx.onRekaColorUpdate"
    @update-number="ctx.updateHSBChannelValue('b', $event)"
  />

  <p class="text-[10px] leading-4 text-muted">{{ ctx.panels.colorHintHsb }}</p>
</template>
