<script setup lang="ts">
import { usePanelMessages } from '@open-pencil/vue/i18n'

import NumberField from '@/components/inputs/NumberField.vue'

import { ICON_WEIGHT } from './families'

const { value, disabled = false } = defineProps<{
  value: number
  disabled?: boolean
}>()
const emit = defineEmits<{
  update: [value: number]
  editing: [active: boolean]
  cancel: []
}>()
const panels = usePanelMessages()

function update(value: number) {
  const snapped =
    ICON_WEIGHT.min + Math.round((value - ICON_WEIGHT.min) / ICON_WEIGHT.step) * ICON_WEIGHT.step
  emit('update', Math.max(ICON_WEIGHT.min, Math.min(ICON_WEIGHT.max, snapped)))
}
</script>

<template>
  <NumberField
    :model-value="value"
    :min="ICON_WEIGHT.min"
    :max="ICON_WEIGHT.max"
    :step="ICON_WEIGHT.step"
    :label="panels.iconWeight"
    :disabled="disabled"
    scrub-mode="range"
    data-property="icon-weight"
    class="mt-1.5"
    @interaction-change="emit('editing', $event)"
    @update:model-value="update"
    @cancel="emit('cancel')"
  />
</template>
