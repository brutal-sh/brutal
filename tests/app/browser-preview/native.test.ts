import { expect, test } from 'bun:test'

import type { invoke } from '@tauri-apps/api/core'

import { createBrowserPreviewNative } from '@/app/browser-preview/native'
import { PREVIEW_PRESETS } from '@/app/browser-preview/schema'
import { createDeferred } from '@/app/runtime/deferred'

import { testPath } from '#tests/helpers/paths'

test('an owned hidden page can provide an overlay frame but cannot capture or clear site data', async () => {
  let visible = true
  const png = await Bun.file(testPath('fixtures/vectorize/python_logo.png')).arrayBuffer()
  const status = {
    url: 'https://example.test/',
    title: 'Page',
    width: 390,
    height: 600,
    captureAvailable: true
  }
  const commands: string[] = []
  const callNative: typeof invoke = async <T>(command: string): Promise<T> => {
    commands.push(command)
    return (command === 'browser_preview_backdrop' ? png : status) as T
  }
  const bridge = createBrowserPreviewNative(
    () =>
      visible
        ? {
            bounds: { x: 0, y: 0, width: 390, height: 600 },
            zoom: 1,
            viewport: { width: 390, height: 600 }
          }
        : null,
    callNative
  )
  await expect(bridge.native.backdrop(status.url)).rejects.toThrow()
  await bridge.native.open(status.url, PREVIEW_PRESETS[0])
  visible = false
  expect(await bridge.native.backdrop(status.url)).toEqual(new Uint8Array(png))
  await expect(bridge.native.capture(status.url)).rejects.toThrow()
  await expect(bridge.native.clearSiteData(status.url)).rejects.toThrow()
  expect(commands).toEqual(['browser_preview_open', 'browser_preview_backdrop'])
  await bridge.dispose()
  await expect(bridge.native.backdrop(status.url)).rejects.toThrow()
})

test('closing a still-opening dock precedes another document opening its preview', async () => {
  const pending = createDeferred<unknown>()
  const commands: string[] = []
  const status = {
    url: 'https://example.test/',
    title: 'fixture',
    width: 390,
    height: 600,
    captureAvailable: true,
    loading: false
  }
  const callNative: typeof invoke = async <T>(command: string): Promise<T> => {
    commands.push(command)
    if (commands.length === 1) return (await pending.promise) as T
    return (
      command === 'browser_preview_open' || command === 'browser_preview_status'
        ? status
        : undefined
    ) as T
  }
  const bounds = () => ({
    bounds: { x: 800, y: 100, width: 390, height: 600 },
    zoom: 1,
    viewport: { width: 390, height: 600 }
  })
  const first = createBrowserPreviewNative(bounds, callNative)
  const opening = first.native.open(status.url, PREVIEW_PRESETS[0])
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  const closing = first.dispose()
  const second = createBrowserPreviewNative(bounds, callNative)
  const reopened = second.native.open(status.url, PREVIEW_PRESETS[0])
  pending.resolve(status)
  await Promise.all([opening, closing, reopened])
  expect(commands).toEqual([
    'browser_preview_open',
    'browser_preview_status',
    'browser_preview_action',
    'browser_preview_open'
  ])
  expect(await closing).toEqual(status)
  await second.dispose()
})

test('a failed closing snapshot still destroys the child', async () => {
  const commands: string[] = []
  const callNative: typeof invoke = async <T>(command: string): Promise<T> => {
    commands.push(command)
    if (command === 'browser_preview_open')
      return {
        url: 'https://example.test/',
        title: '',
        width: 390,
        height: 600,
        captureAvailable: true,
        loading: false
      } as T
    return undefined as T
  }
  const bridge = createBrowserPreviewNative(
    () => ({
      bounds: { x: 0, y: 0, width: 390, height: 600 },
      zoom: 1,
      viewport: { width: 390, height: 600 }
    }),
    callNative
  )
  await bridge.native.open('https://example.test/', PREVIEW_PRESETS[0])
  await expect(bridge.dispose()).rejects.toThrow()
  expect(commands).toEqual([
    'browser_preview_open',
    'browser_preview_status',
    'browser_preview_action'
  ])
})

test('an unopened dock never adopts another document’s native page', async () => {
  const commands: string[] = []
  const callNative: typeof invoke = async <T>(command: string): Promise<T> => {
    commands.push(command)
    throw new Error('Foreign page must not be read')
  }
  const bridge = createBrowserPreviewNative(() => null, callNative)
  expect(await bridge.native.status()).toBeNull()
  expect(commands).toEqual([])
})

test('dock disposal cancels a screenshot before the queued status and close operations', async () => {
  const started = createDeferred<undefined>()
  const capture = createDeferred<unknown>()
  const commands: string[] = []
  const status = {
    url: 'https://example.test/',
    title: 'Page',
    width: 390,
    height: 600,
    captureAvailable: true,
    loading: false
  }
  const callNative: typeof invoke = async <T>(
    command: string,
    args?: Parameters<typeof invoke>[1]
  ): Promise<T> => {
    const label =
      command === 'browser_preview_action' && args && typeof args === 'object' && 'action' in args
        ? String(args.action)
        : command
    commands.push(label)
    if (command === 'browser_preview_screenshot') {
      started.resolve(undefined)
      return (await capture.promise) as T
    }
    if (label === 'cancelcapture') capture.reject(new Error('cancelled'))
    return (
      command === 'browser_preview_open' || command === 'browser_preview_status'
        ? status
        : undefined
    ) as T
  }
  const bridge = createBrowserPreviewNative(
    () => ({
      bounds: { x: 0, y: 0, width: 390, height: 600 },
      zoom: 1,
      viewport: { width: 390, height: 600 }
    }),
    callNative
  )
  await bridge.native.open(status.url, PREVIEW_PRESETS[0])
  const result = bridge.native.capture(status.url, 'full').catch(String)
  await started.promise
  const closing = bridge.dispose()
  expect(await result).toContain('cancelled')
  await closing
  expect(commands).toEqual([
    'browser_preview_open',
    'browser_preview_screenshot',
    'cancelcapture',
    'browser_preview_status',
    'close'
  ])
})
