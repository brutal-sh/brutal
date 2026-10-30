import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import type { PreviewBounds } from './dock'
import { validateExtractedPage, type ExtractedPage } from './dom/schema'
import { captureBytes, previewStatusSchema } from './schema'
import type { PreviewAction, PreviewPreset, PreviewStatus } from './schema'

export interface BrowserPreviewNative {
  open(url: string, preset: PreviewPreset): Promise<PreviewStatus>
  status(): Promise<PreviewStatus | null>
  action(action: PreviewAction): Promise<void>
  resize(preset: PreviewPreset): Promise<void>
  capture(url: string): Promise<Uint8Array<ArrayBuffer>>
  extract(url: string): Promise<ExtractedPage>
}

let pendingPreviewOperation: Promise<unknown> = Promise.resolve()

/** Serialize native surface changes so an unmount closes even a still-opening child. */
export function createBrowserPreviewNative(
  bounds: () => PreviewBounds | null,
  callNative: typeof invoke = invoke
) {
  let disposed = false
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = pendingPreviewOperation.catch(() => undefined).then(operation)
    pendingPreviewOperation = next
    return next
  }
  const requireBounds = () => {
    const result = bounds()
    if (disposed || !result) throw new Error('The browser dock is not visible. Try again.')
    return result
  }
  const native: BrowserPreviewNative = {
    open: (url) =>
      enqueue(async () =>
        v.parse(
          previewStatusSchema,
          await callNative('browser_preview_open', { url, bounds: requireBounds() })
        )
      ),
    status: async () =>
      v.parse(v.nullable(previewStatusSchema), await callNative('browser_preview_status')),
    action: (action) => enqueue(() => callNative('browser_preview_action', { action })),
    resize: () => enqueue(() => callNative('browser_preview_resize', { bounds: requireBounds() })),
    capture: (url) =>
      enqueue(async () => captureBytes(await callNative('browser_preview_capture', { url }))),
    extract: (url) =>
      enqueue(async () => {
        const requestId = crypto.randomUUID()
        return validateExtractedPage(
          await callNative('browser_preview_extract', { url, requestId }),
          requestId,
          url
        )
      })
  }
  return {
    native,
    syncBounds: () =>
      enqueue(async () => {
        if (!disposed) await callNative('browser_preview_layout', { bounds: bounds() })
      }),
    dispose: () => {
      disposed = true
      return enqueue(() => callNative('browser_preview_action', { action: 'close' }))
    }
  }
}
