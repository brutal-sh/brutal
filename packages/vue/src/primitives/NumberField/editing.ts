import { nextTick } from 'vue'

import { evaluateNumberExpression, stepNumberValue } from '#vue/controls/number-expression'
import {
  beginInteraction,
  canMutate,
  displayNumber,
  finishCommit,
  requestMutation,
  restoreInteractionValue,
  updateValue
} from '#vue/primitives/NumberField/interaction'
import type { NumberFieldInteraction } from '#vue/primitives/NumberField/interaction'

export function startEdit(field: NumberFieldInteraction) {
  if (field.editing.value || !canMutate(field)) return
  beginInteraction(field)
  field.draftValue.value = field.startedMixed
    ? ''
    : String(displayNumber(field.startValue, field.props.value.precision))
  field.absoluteDraft = field.startedMixed ? null : field.draftValue.value
  field.editing.value = true
  void nextTick(() => {
    field.inputRef.value?.focus()
    field.inputRef.value?.select()
  })
}

function isNumericDraft(field: NumberFieldInteraction, value: string): boolean {
  if (!Number.isFinite(Number.parseFloat(value))) return false
  if (!field.props.value.expressions) return true
  const source =
    field.props.value.expressions === 'absolute' ? value.trim().replace(/^[+-]/, '') : value
  return /^\s*(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(source)
}

export function setDraft(field: NumberFieldInteraction, value: string) {
  if (value !== field.draftValue.value && !requestMutation(field, 'edit')) return
  field.draftValue.value = value
  if (isNumericDraft(field, value)) {
    updateValue(
      field,
      Number.parseFloat(value),
      undefined,
      field.props.value.expressions === 'absolute'
    )
  }
}

function splitUnit(
  field: NumberFieldInteraction,
  expression: string
): { value: string; unit?: string } {
  const source = expression.trim()
  const unit = [...field.props.value.units]
    .sort((a, b) => b.length - a.length)
    .find((candidate) => source.toLowerCase().endsWith(candidate.toLowerCase()))
  return unit ? { value: source.slice(0, -unit.length), unit } : { value: source }
}

export function commitEdit(field: NumberFieldInteraction) {
  if (!field.editing.value) return
  const expression = field.draftValue.value
  const { value, unit } = splitUnit(field, expression)
  if (expression === field.absoluteDraft) {
    finishCommit(field, field.workingValue.value, unit)
    return
  }
  const result = evaluateNumberExpression(value, {
    current: field.startValue,
    expressions: field.props.value.expressions,
    max: field.props.value.max,
    mixed: field.startedMixed
  })
  if (!result.ok) {
    field.invalidReason.value = result.error
    restoreInteractionValue(field)
    field.editing.value = false
    field.binding?.actions.cancelMutation()
    field.emit('cancel')
    field.emit('invalid', expression, result.error)
    return
  }
  finishCommit(field, result.value, unit)
}

export function cancelEdit(field: NumberFieldInteraction) {
  if (!field.editing.value) return
  restoreInteractionValue(field)
  field.invalidReason.value = null
  field.editing.value = false
  field.binding?.actions.cancelMutation()
  field.emit('cancel')
}

function steppingDraft(field: NumberFieldInteraction): { value: number; unit?: string } {
  const draft = field.editing.value ? splitUnit(field, field.draftValue.value) : undefined
  if (!draft || field.draftValue.value === field.absoluteDraft) {
    return { value: field.workingValue.value, unit: draft?.unit }
  }
  const result = evaluateNumberExpression(draft.value, {
    current: field.startValue,
    expressions: field.props.value.expressions,
    max: field.props.value.max,
    mixed: field.startedMixed
  })
  return { value: result.ok ? result.value : field.workingValue.value, unit: draft.unit }
}

function stepValueFromKeyboard(field: NumberFieldInteraction, event: KeyboardEvent): boolean {
  if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return false
  if (!field.editing.value) beginInteraction(field)
  if (!requestMutation(field, 'step')) return true
  event.preventDefault()
  const draft = steppingDraft(field)
  const next = stepNumberValue(
    draft.value,
    event.code === 'ArrowUp' ? 1 : -1,
    field.step.value,
    event,
    field.props.value.min,
    field.props.value.max
  )
  updateValue(field, next, draft.unit)
  field.draftValue.value = `${next}${draft.unit ?? ''}`
  field.absoluteDraft = field.draftValue.value
  if (!field.editing.value) {
    field.emit('commit', next, field.startValue)
    field.binding?.actions.commitMutation()
  }
  return true
}

export function onKeydown(field: NumberFieldInteraction, event: KeyboardEvent) {
  if (stepValueFromKeyboard(field, event)) return
  if (event.code === 'Enter') {
    event.preventDefault()
    commitEdit(field)
  } else if (event.code === 'Escape') {
    event.preventDefault()
    cancelEdit(field)
  }
}
