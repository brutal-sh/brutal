import { describe, expect, test } from 'bun:test'

import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import type { BrowserPreviewNative } from '@/app/browser-preview/native'
import { captureBytes, previewURL } from '@/app/browser-preview/schema'
import { createDeferred } from '@/app/runtime/deferred'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
function fixture(overrides: Partial<BrowserPreviewNative> = {}) {
  const calls: unknown[] = []
  const status = {
    url: 'https://example.test/',
    title: 'Fixture',
    width: 1280,
    height: 800,
    captureAvailable: true
  }
  const native: BrowserPreviewNative = {
    open: async (...args) => {
      calls.push(args)
      return status
    },
    status: async () => status,
    action: async (action) => {
      calls.push(action)
    },
    resize: async (preset) => {
      calls.push(preset)
    },
    capture: async () => png,
    ...overrides
  }
  let current = true
  const placed: Uint8Array[] = []
  const preview = createBrowserPreviewController(native, () => ({
    isCurrent: () => current,
    place: async (image) => {
      placed.push(image)
    }
  }))
  return {
    preview,
    calls,
    placed,
    changeDocument: () => {
      current = false
    }
  }
}

describe('browser preview', () => {
  test('opens the address at the selected viewport and navigates only through fixed actions', async () => {
    const { preview, calls } = fixture()
    preview.address.value = ' https://example.test/path '
    preview.preset.value = 'phone'
    await preview.navigate()
    expect(calls[0]).toEqual([
      'https://example.test/path',
      { value: 'phone', label: 'Phone', width: 390, height: 844 }
    ])
    await preview.action('back')
    await preview.action('forward')
    await preview.action('reload')
    expect(calls.slice(1)).toEqual(['back', 'forward', 'reload'])
  })

  test('invalid addresses never reach native navigation', async () => {
    const { preview, calls } = fixture()
    for (const url of [
      'file:///etc/passwd',
      // oxlint-disable-next-line no-script-url -- Rejection fixture; never executed.
      'javascript:alert(1)',
      'data:text/html,test',
      'https://user:password@example.com',
      'https://tauri.localhost',
      'not a url'
    ]) {
      preview.address.value = url
      await preview.navigate()
      expect(preview.error.value).not.toBe('')
    }
    expect(calls).toEqual([])
    expect(previewURL('http://127.0.0.1:41234/test')).toBe('http://127.0.0.1:41234/test')
  })

  test('inserts a capture into the chosen document once and reports completion after placement', async () => {
    const { preview, placed } = fixture()
    await preview.capture()
    expect(placed).toEqual([png])
    expect(preview.notice.value).toContain('added')
    expect(preview.busy.value).toBe(false)
  })

  test('does not insert a delayed capture after its document/page changes', async () => {
    const pending = createDeferred<Uint8Array<ArrayBuffer>>()
    const { preview, placed, changeDocument } = fixture({ capture: () => pending.promise })
    const work = preview.capture()
    await Promise.resolve()
    changeDocument()
    pending.resolve(png)
    await work
    expect(placed).toEqual([])
    expect(preview.error.value).toContain('document or page changed')
  })

  test('does not insert after the controls are disposed or repeat a pending capture', async () => {
    const pending = createDeferred<Uint8Array<ArrayBuffer>>()
    let captures = 0
    const { preview, placed } = fixture({
      capture: () => {
        captures++
        return pending.promise
      }
    })
    const work = preview.capture()
    await preview.capture()
    preview.dispose()
    pending.resolve(png)
    await work
    expect(captures).toBe(1)
    expect(placed).toEqual([])
  })

  test('failed capture or image placement surfaces an error without a success message', async () => {
    const { preview, placed } = fixture({
      capture: async () => {
        throw new Error('Wait for loading')
      }
    })
    await preview.capture()
    expect(preview.error.value).toBe('Wait for loading')
    expect(preview.notice.value).toBe('')
    expect(placed).toEqual([])
  })

  test('rejects malformed and oversized native image payloads', () => {
    expect(() => captureBytes([137, 80])).toThrow('invalid image')
    expect(() => captureBytes(new ArrayBuffer(8))).toThrow('PNG')
    expect(() => captureBytes(new ArrayBuffer(17 * 1024 * 1024))).toThrow('too large')
    expect(captureBytes(png.buffer)).toEqual(png)
  })
})
