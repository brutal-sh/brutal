import { useEventListener } from '@vueuse/core'

import { startEdit } from '#vue/primitives/NumberField/editing'
import {
  beginInteraction,
  canMutate,
  requestMutation,
  restoreInteractionValue,
  updateValue
} from '#vue/primitives/NumberField/interaction'
import type { NumberFieldInteraction } from '#vue/primitives/NumberField/interaction'

interface NumberFieldScrubbing {
  field: NumberFieldInteraction
  target?: Element
  pointerId?: number
  stopMove?: () => void
  stopUp?: () => void
  stopCancel?: () => void
  stopEscape?: () => void
}

interface ScrubMovement {
  startX: number
  lastX: number
  startValue: number
  accumulated: number
  hasMoved: boolean
  bounds: DOMRect | undefined
  range: boolean
}

export function createNumberFieldScrubbing(field: NumberFieldInteraction): NumberFieldScrubbing {
  return { field }
}

export function stopScrubListeners(scrub: NumberFieldScrubbing) {
  scrub.stopMove?.()
  scrub.stopUp?.()
  scrub.stopCancel?.()
  scrub.stopEscape?.()
  scrub.stopMove = undefined
  scrub.stopUp = undefined
  scrub.stopCancel = undefined
  scrub.stopEscape = undefined
  if (scrub.target && scrub.pointerId != null && scrub.target.hasPointerCapture(scrub.pointerId)) {
    scrub.target.releasePointerCapture(scrub.pointerId)
  }
  scrub.target = undefined
  scrub.pointerId = undefined
  if (typeof document !== 'undefined') document.body.style.cursor = ''
}

function createMovement(scrub: NumberFieldScrubbing, event: PointerEvent): ScrubMovement {
  const { min, max, scrubMode } = scrub.field.props.value
  const bounds = scrub.target?.getBoundingClientRect()
  const startValue = scrub.field.numericValue.value
  return {
    startX: event.clientX,
    lastX: event.clientX,
    startValue,
    accumulated: startValue,
    hasMoved: false,
    bounds,
    range: Boolean(
      scrubMode === 'range' &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max > min &&
      bounds &&
      bounds.width > 0
    )
  }
}

function updateRange(scrub: NumberFieldScrubbing, movement: ScrubMovement, x: number) {
  if (!movement.bounds) return
  const { min, max } = scrub.field.props.value
  const step = scrub.field.step.value
  const fraction = Math.max(0, Math.min(1, (x - movement.bounds.left) / movement.bounds.width))
  updateValue(scrub.field, min + Math.round((fraction * (max - min)) / step) * step)
}

function moveScrub(scrub: NumberFieldScrubbing, movement: ScrubMovement, event: PointerEvent) {
  if (event.pointerId !== scrub.pointerId) return
  if (movement.range) {
    updateRange(scrub, movement, event.clientX)
    return
  }
  const dx = event.clientX - movement.lastX
  movement.lastX = event.clientX
  if (!movement.hasMoved && Math.abs(event.clientX - movement.startX) > 2) {
    if (!requestMutation(scrub.field, 'scrub')) return
    movement.hasMoved = true
    scrub.field.scrubbing.value = true
    document.body.style.cursor = 'ew-resize'
  }
  if (!movement.hasMoved) return
  const step = scrub.field.step.value
  movement.accumulated += dx * step * scrub.field.props.value.sensitivity
  const steps = Math.round((movement.accumulated - movement.startValue) / step)
  updateValue(scrub.field, movement.startValue + steps * step)
}

function finishScrub(scrub: NumberFieldScrubbing, movement: ScrubMovement, cancelled: boolean) {
  stopScrubListeners(scrub)
  const { field } = scrub
  if (cancelled) {
    restoreInteractionValue(field)
    field.binding?.actions.cancelMutation()
    field.emit('cancel')
    field.scrubbing.value = false
    return
  }
  field.scrubbing.value = false
  if (!movement.hasMoved) {
    startEdit(field)
    return
  }
  field.emit('commit', field.workingValue.value, field.startValue)
  field.binding?.actions.commitMutation()
}

function attachListeners(scrub: NumberFieldScrubbing, movement: ScrubMovement) {
  const target = scrub.target ?? document
  scrub.stopMove = useEventListener(target, 'pointermove', (event: PointerEvent) =>
    moveScrub(scrub, movement, event)
  )
  scrub.stopEscape = useEventListener(
    document,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      finishScrub(scrub, movement, true)
    },
    { capture: true }
  )
  scrub.stopUp = useEventListener(target, 'pointerup', (event: PointerEvent) => {
    if (event.pointerId === scrub.pointerId) finishScrub(scrub, movement, false)
  })
  scrub.stopCancel = useEventListener(target, 'pointercancel', (event: PointerEvent) => {
    if (event.pointerId === scrub.pointerId) finishScrub(scrub, movement, true)
  })
}

export function startScrub(scrub: NumberFieldScrubbing, event: PointerEvent) {
  if (!canMutate(scrub.field)) return
  event.preventDefault()
  beginInteraction(scrub.field)
  scrub.target = event.currentTarget instanceof Element ? event.currentTarget : undefined
  const movement = createMovement(scrub, event)
  if (movement.range) {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== scrub.target) {
      document.activeElement.blur()
    }
    if (!requestMutation(scrub.field, 'scrub')) return
    movement.hasMoved = true
    scrub.field.scrubbing.value = true
    updateRange(scrub, movement, event.clientX)
  }
  scrub.pointerId = event.pointerId
  scrub.target?.setPointerCapture(event.pointerId)
  attachListeners(scrub, movement)
}
