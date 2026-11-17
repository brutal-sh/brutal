<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { normalizeClass, useAttrs } from 'vue'

import {
  NumberFieldInput,
  NumberFieldRoot,
  NumberFieldValue
} from '@open-pencil/vue/primitives/NumberField'

import theme from '@/theme/color-picker-number-field'

const { label, modelValue, min, max, step } = defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const attrs = useAttrs()
const styles = tv(theme)()
defineOptions({ inheritAttrs: false })
</script>

<template>
  <NumberFieldRoot
    v-slot="{ attrs: fieldAttrs }"
    :model-value="modelValue"
    :aria-label="label"
    :min="min"
    :max="max"
    :step="step"
    expressions="absolute"
    :inherit-binding="false"
    @commit="emit('update:modelValue', $event)"
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
