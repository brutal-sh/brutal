import { ref, shallowRef } from 'vue'

import type { BrowserPreviewNative } from './native'
import { PREVIEW_PRESETS, previewURL } from './schema'
import type { PreviewAction, PreviewStatus } from './schema'

export interface CaptureTarget {
  /** Bound to the selected document and page; false after switching, replacing or closing it. */
  isCurrent(): boolean
  place(png: Uint8Array<ArrayBuffer>): Promise<void>
}

export function createBrowserPreviewController(
  native: BrowserPreviewNative,
  captureTarget: () => CaptureTarget
) {
  const address = ref('')
  const preset = ref('desktop')
  const status = shallowRef<PreviewStatus | null>(null)
  const busy = ref(false)
  const error = ref('')
  const notice = ref('')
  let disposed = false
  const selectedPreset = () =>
    PREVIEW_PRESETS.find((item) => item.value === preset.value) ?? PREVIEW_PRESETS[0]

  async function run(operation: () => Promise<void>) {
    if (busy.value || disposed) return
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      await operation()
    } catch (reason) {
      if (!disposed) error.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      busy.value = false
    }
  }

  async function refresh() {
    if (busy.value || disposed) return
    try {
      const result = await native.status()
      if (!disposed) status.value = result
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
    navigate: () =>
      run(async () => {
        const result = await native.open(previewURL(address.value), selectedPreset())
        if (!disposed) status.value = result
      }),
    action: (action: PreviewAction) =>
      run(async () => {
        await native.action(action)
        if (!disposed) status.value = await native.status()
      }),
    resize: () =>
      run(async () => {
        if (!status.value) return
        await native.resize(selectedPreset())
        if (!disposed) status.value = await native.status()
      }),
    capture: () =>
      run(async () => {
        const target = captureTarget()
        if (!target.isCurrent()) throw new Error('Select this document before capturing.')
        const current = await native.status()
        if (!current) throw new Error('Open a page in the preview first.')
        if (!current.captureAvailable)
          throw new Error('Browser capture is currently available on macOS.')
        const png = await native.capture(current.url)
        if (disposed || !target.isCurrent()) {
          throw new Error('The document or page changed. Capture again into the selected design.')
        }
        await target.place(png)
        if (!disposed) notice.value = 'Capture added to this design. You can undo it in the editor.'
      }),
    dispose: () => {
      disposed = true
    }
  }
}
