import { describe, expect, test } from 'bun:test'

import type { BrowserCapture } from '@/app/browser-preview/capture'
import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import type { BrowserImportTarget } from '@/app/browser-preview/dom/placement'
import type { ExtractedPage } from '@/app/browser-preview/dom/schema'
import type { BrowserPreviewNative } from '@/app/browser-preview/native'
import { captureBytes, previewAddressLabel, previewURL } from '@/app/browser-preview/schema'
import { createDeferred } from '@/app/runtime/deferred'

import { extractedFixture } from '#tests/helpers/browser-preview/extracted-page'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const capture: BrowserCapture = {
  url: 'https://example.test/',
  title: 'Fixture',
  slices: [{ png, width: 1280, height: 800 }]
}

test('clips whole-page imports while retaining selected and full-page extractions', async () => {
  const page = extractedFixture()
  const placed: ExtractedPage[] = []
  const selections: boolean[] = []
  const { preview } = fixture(
    {
      extract: async (url, selected = false) => {
        expect(url).toBe(page.url)
        selections.push(selected)
        return page
      }
    },
    undefined,
    () => ({
      isCurrent: () => true,
      place: async (result, isLive) => {
        expect(isLive()).toBe(true)
        placed.push(result)
      }
    })
  )
  await preview.importPage(false, 120)
  expect(placed[0]).toMatchObject({ height: 120, width: 800 })
  expect(placed[0]?.nodes).toBe(page.nodes)
  expect(page.height).toBe(600)
  await preview.importPage(true, 120)
  expect(placed[1]).toBe(page)
  await preview.importPage()
  expect(placed[2]).toBe(page)
  expect(selections).toEqual([false, true, false])
  await preview.importPage(false, 0)
  expect(placed).toHaveLength(3)
  expect(preview.error.value).toContain('positive, finite')
  expect(preview.notice.value).toBe('')
})

function fixture(
  overrides: Partial<BrowserPreviewNative> = {},
  exportURL?: () => string | undefined,
  importTarget?: () => BrowserImportTarget
) {
  const calls: unknown[] = []
  const status = {
    url: 'https://example.test/',
    title: 'Fixture',
    width: 1280,
    height: 800,
    captureAvailable: true,
    loading: false
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
    capture: async () => capture,
    backdrop: async () => png,
    clearSiteData: async () => undefined,
    extract: async () => {
      throw new Error('No extraction fixture')
    },
    ...overrides
  }
  let current = true
  const placed: BrowserCapture[] = []
  const preview = createBrowserPreviewController(
    native,
    () => ({
      isCurrent: () => current,
      place: async (image) => {
        placed.push(image)
      }
    }),
    importTarget,
    exportURL
  )
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
  test('opens only the explicitly authorized local export address', async () => {
    const url = 'file:///design/owned-export.html'
    const { preview, calls } = fixture({}, () => url)
    preview.address.value = 'file:///design/another.html'
    await preview.navigate()
    expect(calls).toEqual([])
    expect(preview.error.value).toContain('Only HTTP and HTTPS')
    preview.address.value = url
    await preview.navigate()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual([url, expect.objectContaining({ value: 'desktop' })])
    expect(preview.error.value).toBe('')
  })

  test('an expired export authorization restores the normal local-file refusal', async () => {
    let allowed: string | undefined = 'file:///design/owned-export.html'
    const { preview, calls } = fixture({}, () => allowed)
    preview.address.value = allowed
    await preview.navigate()
    allowed = undefined
    await preview.navigate()
    expect(calls).toHaveLength(1)
    expect(preview.error.value).toContain('Only HTTP and HTTPS')
  })
  test('address labels omit only the default scheme and an empty trailing slash', () => {
    expect(previewAddressLabel('https://example.com/')).toBe('example.com')
    expect(previewAddressLabel('https://example.com/path?q=1#section')).toBe(
      'example.com/path?q=1#section'
    )
    expect(previewAddressLabel('http://example.com/')).toBe('http://example.com')
    expect(previewAddressLabel('http://localhost:8080/')).toBe('localhost:8080')
    expect(previewAddressLabel('https://localhost:8080/')).toBe('https://localhost:8080')
    expect(previewAddressLabel('unfinished address')).toBe('unfinished address')
  })
  test('normalizes web addresses while retaining privileged URL refusals', () => {
    expect(previewURL('example.com/path?q=1#section')).toBe('https://example.com/path?q=1#section')
    expect(previewURL('localhost:8080/page')).toBe('http://localhost:8080/page')
    expect(previewURL('127.0.0.1:8080/page')).toBe('http://127.0.0.1:8080/page')
    expect(previewURL('[::1]:8080/page')).toBe('http://[::1]:8080/page')
    expect(previewURL('example.com:8443')).toBe('https://example.com:8443/')
    expect(() => previewURL('/etc/hosts')).toThrow()
  })

  test('closing the page clears its address while retaining the chosen viewport', async () => {
    const { preview, calls } = fixture()
    preview.address.value = 'https://example.test/'
    preview.preset.value = 'phone'
    await preview.navigate()
    await preview.clearPage()
    expect(calls.at(-1)).toBe('close')
    expect(preview.address.value).toBe('')
    expect(preview.status.value).toBeNull()
    expect(preview.preset.value).toBe('phone')
  })

  test('a failed page close retains the loaded page and its retryable address', async () => {
    const { preview } = fixture({
      action: async () => {
        throw new Error('Close failed')
      }
    })
    preview.address.value = 'https://example.test/'
    await preview.navigate()
    await preview.clearPage()
    expect(preview.address.value).toBe('https://example.test/')
    expect(preview.status.value?.url).toBe('https://example.test/')
    expect(preview.error.value).toBe('Close failed')
  })

  test('a late status poll cannot resurrect a page after it is closed', async () => {
    const pending = createDeferred<Awaited<ReturnType<BrowserPreviewNative['status']>>>()
    const { preview } = fixture({ status: () => pending.promise })
    preview.address.value = 'https://example.test/'
    await preview.navigate()
    const previous = preview.status.value
    const refreshing = preview.refresh()
    await preview.clearPage()
    pending.resolve(previous)
    await refreshing
    expect(preview.status.value).toBeNull()
    expect(preview.address.value).toBe('')
  })

  test('overlapping polls retain the newest page when an older response arrives last', async () => {
    const first = createDeferred<Awaited<ReturnType<BrowserPreviewNative['status']>>>()
    const second = createDeferred<Awaited<ReturnType<BrowserPreviewNative['status']>>>()
    let reads = 0
    const { preview } = fixture({ status: () => (reads++ === 0 ? first.promise : second.promise) })
    preview.address.value = 'https://example.test/'
    await preview.navigate()
    const previous = preview.status.value
    if (!previous) throw new Error('Fixture page did not open')
    const older = preview.refresh()
    const newer = preview.refresh()
    second.resolve({ ...previous, url: 'https://example.test/next' })
    await newer
    first.resolve(previous)
    await older
    expect(preview.status.value?.url).toBe('https://example.test/next')
  })

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
    expect(placed).toEqual([capture])
    expect(preview.notice.value).toContain('added')
    expect(preview.busy.value).toBe(false)
  })

  test('does not insert a delayed capture after its document/page changes', async () => {
    const pending = createDeferred<BrowserCapture>()
    const { preview, placed, changeDocument } = fixture({ capture: () => pending.promise })
    const work = preview.capture()
    await Promise.resolve()
    changeDocument()
    pending.resolve(capture)
    await work
    expect(placed).toEqual([])
    expect(preview.error.value).toContain('document or page changed')
  })

  test('does not insert after the controls are disposed or repeat a pending capture', async () => {
    const pending = createDeferred<BrowserCapture>()
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
    pending.resolve(capture)
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

test.each([undefined, 120])(
  'editable import waits for extraction and suppresses a disposed or switched destination (%s)',
  async (height) => {
    const { extractedFixture } = await import('#tests/helpers/browser-preview/extracted-page')
    const page = extractedFixture()
    const pending = createDeferred<typeof page>()
    let current = true
    let inserted = 0
    let extractionCalls = 0
    const native: BrowserPreviewNative = {
      open: async () => {
        throw new Error('unused')
      },
      status: async () => ({
        url: page.url,
        title: page.title,
        width: 800,
        height: 600,
        captureAvailable: true,
        loading: false
      }),
      action: async () => undefined,
      resize: async () => undefined,
      capture: async () => capture,
      backdrop: async () => png,
      clearSiteData: async () => undefined,
      extract: async () => {
        extractionCalls++
        return pending.promise
      }
    }
    const preview = createBrowserPreviewController(
      native,
      () => ({ isCurrent: () => current, place: async () => undefined }),
      () => ({
        isCurrent: () => current,
        place: async (_page, isLive) => {
          if (isLive()) inserted++
        }
      })
    )
    const work = preview.importPage(false, height)
    await preview.importPage(false, height)
    current = false
    pending.resolve(page)
    await work
    expect(extractionCalls).toBe(1)
    expect(inserted).toBe(0)
    expect(preview.notice.value).toBe('')
    expect(preview.error.value).not.toBe('')
    current = true
    await preview.importPage(false, height)
    expect(inserted).toBe(1)
    expect(preview.notice.value).not.toBe('')
  }
)

test('closing the controller during asynchronous import preparation cancels its commit', async () => {
  const { extractedFixture } = await import('#tests/helpers/browser-preview/extracted-page')
  const page = extractedFixture()
  const prepared = createDeferred<undefined>()
  let inserted = false
  const native: BrowserPreviewNative = {
    open: async () => {
      throw new Error('unused')
    },
    status: async () => ({
      url: page.url,
      title: page.title,
      width: 800,
      height: 600,
      captureAvailable: true,
      loading: false
    }),
    action: async () => undefined,
    resize: async () => undefined,
    capture: async () => capture,
    backdrop: async () => png,
    clearSiteData: async () => undefined,
    extract: async () => page
  }
  const preview = createBrowserPreviewController(
    native,
    () => ({ isCurrent: () => true, place: async () => undefined }),
    () => ({
      isCurrent: () => true,
      place: async (_page, isLive) => {
        await prepared.promise
        inserted = isLive()
      }
    })
  )
  const work = preview.importPage()
  await Promise.resolve()
  await Promise.resolve()
  preview.dispose()
  prepared.resolve(undefined)
  await work
  expect(inserted).toBe(false)
  expect(preview.notice.value).toBe('')
})
