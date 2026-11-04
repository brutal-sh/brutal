import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('a document waits for a paused presentation and becomes usable when animation frames resume', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  const file = await chooser
  const paused = await page.evaluateHandle(() => {
    const request = window.requestAnimationFrame
    const cancel = window.cancelAnimationFrame
    const callbacks = new Map<number, FrameRequestCallback>()
    let next = 1_000_000_000
    window.requestAnimationFrame = (callback) => {
      callbacks.set(++next, callback)
      return next
    }
    window.cancelAnimationFrame = (id) => {
      if (!callbacks.delete(id)) cancel.call(window, id)
    }
    return {
      restore() {
        window.requestAnimationFrame = request
        window.cancelAnimationFrame = cancel
        for (const callback of callbacks.values()) request.call(window, callback)
        callbacks.clear()
      }
    }
  })
  try {
    await file.setFiles({
      name: 'paused-canvas.pen',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          version: '2.21',
          children: [
            {
              type: 'frame',
              id: 'paused-frame',
              name: 'Paused frame',
              width: 160,
              height: 100,
              layout: 'none',
              fill: '#557799'
            }
          ]
        })
      )
    })
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(window.openPencil?.getStore?.().graph.getNode('paused-frame')))
      )
      .toBe(true)
    await expect(page.getByTestId('canvas-element')).toHaveAttribute('data-ready', '1')
    await expect
      .poll(() => page.evaluate(() => window.openPencil?.getStore?.().state.preparation?.phase))
      .toBe('preparing-render')
    await expect(page.getByTestId('canvas-loading')).toHaveCount(1)
  } finally {
    await paused.evaluate((state) => state.restore())
    await paused.dispose()
  }
  await canvas.waitForInit()
  await expect(page.getByTestId('canvas-loading')).toHaveCount(0)
  expect(await page.evaluate(() => window.openPencil?.getStore?.().state.preparation)).toBeNull()
  canvas.assertNoErrors()
})
