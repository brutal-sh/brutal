<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { normalizeClass, useAttrs } from 'vue'

import {
  NumberFieldInput,
  NumberFieldRoot,
  NumberFieldValue
} from '@open-pencil/vue/primitives/NumberField'

import theme from '@/theme/color-picker-number-field'

const { label, min, max, step } = defineProps<{
  label: string
  min: number
  max: number
  step?: number
}>()
const value = defineModel<number>({ required: true })
const attrs = useAttrs()
const styles = tv(theme)()
defineOptions({ inheritAttrs: false })
</script>

<template>
  <NumberFieldRoot
    v-slot="{ attrs: fieldAttrs }"
    :model-value="value"
    :aria-label="label"
    :min="min"
    :max="max"
    :step="step"
    expressions="absolute"
    :inherit-binding="false"
    @commit="value = $event"
  >
    <div
      v-bind="{ ...attrs, ...fieldAttrs }"
      :class="styles.root({ class: normalizeClass(attrs.class) })"
    >
      <NumberFieldInput :class="styles.field()" />
      <NumberFieldValue :class="styles.value()" />
    </div>
  </NumberFieldRoot>
</template>
