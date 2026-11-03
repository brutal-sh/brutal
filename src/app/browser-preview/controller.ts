import { ref, shallowRef } from 'vue'

import type { BrowserCapture, BrowserCaptureScope } from './capture'
import type { BrowserImportTarget } from './dom/placement'
import type { BrowserPreviewNative } from './native'
import { PREVIEW_PRESETS, previewURL } from './schema'
import type { PreviewAction, PreviewStatus } from './schema'

export interface CaptureTarget {
  /** Bound to the selected document and page; false after switching, replacing or closing it. */
  isCurrent(): boolean
  place(capture: BrowserCapture): Promise<void>
}

export function createBrowserPreviewController(
  native: BrowserPreviewNative,
  captureTarget: () => CaptureTarget,
  importTarget?: () => BrowserImportTarget
) {
  const address = ref('')
  const preset = ref('desktop')
  const status = shallowRef<PreviewStatus | null>(null)
  const busy = ref(false)
  const error = ref('')
  const notice = ref('')
  let disposed = false
  let revision = 0
  const isDisposed = () => disposed
  const selectedPreset = () =>
    PREVIEW_PRESETS.find((item) => item.value === preset.value) ?? PREVIEW_PRESETS[0]

  async function run(operation: () => Promise<void>) {
    if (busy.value || isDisposed()) return
    revision++
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      await operation()
    } catch (reason) {
      if (!isDisposed()) error.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      busy.value = false
    }
  }

  async function refresh() {
    if (busy.value || isDisposed()) return
    const startedAt = ++revision
    try {
      const result = await native.status()
      if (!isDisposed() && startedAt === revision) status.value = result
    } catch (reason) {
      // Polling keeps the user's action feedback, but failures remain visible in diagnostics.
      console.warn('[Browser preview] Could not refresh status', reason)
    }
  }

  return {
    address,
    preset,
    status,
    busy,
    error,
    notice,
    refresh,
    clearSiteData: (url: string) =>
      run(async () => {
        await native.clearSiteData(url)
        if (!isDisposed()) status.value = await native.status()
      }),
    navigate: () =>
      run(async () => {
        const result = await native.open(previewURL(address.value), selectedPreset())
        if (!isDisposed()) status.value = result
      }),
    clearPage: () =>
      run(async () => {
        await native.action('close')
        if (!isDisposed()) {
          status.value = null
          address.value = ''
        }
      }),
    action: (action: PreviewAction) =>
      run(async () => {
        await native.action(action)
        if (!isDisposed()) status.value = await native.status()
      }),
    resize: () =>
      run(async () => {
        if (!status.value) return
        await native.resize(selectedPreset())
        if (!isDisposed()) status.value = await native.status()
      }),
    capture: (scope: BrowserCaptureScope = 'visible') =>
      run(async () => {
        const target = captureTarget()
        if (!target.isCurrent()) throw new Error('Select this document before capturing.')
        const current = await native.status()
        if (!current) throw new Error('Open a page in the preview first.')
        if (!current.captureAvailable)
          throw new Error('Browser capture is currently available on macOS.')
        const captured = await native.capture(current.url, scope)
        if (isDisposed() || !target.isCurrent()) {
          throw new Error('The document or page changed. Capture again into the selected design.')
        }
        await target.place(captured)
        if (!isDisposed())
          notice.value = 'Capture added to this design. You can undo it in the editor.'
      }),
    importPage: (selected = false) =>
      run(async () => {
        if (!importTarget) throw new Error('Editable browser import is unavailable.')
        const target = importTarget()
        if (!target.isCurrent()) throw new Error('Select this document before importing.')
        const current = await native.status()
        if (!current) throw new Error('Open a page in the preview first.')
        const page = await native.extract(current.url, selected)
        if (isDisposed() || !target.isCurrent())
          throw new Error('The document or selection changed. Import again.')
        await target.place(page, () => !isDisposed() && target.isCurrent())
        if (!isDisposed())
          notice.value = 'Editable page added at its captured width. You can undo it in the editor.'
      }),
    dispose: () => {
      disposed = true
    }
  }
}
