import { useEventListener, useMutationObserver, useResizeObserver } from '@vueuse/core'
import { shallowRef, watch, type CSSProperties, type Ref } from 'vue'

import { createBrowserBackdrop } from '@/app/browser-preview/backdrop'
import {
  hasPreviewOverlay,
  hasUnpreparedPreviewOverlay,
  type PreviewViewport
} from '@/app/browser-preview/dock'
import type { BrowserPreviewNative, createBrowserPreviewNative } from '@/app/browser-preview/native'
import type { PreviewStatus } from '@/app/browser-preview/schema'

interface SurfaceOptions {
  bridge: Pick<ReturnType<typeof createBrowserPreviewNative>, 'syncBounds'> & {
    native: Pick<BrowserPreviewNative, 'backdrop'>
  }
  surface: Ref<HTMLElement | null>
  open: Ref<boolean>
  preset: Ref<string>
  zoom: Ref<number>
  status: Ref<PreviewStatus | null>
  error: Ref<string>
  dragging: Ref<boolean>
  preparingDrag: Ref<boolean>
  viewport: () => PreviewViewport | null
}

interface SurfaceState {
  options: SurfaceOptions
  backdrop: ReturnType<typeof createBrowserBackdrop>
  style: Ref<CSSProperties>
  queued: boolean
  lastLayout: string
  lastHidden: boolean
  revision: number
  preparation: number
  disposed: boolean
}

export function useBrowserSurface(options: SurfaceOptions) {
  const backdrop = createBrowserBackdrop(async () => {
    const status = options.status.value
    if (!status) throw new Error('Open a page before preparing its backdrop.')
    return options.bridge.native.backdrop(status.url)
  })
  const state: SurfaceState = {
    options,
    backdrop,
    style: shallowRef<CSSProperties>({}),
    queued: false,
    lastLayout: '',
    lastHidden: false,
    revision: 0,
    preparation: 0,
    disposed: false
  }
  const syncSurface = () => sync(state)
  useResizeObserver(options.surface, syncSurface)
  watch(options.dragging, syncSurface, { flush: 'post' })
  watch(
    options.preparingDrag,
    (preparing) => {
      if (!preparing && !options.dragging.value) releaseFrame(state, state.preparation)
    },
    { flush: 'sync' }
  )
  useEventListener(window, 'resize', syncSurface)
  useMutationObserver(document.body, syncSurface, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-state']
  })
  return {
    backdrop,
    backdropStyle: state.style,
    syncSurface,
    prepareBackdrop: (whileHidden = false) => prepare(state, whileHidden),
    prepareDragBackdrop: () => prepare(state, false, 'drag'),
    disposeSurface() {
      state.disposed = true
      backdrop.dispose()
    }
  }
}

function backdropKey({ options }: SurfaceState) {
  return JSON.stringify([
    options.status.value?.url,
    options.status.value?.loading,
    options.preset.value,
    options.viewport()
  ])
}

async function prepare(
  state: SurfaceState,
  whileHidden: boolean,
  purpose: 'overlay' | 'drag' = 'overlay'
) {
  const { options } = state
  if (state.disposed || !options.open.value) return false
  if (!options.status.value?.captureAvailable || options.status.value.loading)
    return purpose === 'overlay'
  return prepareFrame(state, whileHidden, purpose)
}

async function prepareFrame(
  state: SurfaceState,
  whileHidden: boolean,
  purpose: 'overlay' | 'drag'
) {
  const { options } = state
  const key = backdropKey(state)
  const revision = state.revision
  const request = ++state.preparation
  const style = projection(options)
  const isCurrent = () =>
    !state.disposed &&
    options.open.value &&
    revision === state.revision &&
    request === state.preparation &&
    hasPreviewOverlay() === whileHidden &&
    backdropKey(state) === key &&
    (purpose === 'overlay' || options.preparingDrag.value)
  try {
    const ready = (await state.backdrop.prepare(isCurrent)) && isCurrent()
    if (ready) state.style.value = style
    else if (purpose === 'drag') releaseFrame(state, request)
    return ready
  } catch (reason) {
    if (isCurrent()) options.error.value = reason instanceof Error ? reason.message : String(reason)
    if (purpose === 'drag') releaseFrame(state, request)
    return purpose === 'overlay' && isCurrent()
  }
}

function projection(options: SurfaceOptions): CSSProperties {
  const rect = options.surface.value?.getBoundingClientRect()
  const bounds = options.viewport()?.bounds
  return bounds && rect
    ? {
        left: `${bounds.x - rect.x}px`,
        top: `${bounds.y - rect.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`
      }
    : {}
}

function releaseFrame(state: SurfaceState, request: number) {
  if (
    state.disposed ||
    request !== state.preparation ||
    state.options.dragging.value ||
    hasPreviewOverlay() ||
    !state.options.open.value
  )
    return
  state.backdrop.clear()
  state.style.value = projection(state.options)
}

function layout(state: SurfaceState) {
  const { options } = state
  const rect = options.surface.value?.getBoundingClientRect()
  // The PNG keeps its captured CSS scale; the surface clips it while native bounds change.
  if (!state.backdrop.src.value) state.style.value = projection(options)
  const overlay = hasPreviewOverlay()
  const hidden = overlay || options.dragging.value || !options.open.value
  const restoring = state.lastHidden && !hidden
  state.lastHidden = hidden
  const key = JSON.stringify([
    rect ? [rect.x, rect.y, rect.width, rect.height] : null,
    options.preset.value,
    options.zoom.value,
    options.status.value?.url,
    options.status.value?.loading,
    overlay,
    hidden,
    options.open.value
  ])
  return { key, overlay, restoring }
}

function sync(state: SurfaceState) {
  if (state.queued || state.disposed) return
  state.queued = true
  // Native child focus can pause the editor's animation frames.
  queueMicrotask(() => {
    state.queued = false
    if (state.disposed) return
    const next = layout(state)
    if (next.key === state.lastLayout) return
    const revision = ++state.revision
    const request = state.preparation
    state.lastLayout = next.key
    void state.options.bridge
      .syncBounds()
      .then(() => {
        if (state.disposed || revision !== state.revision) return false
        if (next.overlay && hasUnpreparedPreviewOverlay()) return prepare(state, true)
        if (next.restoring) releaseFrame(state, request)
        return false
      })
      .catch((reason: unknown) => {
        if (revision !== state.revision) return
        state.lastLayout = ''
        if (!state.disposed) state.options.error.value = String(reason)
      })
  })
}
