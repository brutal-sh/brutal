import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { previewDockViewport } from '@/app/browser-preview/dock'

describe('embedded browser dock', () => {
  test('fills the responsive dock and fits fixed CSS viewports inside its padding', () => {
    const rect = { x: 800, y: 160, width: 480, height: 600 }
    expect(previewDockViewport(rect, 'desktop', 1280, 800, 0.5)).toEqual({
      bounds: rect,
      zoom: 0.5,
      viewport: { width: 960, height: 1200 }
    })
    const phone = previewDockViewport(rect, 'phone', 1280, 800, 0.5)
    if (!phone) throw new Error('Missing phone viewport')
    expect(phone.bounds.height).toBe(584)
    expect(phone.bounds.width / phone.zoom).toBeCloseTo(390)
    expect(phone.bounds.height / phone.zoom).toBeCloseTo(844)
    expect(phone.bounds.y).toBe(168)
    expect(phone.bounds.x + phone.bounds.width / 2).toBe(1040)
    const tablet = previewDockViewport(
      { x: 0, y: 0, width: 1400, height: 800 },
      'tablet',
      1400,
      800,
      0.5
    )
    if (!tablet) throw new Error('Missing tablet viewport')
    expect(tablet.bounds.height).toBe(784)
    expect(tablet.bounds.width / tablet.zoom).toBeCloseTo(1180)
    expect(tablet.bounds.height / tablet.zoom).toBeCloseTo(820)
    expect(tablet.bounds.y).toBe(8)
  })
  test('clips to the window, bounds responsive zoom and refuses unusable fixed viewports', () => {
    expect(
      previewDockViewport({ x: 900, y: 200, width: 500, height: 800 }, 'desktop', 1280, 800, 2)
    ).toEqual({
      bounds: { x: 900, y: 200, width: 380, height: 600 },
      zoom: 1.5,
      viewport: { width: 253, height: 400 }
    })
    expect(
      previewDockViewport({ x: 0, y: 0, width: 100, height: 50 }, 'phone', 1280, 800, 0.5)
    ).toBeNull()
    for (const width of [0, -1, Number.NaN, Infinity])
      expect(
        previewDockViewport({ x: 0, y: 0, width, height: 600 }, 'desktop', 1280, 800, 1)
      ).toBeNull()
  })
  test('main capabilities select the editor webview, never all children of its window', () => {
    const main = JSON.parse(readFileSync('desktop/capabilities/default.json', 'utf8'))
    const config = JSON.parse(readFileSync('desktop/tauri.native-test.conf.json', 'utf8'))
    const nativeTest = config.app.security.capabilities.find(
      (entry: { identifier?: string }) => entry.identifier === 'native-test-mcp'
    )
    for (const capability of [main, nativeTest]) {
      expect(capability.webviews).toEqual(['main'])
      expect(capability.windows).toBeUndefined()
      expect(capability.remote).toBeUndefined()
    }
  })
})
