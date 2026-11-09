import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const design = {
  version: '2.22',
  children: [
    {
      id: 'frame',
      type: 'frame',
      name: 'Cold text import',
      width: 240,
      height: 160,
      layout: 'none',
      fill: '#FFFFFF',
      clip: true,
      children: [
        {
          id: 'label',
          type: 'text',
          name: 'Vector text',
          x: 16,
          y: 106,
          content: 'SVG 1:1',
          fontFamily: 'Inter',
          fontSize: 24,
          fontWeight: '600',
          fill: '#171719'
        }
      ]
    }
  ]
}

test('cold Pen text keeps its measured bounds and pixels after saving and reopening', async ({
  page
}, info) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test&no-chrome&no-rulers')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const choosing = page.waitForEvent('filechooser')
  await page.keyboard.press('ControlOrMeta+KeyO')
  await (
    await choosing
  ).setFiles({
    name: 'cold-text.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(design))
  })
  await canvas.waitForInit()

  async function checkTextAndPixels() {
    const bounds = await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor store unavailable')
      const label = store.graph.getNode('label')
      if (!label) throw new Error('Imported text unavailable')
      store.zoomTo100()
      store.pan(160 - store.state.panX, 80 - store.state.panY)
      store.select([label.id])
      store.requestRender()
      return { width: label.width, height: label.height }
    })
    expect(bounds).toEqual({ width: 85, height: 29 })
    await canvas.waitForRender()
    const area = await canvas.canvas.boundingBox()
    if (!area) throw new Error('Canvas unavailable')
    expect(
      await page.screenshot({
        clip: { x: area.x + 140, y: area.y + 60, width: 280, height: 220 }
      })
    ).toMatchSnapshot('pen-cold-text.png', { maxDiffPixelRatio: 0, threshold: 0 })
    canvas.assertNoErrors()
  }

  await checkTextAndPixels()
  page.once('dialog', (dialog) => dialog.accept('roundtrip.pen'))
  const saving = page.waitForEvent('download')
  await page.keyboard.press('ControlOrMeta+Shift+KeyS')
  const saved = await saving
  expect(saved.suggestedFilename()).toBe('roundtrip.pen')
  const savedPath = info.outputPath('roundtrip.pen')
  await saved.saveAs(savedPath)
  const reopening = page.waitForEvent('filechooser')
  await page.keyboard.press('ControlOrMeta+KeyO')
  await (await reopening).setFiles(savedPath)
  await canvas.waitForInit()
  await checkTextAndPixels()
})
