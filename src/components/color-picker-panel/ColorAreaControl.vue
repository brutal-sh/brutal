<script setup lang="ts">
import { ColorAreaArea, ColorAreaRoot, ColorAreaThumb } from 'reka-ui'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'

const ctx = useColorPickerPanelContext()
</script>

<template>
  <ColorAreaRoot
    v-slot="{ style }"
    :model-value="ctx.hsbColor"
    color-space="hsb"
    x-channel="saturation"
    y-channel="brightness"
    @update:color="ctx.onRekaColorUpdate"
  >
    <ColorAreaArea
      class="relative w-full cursor-crosshair"
      :class="ctx.compact ? 'h-[194px] rounded-md' : 'h-[140px] rounded'"
      :style="style"
    >
      <ColorAreaThumb
        class="pointer-events-none absolute rounded-full border-white shadow-sm"
        :class="ctx.compact ? 'size-3.5 border-[3px]' : 'size-2.5 border-2'"
      />
    </ColorAreaArea>
  </ColorAreaRoot>
</template>
