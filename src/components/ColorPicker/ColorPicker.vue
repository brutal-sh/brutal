<script setup lang="ts">
import type { VNode } from 'vue'

import type { Color } from '@open-pencil/scene-graph/primitives'
import type { OkHCLControls } from '@open-pencil/vue/controls/color-model'
import { useI18n } from '@open-pencil/vue/i18n'
import { ColorPickerRoot } from '@open-pencil/vue/primitives/ColorPicker'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

const { panels } = useI18n()
const {
  color,
  okhcl = null,
  compact = false
} = defineProps<{ color: Color; okhcl?: OkHCLControls | null; compact?: boolean }>()
defineSlots<{
  trigger?(props: { style: { background: string } }): VNode[]
}>()
const emit = defineEmits<{
  update: [color: Color]
  openChange: [open: boolean]
  cancel: []
}>()
const cls = usePopoverUI()
</script>

<template>
  <ColorPickerRoot
    :color="color"
    :label="panels.editColor"
    :ui="{
      content: `${cls.content} ${compact ? 'w-[264px] p-3' : 'w-56 p-2'}`,
      swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
    }"
    @update="emit('update', $event)"
    @open-change="emit('openChange', $event)"
    @cancel="emit('cancel')"
  >
    <template v-if="$slots.trigger" #trigger="trigger">
      <slot name="trigger" v-bind="trigger" />
    </template>
    <template #default="{ color: currentColor }">
      <ColorPickerPanel
        :color="currentColor"
        :okhcl="okhcl"
        :compact="compact"
        @update="emit('update', $event)"
      />
    </template>
  </ColorPickerRoot>
</template>
