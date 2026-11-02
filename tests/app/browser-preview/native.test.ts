import { expect, test } from 'bun:test'

import type { invoke } from '@tauri-apps/api/core'

import { createBrowserPreviewNative } from '@/app/browser-preview/native'
import { PREVIEW_PRESETS } from '@/app/browser-preview/schema'
import { createDeferred } from '@/app/runtime/deferred'

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
  const bounds = () => ({ x: 800, y: 100, width: 390, height: 600 })
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
    () => ({ x: 0, y: 0, width: 390, height: 600 }),
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
