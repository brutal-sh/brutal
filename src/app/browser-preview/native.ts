import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import { imageHeader } from '@open-pencil/scene-graph/images'

import { readBrowserCapture, type BrowserCapture, type BrowserCaptureScope } from './capture'
import type { PreviewViewport } from './dock'
import { validateExtractedPage, type ExtractedPage } from './dom/schema'
import type { BrowserPickerNative } from './picker/controller'
import { validateBrowserPicker } from './picker/schema'
import { captureBytes, previewStatusSchema } from './schema'
import type { PreviewAction, PreviewPreset, PreviewStatus } from './schema'

export interface BrowserPreviewNative {
  open(url: string, preset: PreviewPreset): Promise<PreviewStatus>
  status(): Promise<PreviewStatus | null>
  action(action: PreviewAction): Promise<void>
  resize(preset: PreviewPreset): Promise<void>
  capture(url: string, scope?: BrowserCaptureScope): Promise<BrowserCapture>
  backdrop(url: string): Promise<Uint8Array<ArrayBuffer>>
  clearSiteData(url: string): Promise<void>
  extract(url: string, selected?: boolean): Promise<ExtractedPage>
}

let pendingPreviewOperation: Promise<unknown> = Promise.resolve()

export async function authorizeBrowserExport(path: string): Promise<string> {
  return v.parse(v.string(), await invoke('authorize_browser_export', { path }))
}

export async function openBrowserExportExternally(url: string, folder = false): Promise<void> {
  await invoke('browser_preview_open_export', { url, folder })
}

/** Serialize native surface changes so an unmount closes even a still-opening child. */
export function createBrowserPreviewNative(
  viewport: () => PreviewViewport | null,
  callNative: typeof invoke = invoke,
  exportURL?: (input: string) => string | undefined
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
    const result = viewport()
    if (disposed || !result) throw new Error('The browser dock is not visible. Try again.')
    return result
  }
  const native: BrowserPreviewNative = {
    clearSiteData: (url) =>
      enqueue(async () => {
        requireBounds()
        if (!opened) throw new Error('Open a page before clearing its data.')
        await callNative('browser_preview_clear_site_data', { url })
      }),
    open: (url) =>
      enqueue(async () => {
        const status = v.parse(
          previewStatusSchema,
          await callNative('browser_preview_open', { url, ...requireBounds() })
        )
        opened = true
        return status
      }),
    status: async () =>
      opened
        ? v.parse(v.nullable(previewStatusSchema), await callNative('browser_preview_status'))
        : null,
    action: (action) => enqueue(() => callNative('browser_preview_action', { action })),
    resize: () => enqueue(() => callNative('browser_preview_resize', { ...requireBounds() })),
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
    backdrop: (url) =>
      enqueue(async () => {
        // Editor overlays hide the native view before requesting their read-only frame.
        if (disposed || !opened) throw new Error('Open a page before preparing its backdrop.')
        capturing = true
        try {
          const bytes = captureBytes(await callNative('browser_preview_backdrop', { url }))
          const header = imageHeader(bytes)
          if (
            !header ||
            header.width < 1 ||
            header.height < 1 ||
            header.width * header.height > 16_000_000
          )
            throw new Error('The browser returned invalid frame dimensions.')
          return bytes
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
          url,
          exportURL?.(url)
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
        url,
        exportURL?.(url)
      )
    })
  return {
    native,
    picker,
    syncBounds: () =>
      enqueue(async () => {
        if (!disposed) {
          const current = viewport()
          await callNative('browser_preview_layout', current ? { ...current } : { bounds: null })
        }
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
