<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useEditorMessages } from '@open-pencil/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/browser-preview'

const { height, maximum, minimum, disabled, dragging } = defineProps<{
  height: number
  maximum: number
  minimum: number
  disabled: boolean
  dragging: boolean
}>()
const emit = defineEmits<{
  start: [event: PointerEvent]
  move: [event: PointerEvent]
  end: [event: PointerEvent]
  cancel: []
  key: [event: KeyboardEvent]
  reset: []
}>()
const ui = tv(theme)()
const messages = useEditorMessages()
</script>

<template>
  <Tip as-child :label="messages.browserImportHeightHint">
    <div
      role="separator"
      :aria-label="messages.browserImportHeight"
      aria-orientation="horizontal"
      :aria-valuenow="Math.round(height)"
      :aria-valuemin="Math.round(minimum)"
      :aria-valuemax="Math.round(maximum)"
      :aria-disabled="disabled"
      :data-dragging="dragging"
      :tabindex="disabled ? -1 : 0"
      :class="ui.heightHandle()"
      @pointerdown="emit('start', $event)"
      @pointermove="emit('move', $event)"
      @pointerup="emit('end', $event)"
      @pointercancel="emit('cancel')"
      @lostpointercapture="emit('cancel')"
      @keydown="emit('key', $event)"
      @keydown.enter.prevent="!disabled && emit('reset')"
      @dblclick="!disabled && emit('reset')"
    >
      <icon-lucide-grip-horizontal aria-hidden="true" class="size-3.5" />
    </div>
  </Tip>
</template>
