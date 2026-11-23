import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { clampNumberValue, normalizeNumberValue } from '#vue/controls/number-expression'
import type { NumberExpressionError } from '#vue/controls/number-expression'
import type { BindableValueContext } from '#vue/primitives/BindableValue/types'
import type {
  NumberFieldEditPolicy,
  NumberFieldMutationSource,
  NumberFieldRootEmits,
  NumberFieldRootProps
} from '#vue/primitives/NumberField/types'

type OptionalDisplayProps = 'precision' | 'ariaLabel'
export type NumberFieldOptions = Readonly<
  Required<Omit<NumberFieldRootProps, OptionalDisplayProps>> &
    Pick<NumberFieldRootProps, OptionalDisplayProps>
>

interface InteractionOptions {
  props: ComputedRef<NumberFieldOptions>
  emit: NumberFieldRootEmits
  binding: BindableValueContext<number> | undefined
  numericValue: ComputedRef<number>
  isMixed: ComputedRef<boolean>
  bound: ComputedRef<boolean>
  editPolicy: ComputedRef<NumberFieldEditPolicy>
}

export interface NumberFieldInteraction extends InteractionOptions {
  editing: Ref<boolean>
  scrubbing: Ref<boolean>
  draftValue: Ref<string>
  inputRef: Ref<HTMLInputElement | null>
  invalidReason: Ref<NumberExpressionError | null>
  workingValue: Ref<number>
  step: ComputedRef<number>
  startValue: number
  startedMixed: boolean
  mutationRequested: boolean
  /** An untouched or stepped draft is already absolute, even in the SDK's relative mode. */
  absoluteDraft: string | null
}

export function createNumberFieldInteraction(options: InteractionOptions): NumberFieldInteraction {
  return {
    ...options,
    editing: ref(false),
    scrubbing: ref(false),
    draftValue: ref(''),
    inputRef: shallowRef<HTMLInputElement | null>(null),
    invalidReason: ref<NumberExpressionError | null>(null),
    workingValue: ref(0),
    step: computed(() => {
      const step = options.props.value.step
      return Number.isFinite(step) && step > 0 ? step : 1
    }),
    startValue: 0,
    startedMixed: false,
    mutationRequested: false,
    absoluteDraft: null
  }
}

export function displayNumber(value: number, precision?: number): number {
  if (precision === undefined || !Number.isInteger(precision) || precision < 0 || precision > 14) {
    return value
  }
  const scale = 10 ** precision
  const rounded = Math.round(value * scale) / scale
  return Number.isFinite(rounded) ? rounded : value
}

export function canMutate(field: NumberFieldInteraction): boolean {
  if (field.binding?.state.value === 'unresolved') return false
  return (
    !field.props.value.disabled && !(field.bound.value && field.editPolicy.value === 'readonly')
  )
}

export function requestMutation(
  field: NumberFieldInteraction,
  source: NumberFieldMutationSource
): boolean {
  if (field.mutationRequested) return true
  if (!canMutate(field)) return false
  if (field.binding && !field.binding.actions.beginMutation(source)) return false
  if (!field.binding && field.bound.value && field.editPolicy.value === 'detach-on-edit') {
    field.emit('detach-request', source)
  }
  field.mutationRequested = true
  return true
}

export function beginInteraction(field: NumberFieldInteraction) {
  field.startValue = field.numericValue.value
  field.startedMixed = field.isMixed.value
  field.workingValue.value = field.numericValue.value
  field.mutationRequested = false
  field.absoluteDraft = null
  field.invalidReason.value = null
}

export function updateValue(
  field: NumberFieldInteraction,
  value: number,
  unit?: string,
  preservePrecision = false
) {
  const clamped = clampNumberValue(value, field.props.value.min, field.props.value.max)
  const next = preservePrecision ? clamped : normalizeNumberValue(clamped)
  field.workingValue.value = next
  if (field.binding?.actions.applyValue(next)) return
  if (field.props.value.modelValue !== next || unit) field.emit('update:modelValue', next, unit)
}

export function restoreInteractionValue(field: NumberFieldInteraction) {
  if (!field.mutationRequested) return
  if (field.workingValue.value !== field.startValue || field.startedMixed !== field.isMixed.value) {
    field.workingValue.value = field.startValue
    if (!field.binding?.actions.applyValue(field.startValue)) {
      field.emit('update:modelValue', field.startValue)
    }
  }
}

export function finishCommit(field: NumberFieldInteraction, value: number, unit?: string) {
  if (field.mutationRequested || value !== field.startValue || unit) {
    updateValue(field, value, unit, field.props.value.expressions === 'absolute')
  }
  field.editing.value = false
  if (
    field.mutationRequested ||
    field.workingValue.value !== field.startValue ||
    field.startedMixed
  ) {
    field.emit('commit', field.workingValue.value, field.startValue, unit)
  }
  field.binding?.actions.commitMutation()
}
