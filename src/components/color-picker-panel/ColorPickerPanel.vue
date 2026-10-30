<script setup lang="ts">
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/vue/controls/color-model'

import ColorAreaControl from '@/components/color-picker-panel/ColorAreaControl.vue'
import { provideColorPickerPanel } from '@/components/color-picker-panel/context'
import FormatControls from '@/components/color-picker-panel/FormatControls.vue'
import HueAlphaSliders from '@/components/color-picker-panel/HueAlphaSliders.vue'

const {
  color,
  okhcl = null,
  compact = false
} = defineProps<{
  color: Color
  okhcl?: OkHCLControls | null
  compact?: boolean
}>()

const emit = defineEmits<{
  update: [color: Color]
}>()

provideColorPickerPanel(
  {
    get color() {
      return color
    },
    get okhcl() {
      return okhcl
    },
    get compact() {
      return compact
    }
  },
  emit
)
</script>

<template>
  <div class="flex flex-col" :class="compact ? 'gap-3' : 'gap-2'">
    <div :class="compact ? 'flex flex-col gap-1.5' : 'contents'">
      <ColorAreaControl />
      <HueAlphaSliders />
    </div>
    <FormatControls />
  </div>
</template>
