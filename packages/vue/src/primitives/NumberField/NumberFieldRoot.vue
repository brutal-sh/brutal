<script setup lang="ts">
import { watchImmediate } from '@vueuse/core'
import { computed, onBeforeUnmount, onDeactivated, watch } from 'vue'

import { normalizeNumberValue } from '#vue/controls/number-expression'
import { useRetainedActivity } from '#vue/lifecycle/retention/context'
import { useOptionalBindableValue } from '#vue/primitives/BindableValue/context'
import { provideNumberField } from '#vue/primitives/NumberField/context'
import {
  cancelEdit,
  commitEdit,
  onKeydown,
  setDraft,
  startEdit
} from '#vue/primitives/NumberField/editing'
import type { NumberFieldOptions } from '#vue/primitives/NumberField/interaction'
import {
  createNumberFieldInteraction,
  displayNumber,
  restoreInteractionValue
} from '#vue/primitives/NumberField/interaction'
import {
  createNumberFieldScrubbing,
  startScrub,
  stopScrubListeners
} from '#vue/primitives/NumberField/scrubbing'
import type {
  NumberFieldActions,
  NumberFieldEditPolicy,
  NumberFieldRootAttrs,
  NumberFieldRootEmits,
  NumberFieldRootProps,
  NumberFieldRootSlots,
  NumberFieldSlotProps,
  NumberFieldState,
  NumberFieldStateAttrs
} from '#vue/primitives/NumberField/types'
import { inputValue } from '#vue/shared/dom-events'

const {
  modelValue,
  min = -Infinity,
  max = Infinity,
  step = 1,
  expressions = true,
  precision,
  sensitivity = 1,
  scrubMode = 'relative',
  inheritBinding = true,
  placeholder = 'Mixed',
  ariaLabel,
  disabled: disabledProp = false,
  bound: boundProp = false,
  editPolicy = 'editable',
  units = []
} = defineProps<NumberFieldRootProps>()
const props = computed<NumberFieldOptions>(() => ({
  modelValue,
  min,
  max,
  step,
  expressions,
  precision,
  sensitivity,
  scrubMode,
  inheritBinding,
  placeholder,
  ariaLabel,
  disabled: disabledProp,
  bound: boundProp,
  editPolicy,
  units
}))
const emit = defineEmits<NumberFieldRootEmits>()
defineSlots<NumberFieldRootSlots>()

const retainedActivity = useRetainedActivity()
const enclosingBinding = useOptionalBindableValue<number>()
const binding = props.value.inheritBinding ? enclosingBinding : undefined
const isMixed = computed(
  () => binding?.state.value === 'mixed' || typeof props.value.modelValue === 'symbol'
)
const numericValue = computed(() => {
  const resolved = binding?.resolvedValue.value
  if (binding?.state.value === 'bound' && typeof resolved === 'number') return resolved
  return typeof props.value.modelValue === 'number' ? props.value.modelValue : 0
})
const disabled = computed(() => props.value.disabled)
const bound = computed(() =>
  binding
    ? binding.state.value === 'bound' || binding.state.value === 'unresolved'
    : props.value.bound
)
const effectiveEditPolicy = computed<NumberFieldEditPolicy>(() => {
  if (!binding) return props.value.editPolicy
  if (binding.policy.value === 'readonly-when-bound') return 'readonly'
  if (binding.policy.value === 'detach-on-edit') return 'detach-on-edit'
  return 'editable'
})
const field = createNumberFieldInteraction({
  props,
  emit,
  binding,
  numericValue,
  isMixed,
  bound,
  editPolicy: effectiveEditPolicy
})
const { editing, scrubbing, draftValue, inputRef, invalidReason, workingValue } = field
const scrub = createNumberFieldScrubbing(field)
const displayValue = computed(() => {
  if (binding?.state.value === 'unresolved') return '—'
  return isMixed.value
    ? ''
    : String(
        normalizeNumberValue(
          displayNumber(
            scrubbing.value ? workingValue.value : numericValue.value,
            props.value.precision
          )
        )
      )
})

const state = computed<NumberFieldState>(() => ({
  editing: editing.value,
  scrubbing: scrubbing.value,
  mixed: isMixed.value,
  disabled: disabled.value,
  bound: bound.value
}))
const stateAttrs = computed<NumberFieldStateAttrs>(() => ({
  'data-editing': editing.value ? '' : undefined,
  'data-scrubbing': scrubbing.value ? '' : undefined,
  'data-mixed': isMixed.value ? '' : undefined,
  'data-disabled': disabled.value ? '' : undefined,
  'data-bound': bound.value ? '' : undefined
}))
const rootTabindex = computed<0 | -1 | undefined>(() => {
  if (editing.value) return undefined
  return disabled.value ? -1 : 0
})
const inactiveAria = computed(() => {
  if (editing.value) return {}
  return {
    'aria-valuenow':
      isMixed.value || binding?.state.value === 'unresolved' ? undefined : numericValue.value,
    'aria-valuemin': Number.isFinite(props.value.min) ? props.value.min : undefined,
    'aria-valuemax': Number.isFinite(props.value.max) ? props.value.max : undefined,
    'aria-disabled': disabled.value ? ('true' as const) : undefined,
    'aria-label': props.value.ariaLabel
  }
})
const rootAttrs = computed<NumberFieldRootAttrs>(() => ({
  ...stateAttrs.value,
  ...inactiveAria.value,
  role: editing.value ? undefined : 'spinbutton',
  tabindex: rootTabindex.value,
  'aria-readonly': binding?.state.value === 'unresolved' ? true : undefined,
  onFocus: () => startEdit(field),
  onKeydown: (event) => onKeydown(field, event)
}))
const actions: NumberFieldActions = {
  startScrub: (event) => startScrub(scrub, event),
  startEdit: () => startEdit(field),
  cancelEdit: () => cancelEdit(field),
  commitEdit: () => commitEdit(field),
  setDraft: (value) => setDraft(field, value),
  input: (event) => setDraft(field, inputValue(event)),
  keydown: (event) => onKeydown(field, event)
}
const slotProps = computed<NumberFieldSlotProps>(() => ({
  modelValue: props.value.modelValue,
  displayValue: displayValue.value,
  draftValue: draftValue.value,
  isMixed: isMixed.value,
  placeholder: props.value.placeholder,
  ...state.value,
  state: state.value,
  attrs: rootAttrs.value,
  actions
}))
provideNumberField({
  modelValue: computed(() => props.value.modelValue),
  numericValue,
  displayValue,
  draftValue,
  isMixed,
  editing,
  scrubbing,
  disabled,
  bound,
  min: computed(() => props.value.min),
  max: computed(() => props.value.max),
  step: field.step,
  ariaLabel: computed(() => props.value.ariaLabel),
  inputRef,
  state,
  stateAttrs,
  rootAttrs,
  slotProps,
  actions,
  invalidReason
})

// A committing field can unmount before a queued focus change reaches the editor.
watch(editing, (value) => emit('editing-change', value), { flush: 'sync' })
watch(
  () => editing.value || scrubbing.value,
  (active) => emit('interaction-change', active),
  {
    flush: 'sync'
  }
)
watch(
  () => props.value.modelValue,
  (value) => {
    if (!editing.value && !scrubbing.value && typeof value === 'number') workingValue.value = value
  },
  { immediate: true }
)

function cancelDetachedInteraction() {
  stopScrubListeners(scrub)
  if (editing.value || scrubbing.value) {
    restoreInteractionValue(field)
    editing.value = false
    scrubbing.value = false
    binding?.actions.cancelMutation()
    emit('cancel')
  }
}

// Cancel before retained DOM detachment can blur and commit a focused draft.
watchImmediate(
  () => retainedActivity?.value ?? true,
  (active) => {
    if (!active) cancelDetachedInteraction()
  },
  { flush: 'sync' }
)
onBeforeUnmount(cancelDetachedInteraction)
onDeactivated(cancelDetachedInteraction)
</script>

<template>
  <slot v-bind="slotProps" />
</template>
