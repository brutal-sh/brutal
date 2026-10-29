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
    captureAvailable: true
  }
  const callNative: typeof invoke = async <T>(command: string): Promise<T> => {
    commands.push(command)
    if (commands.length === 1) return (await pending.promise) as T
    return (command === 'browser_preview_open' ? status : undefined) as T
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
    'browser_preview_action',
    'browser_preview_open'
  ])
  await second.dispose()
})
