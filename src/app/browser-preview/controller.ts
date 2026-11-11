import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

import type { BrowserCapture, BrowserCaptureScope } from './capture'
import { clipBrowserPage } from './clip'
import type { BrowserImportTarget } from './dom/placement'
import type { BrowserPreviewNative } from './native'
import { PREVIEW_PRESETS, previewURL } from './schema'
import type { PreviewAction, PreviewStatus } from './schema'

export interface CaptureTarget {
  /** Bound to the selected document and page; false after switching, replacing or closing it. */
  isCurrent(): boolean
  place(capture: BrowserCapture): Promise<void>
}

interface ControllerState {
  native: BrowserPreviewNative
  captureTarget: () => CaptureTarget
  importTarget?: () => BrowserImportTarget
  exportURL?: (input: string) => string | undefined
  address: Ref<string>
  preset: Ref<string>
  status: ShallowRef<PreviewStatus | null>
  busy: Ref<boolean>
  error: Ref<string>
  notice: Ref<string>
  disposed: boolean
  revision: number
}

export function createBrowserPreviewController(
  native: BrowserPreviewNative,
  captureTarget: () => CaptureTarget,
  importTarget?: () => BrowserImportTarget,
  exportURL?: (input: string) => string | undefined
) {
  const state = createState(native, captureTarget, importTarget, exportURL)
  return {
    address: state.address,
    preset: state.preset,
    status: state.status,
    busy: state.busy,
    error: state.error,
    notice: state.notice,
    refresh: () => refresh(state),
    clearSiteData: (url: string) =>
      run(state, async () => {
        await native.clearSiteData(url)
        if (isActive(state)) state.status.value = await native.status()
      }),
    navigate: () => run(state, () => navigate(state)),
    clearPage: () => run(state, () => clearPage(state)),
    action: (action: PreviewAction) =>
      run(state, async () => {
        await native.action(action)
        if (isActive(state)) state.status.value = await native.status()
      }),
    resize: () => run(state, () => resize(state)),
    capture: (scope: BrowserCaptureScope = 'visible') =>
      run(state, () => capturePage(state, scope)),
    importPage: (selected = false, clipHeight?: number) =>
      run(state, () => importPage(state, selected, clipHeight)),
    dispose: () => {
      state.disposed = true
    }
  }
}

function createState(
  native: BrowserPreviewNative,
  captureTarget: () => CaptureTarget,
  importTarget?: () => BrowserImportTarget,
  exportURL?: (input: string) => string | undefined
): ControllerState {
  return {
    native,
    captureTarget,
    importTarget,
    exportURL,
    address: ref(''),
    preset: ref('desktop'),
    status: shallowRef<PreviewStatus | null>(null),
    busy: ref(false),
    error: ref(''),
    notice: ref(''),
    disposed: false,
    revision: 0
  }
}

function isActive(state: ControllerState) {
  return !state.disposed
}

function selectedPreset(state: ControllerState) {
  return PREVIEW_PRESETS.find((item) => item.value === state.preset.value) ?? PREVIEW_PRESETS[0]
}

async function run(state: ControllerState, operation: () => Promise<void>) {
  if (state.busy.value || !isActive(state)) return
  state.revision++
  state.busy.value = true
  state.error.value = ''
  state.notice.value = ''
  try {
    await operation()
  } catch (reason) {
    if (isActive(state))
      state.error.value = reason instanceof Error ? reason.message : String(reason)
  } finally {
    state.busy.value = false
  }
}

async function refresh(state: ControllerState) {
  if (state.busy.value || !isActive(state)) return
  const startedAt = ++state.revision
  try {
    const result = await state.native.status()
    if (isActive(state) && startedAt === state.revision) state.status.value = result
  } catch (reason) {
    // Polling keeps the user's action feedback, but failures remain visible in diagnostics.
    console.warn('[Browser preview] Could not refresh status', reason)
  }
}

async function navigate(state: ControllerState) {
  const url = previewURL(state.address.value, state.exportURL?.(state.address.value))
  const result = await state.native.open(url, selectedPreset(state))
  if (isActive(state)) state.status.value = result
}

async function clearPage(state: ControllerState) {
  await state.native.action('close')
  if (isActive(state)) {
    state.status.value = null
    state.address.value = ''
  }
}

async function resize(state: ControllerState) {
  if (!state.status.value) return
  await state.native.resize(selectedPreset(state))
  if (isActive(state)) state.status.value = await state.native.status()
}

async function capturePage(state: ControllerState, scope: BrowserCaptureScope) {
  const target = state.captureTarget()
  if (!target.isCurrent()) throw new Error('Select this document before capturing.')
  const current = await state.native.status()
  if (!current) throw new Error('Open a page in the preview first.')
  if (!current.captureAvailable) throw new Error('Browser capture is currently available on macOS.')
  const captured = await state.native.capture(current.url, scope)
  if (!isActive(state) || !target.isCurrent()) {
    throw new Error('The document or page changed. Capture again into the selected design.')
  }
  await target.place(captured)
  if (isActive(state))
    state.notice.value = 'Capture added to this design. You can undo it in the editor.'
}

async function importPage(state: ControllerState, selected: boolean, clipHeight?: number) {
  if (!state.importTarget) throw new Error('Editable browser import is unavailable.')
  const target = state.importTarget()
  if (!target.isCurrent()) throw new Error('Select this document before importing.')
  const current = await state.native.status()
  if (!current) throw new Error('Open a page in the preview first.')
  const page = await state.native.extract(current.url, selected)
  if (!isActive(state) || !target.isCurrent())
    throw new Error('The document or selection changed. Import again.')
  await target.place(
    selected ? page : clipBrowserPage(page, clipHeight),
    () => isActive(state) && target.isCurrent()
  )
  if (isActive(state))
    state.notice.value = 'Editable page added at its captured width. You can undo it in the editor.'
}
