import { strict as assert } from 'node:assert'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { colorToFill } from '@open-pencil/scene-graph/color'

import { startNativeCanvasResourceProbe } from '#tests/helpers/tauri/canvas-resources'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

async function shapeCenter(id: string) {
  return browser.execute((id) => {
    const store = window.openPencil?.getStore?.()
    const node = store?.graph.getNode(id)
    const canvas = document.querySelector('[data-test-id="scene-canvas-element"]')
    if (
      !store ||
      !canvas ||
      node?.x === undefined ||
      node.y === undefined ||
      node.width === undefined ||
      node.height === undefined
    )
      throw new Error('Paint sample missing')
    const box = canvas.getBoundingClientRect()
    return {
      x:
        (box.x + store.state.panX + (node.x + node.width / 2) * store.state.zoom) *
        devicePixelRatio,
      y:
        (box.y + store.state.panY + (node.y + node.height / 2) * store.state.zoom) *
        devicePixelRatio
    }
  }, id)
}

describe('native document canvas ownership', () => {
  it('reuses contexts through twelve new documents and returns to the preserved original', async () => {
    await invokeNative('native_test_mcp_configuration')
    await ensureNativeEditorReady()
    await browser.waitUntil(() =>
      browser.execute(
        () =>
          document.querySelectorAll('canvas[data-ready="1"]').length === 2 &&
          window.openPencil?.getStore?.().canvasRenderers.length === 2
      )
    )
    const originalTab = await $('[data-test-id="tabbar-tab"][aria-selected="true"]').getAttribute(
      'id'
    )
    assert.ok(originalTab)
    const originalNode = await browser.execute(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Native editor unavailable')
      return store.createShape('RECTANGLE', 420, 260, 160, 120)
    })
    const probe = await startNativeCanvasResourceProbe()
    const samples = []
    const originalWindow = await browser.getWindowSize()
    let resized = false
    try {
      assert.equal((await probe.read()).contexts.length, 2)
      for (let index = 0; index < 12; index++) {
        const currentTab = await $(
          '[data-test-id="tabbar-tab"][aria-selected="true"]'
        ).getAttribute('id')
        await $('[data-test-id="tabbar-new"]').click()
        await browser.waitUntil(
          async () =>
            (await $('[data-test-id="tabbar-tab"][aria-selected="true"]').getAttribute('id')) !==
            currentTab
        )
        await browser.waitUntil(() =>
          browser.execute(
            () =>
              document.querySelectorAll('canvas[data-ready="1"]').length === 2 &&
              window.openPencil?.getStore?.().canvasRenderers.length === 2
          )
        )
        const sample = await probe.read()
        assert.ok(sample.contexts.length <= 3)
        assert.equal(sample.contexts.filter((context) => context.connected).length, 2)
        assert.ok(sample.contexts.every((context) => !context.lost && context.error === 0))
        assert.deepEqual(sample.errors, [])
        samples.push(sample)
      }
      const drawing = await browser.execute((fill) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        const id = store.createShape('RECTANGLE', 420, 260, 100, 80)
        store.graph.updateNode(id, { fills: [fill] })
        store.requestRender()
        return id
      }, colorToFill('#FF0000'))
      await browser.execute(async () => {
        for (let index = 0; index < 2; index++)
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
          })
      })
      const output = join(process.cwd(), 'local-evidence', 'gpu-reuse-2026-11-06')
      await mkdir(output, { recursive: true })
      await browser.saveScreenshot(join(output, 'native-after-twelve.png'))
      await writeFile(
        join(output, 'native-red-center.json'),
        JSON.stringify(await shapeCenter(drawing))
      )
      assert.ok(
        await browser.execute((id) => !!window.openPencil?.getStore?.().graph.getNode(id), drawing)
      )
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', '1'])
      await browser.waitUntil(
        async () =>
          (await $('[data-test-id="tabbar-tab"][aria-selected="true"]').getAttribute('id')) ===
          originalTab
      )
      await browser.waitUntil(() =>
        browser.execute(() => document.querySelectorAll('canvas[data-ready="1"]').length === 2)
      )
      assert.deepEqual(
        await browser.execute((id) => {
          const node = window.openPencil?.getStore?.().graph.getNode(id)
          return node && { width: node.width, height: node.height }
        }, originalNode),
        { width: 160, height: 120 }
      )
      for (const colorSpace of ['display-p3', 'srgb'] as const) {
        await browser.execute((colorSpace) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Native editor unavailable')
          store.setDocumentColorSpace(colorSpace)
        }, colorSpace)
        await browser.waitUntil(() =>
          browser.execute(() => window.openPencil?.getStore?.().canvasRenderers.length === 2)
        )
        const sample = await probe.read()
        assert.ok(sample.contexts.length <= 3)
        assert.ok(sample.contexts.every((context) => !context.lost && context.error === 0))
        assert.deepEqual(sample.errors, [])
      }
      const originalWidth = await browser.execute(() => innerWidth)
      resized = true
      await browser.setWindowSize(
        Math.round(originalWindow.width * 0.9),
        Math.round(originalWindow.height * 0.9)
      )
      await browser.waitUntil(() => browser.execute((width) => innerWidth !== width, originalWidth))
      await browser.waitUntil(() =>
        browser.execute(() =>
          Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-ready="1"]')).every(
            (canvas) =>
              canvas.width === Math.trunc(canvas.clientWidth * devicePixelRatio) &&
              canvas.height === Math.trunc(canvas.clientHeight * devicePixelRatio)
          )
        )
      )
      await browser.setWindowSize(originalWindow.width, originalWindow.height)
      await browser.waitUntil(() => browser.execute((width) => innerWidth === width, originalWidth))
      await browser.waitUntil(() =>
        browser.execute(() =>
          Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-ready="1"]')).every(
            (canvas) =>
              canvas.width === Math.trunc(canvas.clientWidth * devicePixelRatio) &&
              canvas.height === Math.trunc(canvas.clientHeight * devicePixelRatio)
          )
        )
      )
      resized = false
      const final = await probe.read()
      assert.ok(final.contexts.length <= 3)
      assert.ok(final.contexts.every((context) => !context.lost && context.error === 0))
      assert.deepEqual(final.errors, [])
      await writeFile(
        join(output, 'native-contexts.json'),
        JSON.stringify({ switches: samples, afterResize: final }, null, 2)
      )
      await browser.saveScreenshot(join(output, 'native-original-restored.png'))
      await writeFile(
        join(output, 'native-original-center.json'),
        JSON.stringify(await shapeCenter(originalNode))
      )
    } finally {
      if (resized) await browser.setWindowSize(originalWindow.width, originalWindow.height)
      await probe.stop()
    }
  })
})
