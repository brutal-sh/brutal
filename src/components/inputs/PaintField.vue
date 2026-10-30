<script lang="ts">
import type { ClassValue } from 'tailwind-variants'
import type { VNode } from 'vue'

import type { ComponentUI } from '@/components/ui/types'
import type theme from '@/theme/paint/field'

export type PaintFieldUI = ComponentUI<typeof theme>

export interface PaintFieldProps {
  opacity: number
  opacityLabel: string
  compact?: boolean
  bound?: boolean
  class?: ClassValue
  ui?: PaintFieldUI
}

export interface PaintFieldSlots {
  preview(): VNode[]
  value(): VNode[]
  binding?(): VNode[]
}
</script>

<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import NumberField from '@/components/inputs/NumberField.vue'
import paintFieldTheme from '@/theme/paint/field'

const {
  opacity,
  opacityLabel,
  compact = false,
  bound = false,
  class: className,
  ui
} = defineProps<PaintFieldProps>()
const emit = defineEmits<{ 'update:opacity': [opacity: number] }>()
defineSlots<PaintFieldSlots>()
const styles = computed(() => tv(paintFieldTheme)({ compact, bound }))
</script>

<template>
  <div
    :class="styles.root({ class: [ui?.root, className] })"
    data-slot="paint-field"
    data-property="paint"
  >
    <div :class="styles.preview({ class: ui?.preview })" data-slot="preview">
      <slot name="preview" />
    </div>
    <div :class="styles.value({ class: ui?.value })" data-slot="value">
      <slot name="value" />
    </div>
    <div
      v-if="!compact || !bound"
      :class="styles.divider({ class: ui?.divider })"
      data-slot="divider"
    />
    <NumberField
      v-if="!compact || !bound"
      :inherit-binding="false"
      :class="styles.opacity({ class: ui?.opacity })"
      :aria-label="opacityLabel"
      suffix="%"
      :model-value="Math.round(opacity * 100)"
      :min="0"
      :max="100"
      :ui="{
        root: 'h-full rounded-none border-0 bg-transparent shadow-none',
        leading: 'hidden',
        field: 'px-1',
        display: 'pl-1 pr-0',
        suffix: 'pr-0.5'
      }"
      data-property="opacity"
      @update:model-value="emit('update:opacity', Math.max(0, Math.min(1, $event / 100)))"
    />
    <div v-if="$slots.binding" :class="styles.binding({ class: ui?.binding })" data-slot="binding">
      <slot name="binding" />
    </div>
  </div>
</template>
