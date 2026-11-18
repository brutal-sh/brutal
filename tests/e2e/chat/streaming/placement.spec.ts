import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'
import { setupPlacementScene, type PlacementScenario } from '#tests/helpers/chat/placement-scene'
import {
  documentSnapshot,
  previewKey,
  SCENE_SCREENSHOT_STYLE,
  setupCanvas
} from '#tests/helpers/chat/render-preview'
import { installRenderStream } from '#tests/helpers/chat/render-stream'

const scenarios: PlacementScenario[] = [
  'nested-fill',
  'nested-hug',
  'nested-replace',
  'top-level-replace',
  'page-insertion',
  'rotated-clip'
]

for (const scenario of scenarios) {
  test(`matches the final render for ${scenario}`, async ({ configuredChat: chat }, testInfo) => {
    await setupCanvas(chat.page)
    const scene = await setupPlacementScene(chat.page, scenario)
    const before = await documentSnapshot(chat.page)
    const stream = await installRenderStream(chat.page, { ...scene, pauseAfter: ['/>'] })
    const canvas = new CanvasHelper(chat.page)
    const snapshot = `jsx-placement-${scenario}.png`
    try {
      await chat.submit('Render the proposed change')
      await expect.poll(() => stream.evaluate((s) => s.ready())).toBe(true)
      await stream.evaluate((s) => s.advance())
      await expect.poll(() => previewKey(chat.page)).not.toBe('')
      expect(await documentSnapshot(chat.page)).toEqual(before)
      await canvas.waitForRender()
      const preview = await canvas.screenshotCanvasRegion(640, 400, SCENE_SCREENSHOT_STYLE)
      await stream.evaluate((s) => s.complete())
      await expect(chat.assistantMessage()).toContainText('Rendered.')
      await expect.poll(() => previewKey(chat.page)).toBe('')
      await chat.page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.clearSelection()
        for (const renderer of store.canvasRenderers) renderer.aiClearAll()
        store.requestRepaint()
      })
      await canvas.waitForRender()
      const committed = await canvas.screenshotCanvasRegion(640, 400, SCENE_SCREENSHOT_STYLE)
      if (!preview.equals(committed)) {
        await testInfo.attach('preview', { body: preview, contentType: 'image/png' })
        await testInfo.attach('committed', { body: committed, contentType: 'image/png' })
      }
      expect(preview.equals(committed), 'preview and committed artwork pixels').toBe(true)
      await chat.page.evaluate(() => window.openPencil?.getStore?.().undoAction())
      expect(await documentSnapshot(chat.page)).toEqual(before)
      expect(committed).toMatchSnapshot(snapshot)
    } finally {
      await stream.evaluate((s) => s.dispose())
      await stream.dispose()
    }
  })
}
