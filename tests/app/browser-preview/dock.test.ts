import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { previewDockBounds } from '@/app/browser-preview/dock'

describe('embedded browser dock', () => {
  test('uses available desktop area and centers a bounded phone viewport', () => {
    const rect = { x: 800, y: 160, width: 480, height: 600 }
    expect(previewDockBounds(rect, 'desktop', 1280, 800)).toEqual(rect)
    expect(previewDockBounds(rect, 'phone', 1280, 800)).toEqual({ ...rect, x: 845, width: 390 })
    expect(previewDockBounds({ ...rect, width: 300 }, 'phone', 1280, 800)?.width).toBe(300)
    expect(
      previewDockBounds({ x: 0, y: 0, width: 1400, height: 800 }, 'tablet', 1400, 800)
    ).toEqual({ x: 110, y: 0, width: 1180, height: 800 })
  })
  test('clips the surface to the window and rejects hidden/nonfinite rectangles', () => {
    expect(
      previewDockBounds({ x: 900, y: 200, width: 500, height: 800 }, 'desktop', 1280, 800)
    ).toEqual({ x: 900, y: 200, width: 380, height: 600 })
    for (const width of [0, -1, Number.NaN, Infinity])
      expect(previewDockBounds({ x: 0, y: 0, width, height: 600 }, 'desktop', 1280, 800)).toBeNull()
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
