import { expect, test } from 'bun:test'

import type { invoke } from '@tauri-apps/api/core'

import { nativePreviewViewport } from '@/app/browser-preview/layout'
import { createBrowserPreviewNative } from '@/app/browser-preview/native'
import { PREVIEW_PRESETS } from '@/app/browser-preview/schema'

test('matches native WebKit measurements at fractional and float boundary lengths', () => {
  const viewport = {
    bounds: { x: 903.203124, y: 60, width: 334.0876777251185, height: 723 },
    layoutOrigin: { x: 895.1875, y: 52 },
    zoom: 0.5,
    viewport: { width: 390, height: 844 }
  }
  expect(nativePreviewViewport(viewport)).toEqual({
    bounds: { x: 903.1875, y: 60, width: 334.078125, height: 723 },
    zoom: 0.5,
    viewport: { width: 390, height: 844 }
  })
  expect(viewport.bounds.width).toBe(334.0876777251185)
  expect(
    nativePreviewViewport({
      ...viewport,
      bounds: { ...viewport.bounds, width: 389.99999999999994 }
    })?.bounds.width
  ).toBe(390)
  expect(nativePreviewViewport(null)).toBeNull()
})

test('uses the same projected CSS rectangle for native open, resize and layout', async () => {
  const projected = {
    bounds: { x: 903.1905361374407, y: 60, width: 334.0876777251185, height: 723 },
    layoutOrigin: { x: 895.1875, y: 52 },
    zoom: 0.5,
    viewport: { width: 390, height: 844 }
  }
  const requests: { command: string; args: Parameters<typeof invoke>[1] }[] = []
  const status = {
    url: 'https://fixture.test/',
    title: 'Fixture',
    width: 334.078125,
    height: 723,
    captureAvailable: true
  }
  const callNative: typeof invoke = async <T>(
    command: string,
    args?: Parameters<typeof invoke>[1]
  ): Promise<T> => {
    requests.push({ command, args })
    return (
      command === 'browser_preview_open' || command === 'browser_preview_status'
        ? status
        : undefined
    ) as T
  }
  const bridge = createBrowserPreviewNative(() => projected, callNative)
  try {
    await bridge.native.open(status.url, PREVIEW_PRESETS[1])
    await bridge.native.resize(PREVIEW_PRESETS[1])
    await bridge.syncBounds()
    expect(requests.map(({ command }) => command)).toEqual([
      'browser_preview_open',
      'browser_preview_resize',
      'browser_preview_layout'
    ])
    for (const { args } of requests) {
      expect(args).toMatchObject({
        bounds: { x: 903.1875, y: 60, width: 334.078125, height: 723 },
        viewport: { width: 390, height: 844 }
      })
      expect(args).not.toHaveProperty('layoutOrigin')
    }
  } finally {
    await bridge.dispose()
  }
})
