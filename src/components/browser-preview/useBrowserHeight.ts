import { useEventListener, useResizeObserver } from '@vueuse/core'
import { computed, onScopeDispose, ref, type Ref } from 'vue'

import { BROWSER_HEIGHT_HANDLE_HEIGHT } from '@/app/browser-preview/clip'
import { MIN_FIXED_PREVIEW_ZOOM } from '@/app/browser-preview/dock'
import { PREVIEW_PRESETS } from '@/app/browser-preview/schema'

interface HeightOptions {
  region: Ref<HTMLElement | null>
  model: Ref<number | null>
  preset: () => string
  error: Ref<string>
  disabled: () => boolean
  prepare: () => Promise<boolean>
}
interface Gesture {
  pointerId: number
  target: HTMLElement
  originY: number
  lastY: number
  height: number
  previous: number | null
}
interface HeightState {
  options: HeightOptions
  available: Ref<number>
  preparing: Ref<boolean>
  dragging: Ref<boolean>
  gesture: Gesture | null
  disposed: boolean
}

export function useBrowserHeight(options: HeightOptions) {
  const state: HeightState = {
    options,
    available: ref(0),
    preparing: ref(false),
    dragging: ref(false),
    gesture: null,
    disposed: false
  }
  const maximum = computed(() => Math.max(0, state.available.value - BROWSER_HEIGHT_HANDLE_HEIGHT))
  const minimum = computed(() => Math.min(maximum.value, minimumHeight(state)))
  const height = computed(() =>
    Math.min(maximum.value, Math.max(minimum.value, options.model.value ?? maximum.value))
  )
  useResizeObserver(options.region, () => {
    state.available.value = options.region.value?.clientHeight ?? 0
    if (options.model.value !== null) setHeight(state, options.model.value)
  })
  useEventListener(window, 'blur', () => finish(state, true))
  onScopeDispose(() => {
    state.disposed = true
    finish(state, true)
  })
  return {
    preparing: state.preparing,
    dragging: state.dragging,
    maximum,
    minimum,
    height,
    clipped: computed(() => options.model.value !== null),
    surfaceStyle: computed(() =>
      options.model.value === null ? {} : { flex: 'none', height: `${height.value}px` }
    ),
    start: (event: PointerEvent) => start(state, event),
    move: (event: PointerEvent) => move(state, event),
    end: (event: PointerEvent) => end(state, event),
    cancel: () => finish(state, true),
    key: (event: KeyboardEvent) => key(state, event)
  }
}

function minimumHeight({ options }: HeightState) {
  const device = PREVIEW_PRESETS.find((preset) => preset.value === options.preset())
  return !device || device.value === 'desktop'
    ? 1
    : Math.ceil(device.height * MIN_FIXED_PREVIEW_ZOOM + 16)
}

function setHeight(state: HeightState, value: number) {
  if (!Number.isFinite(value)) return
  const maximum = Math.max(0, state.available.value - BROWSER_HEIGHT_HANDLE_HEIGHT)
  const height = Math.round(
    Math.max(Math.min(maximum, minimumHeight(state)), Math.min(maximum, value))
  )
  state.options.model.value = height >= Math.floor(maximum) ? null : height
}

async function start(state: HeightState, event: PointerEvent) {
  if (
    state.disposed ||
    state.gesture ||
    state.options.disabled() ||
    event.button !== 0 ||
    !(event.currentTarget instanceof HTMLElement)
  )
    return
  event.preventDefault()
  const target = event.currentTarget
  target.focus({ preventScroll: true })
  target.setPointerCapture(event.pointerId)
  const current: Gesture = {
    pointerId: event.pointerId,
    target,
    originY: event.clientY,
    lastY: event.clientY,
    height: state.options.model.value ?? state.available.value - BROWSER_HEIGHT_HANDLE_HEIGHT,
    previous: state.options.model.value
  }
  state.gesture = current
  state.preparing.value = true
  await prepareGesture(state, current)
}

async function prepareGesture(state: HeightState, current: Gesture) {
  try {
    const ready = await state.options.prepare()
    if (state.disposed || state.gesture !== current) return
    if (!ready) return finish(state, true)
    state.dragging.value = true
    setHeight(state, current.height + current.lastY - current.originY)
  } catch (reason) {
    if (state.disposed || state.gesture !== current) return
    state.options.error.value = reason instanceof Error ? reason.message : String(reason)
    finish(state, true)
  } finally {
    if (state.gesture === current) state.preparing.value = false
  }
}

function move(state: HeightState, event: PointerEvent) {
  const current = state.gesture
  if (!current || current.pointerId !== event.pointerId) return
  event.preventDefault()
  current.lastY = event.clientY
  if (state.dragging.value) setHeight(state, current.height + current.lastY - current.originY)
}

function end(state: HeightState, event: PointerEvent) {
  if (state.gesture?.pointerId !== event.pointerId) return
  move(state, event)
  finish(state, state.preparing.value)
}

function finish(state: HeightState, cancelled: boolean) {
  const current = state.gesture
  state.gesture = null
  if (current && cancelled) {
    if (current.previous === null) state.options.model.value = null
    else setHeight(state, current.previous)
  }
  state.preparing.value = false
  state.dragging.value = false
  if (current?.target.hasPointerCapture(current.pointerId))
    current.target.releasePointerCapture(current.pointerId)
}

function key(state: HeightState, event: KeyboardEvent) {
  if (event.key === 'Escape' && state.gesture) {
    event.preventDefault()
    return finish(state, true)
  }
  if (state.options.disabled() || state.gesture) return
  if (adjustHeight(state, event)) event.preventDefault()
}

function adjustHeight(state: HeightState, event: KeyboardEvent) {
  const maximum = state.available.value - BROWSER_HEIGHT_HANDLE_HEIGHT
  const current = state.options.model.value ?? maximum
  const step = event.shiftKey ? 50 : 10
  if (event.key === 'ArrowUp') setHeight(state, current - step)
  else if (event.key === 'ArrowDown') setHeight(state, current + step)
  else if (event.key === 'Home') setHeight(state, minimumHeight(state))
  else if (event.key === 'End') state.options.model.value = null
  else return false
  return true
}
