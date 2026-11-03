import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import { readBrowserCapture, type BrowserCapture, type BrowserCaptureScope } from './capture'
import type { PreviewBounds } from './dock'
import { validateExtractedPage, type ExtractedPage } from './dom/schema'
import type { BrowserPickerNative } from './picker/controller'
import { validateBrowserPicker } from './picker/schema'
import { previewStatusSchema } from './schema'
import type { PreviewAction, PreviewPreset, PreviewStatus } from './schema'

export interface BrowserPreviewNative {
  open(url: string, preset: PreviewPreset): Promise<PreviewStatus>
  status(): Promise<PreviewStatus | null>
  action(action: PreviewAction): Promise<void>
  resize(preset: PreviewPreset): Promise<void>
  capture(url: string, scope?: BrowserCaptureScope): Promise<BrowserCapture>
  extract(url: string, selected?: boolean): Promise<ExtractedPage>
}

let pendingPreviewOperation: Promise<unknown> = Promise.resolve()

/** Serialize native surface changes so an unmount closes even a still-opening child. */
export function createBrowserPreviewNative(
  bounds: () => PreviewBounds | null,
  callNative: typeof invoke = invoke
) {
  let disposed = false
  let opened = false
  let capturing = false
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
      enqueue(async () => {
        const status = v.parse(
          previewStatusSchema,
          await callNative('browser_preview_open', { url, bounds: requireBounds() })
        )
        opened = true
        return status
      }),
    status: async () =>
      opened
        ? v.parse(v.nullable(previewStatusSchema), await callNative('browser_preview_status'))
        : null,
    action: (action) => enqueue(() => callNative('browser_preview_action', { action })),
    resize: () => enqueue(() => callNative('browser_preview_resize', { bounds: requireBounds() })),
    capture: (url, scope = 'visible') =>
      enqueue(async () => {
        requireBounds()
        if (!opened) throw new Error('Open a page before capturing a screenshot.')
        const requestId = crypto.randomUUID()
        capturing = true
        try {
          return readBrowserCapture(
            await callNative('browser_preview_screenshot', {
              url,
              requestId,
              scope
            }),
            requestId,
            url
          )
        } finally {
          capturing = false
        }
      }),
    extract: (url, selected = false) =>
      enqueue(async () => {
        const requestId = crypto.randomUUID()
        return validateExtractedPage(
          await callNative('browser_preview_extract', {
            url,
            requestId,
            ...(selected ? { selected: true } : {})
          }),
          requestId,
          url
        )
      })
  }
  const picker: BrowserPickerNative = (url, action, index) =>
    enqueue(async () => {
      requireBounds()
      if (!opened) throw new Error('Open a page before selecting an element.')
      const requestId = crypto.randomUUID()
      return validateBrowserPicker(
        await callNative('browser_preview_picker', {
          url,
          requestId,
          action,
          index
        }),
        requestId,
        url
      )
    })
  return {
    native,
    picker,
    syncBounds: () =>
      enqueue(async () => {
        if (!disposed) await callNative('browser_preview_layout', { bounds: bounds() })
      }),
    dispose: () => {
      disposed = true
      // Cancellation bypasses the queue held by the in-flight tiled capture.
      if (capturing)
        void callNative('browser_preview_action', { action: 'cancelcapture' }).catch(
          (reason: unknown) => console.warn('[Browser preview] Could not cancel capture', reason)
        )
      return enqueue(async () => {
        try {
          return await native.status()
        } finally {
          await callNative('browser_preview_action', { action: 'close' })
        }
      })
    }
  }
}
