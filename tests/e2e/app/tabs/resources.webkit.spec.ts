import { writeFile } from 'node:fs/promises'

import type { JSHandle } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { createCanvasResourceProbe } from '#tests/helpers/canvas/resources'
import { openAppMenu } from '#tests/helpers/menu'

const ctx = useEditorSetupWithClear()

test('switching documents reuses the canvas context after releasing the retired renderer', async () => {
  const { page, canvas } = ctx
  const retired = await page.getByTestId('scene-canvas-element').evaluateHandle((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Scene canvas missing')
    const context = element.getContext('webgl2') ?? element.getContext('webgl')
    if (!context) throw new Error('Scene WebGL context missing')
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor missing')
    return { canvas: element, context, editor, renderers: [...editor.canvasRenderers] }
  })
  try {
    await page.getByRole('button', { name: 'New design', exact: true }).click()
    await canvas.waitForInit()
    await expect
      .poll(() =>
        retired.evaluate(({ canvas, context, editor, renderers }) => ({
          current: canvas === document.querySelector('[data-test-id="scene-canvas-element"]'),
          lost: context.isContextLost(),
          retiredRenderers: editor.canvasRenderers.length,
          releasedSurfaces: renderers.every(
            (renderer) => renderer.isDestroyed() && renderer.surface.isDeleted()
          )
        }))
      )
      .toEqual({ current: true, lost: false, retiredRenderers: 0, releasedSurfaces: true })
    canvas.assertNoErrors()
  } finally {
    await retired.dispose()
  }
})

test('repeated document changes keep the active canvas drawing without exhausting GPU contexts', async () => {
  const { page, canvas } = ctx
  await canvas.drawRect(260, 180, 37, 29)
  const originalTab = await page
    .getByTestId('tabbar-tab')
    .and(page.locator('[aria-selected="true"]'))
    .getAttribute('id')
  if (!originalTab) throw new Error('Original document tab missing')
  const original = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Original editor missing')
    return store.graph
      .getChildren(store.state.currentPageId)
      .map((node) => ({ id: node.id, width: node.width, height: node.height }))
  })
  expect(original).toHaveLength(1)
  expect(original[0]).toMatchObject({ width: 37, height: 29 })
  const contexts = await page.evaluateHandle(createCanvasResourceProbe)
  try {
    expect(await contexts.evaluate((probe) => probe.read().length)).toBe(2)
    for (let index = 0; index < 12; index++) {
      await page.getByRole('button', { name: 'New design', exact: true }).click()
      await canvas.waitForInit()
      canvas.assertNoErrors()
      expect(await contexts.evaluate((probe) => probe.read().length)).toBeLessThanOrEqual(3)
    }
    await canvas.drawRect(120, 100, 100, 80)
    await canvas.waitForRender()
    const bounds = await page.getByTestId('canvas-area').boundingBox()
    if (!bounds) throw new Error('Active canvas bounds missing')
    expect(
      await page.screenshot({
        clip: { x: bounds.x + 110, y: bounds.y + 90, width: 120, height: 125 }
      })
    ).toMatchSnapshot('reused-canvas-drawing.png')
    await page.locator(`[id="${originalTab}"]`).click()
    await canvas.waitForInit()
    expect(
      await page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Restored editor missing')
        return store.graph
          .getChildren(store.state.currentPageId)
          .map((node) => ({ id: node.id, width: node.width, height: node.height }))
      })
    ).toEqual(original)
    canvas.assertNoErrors()
  } finally {
    const path = test.info().outputPath('canvas-contexts.json')
    await writeFile(path, JSON.stringify(await contexts.evaluate((probe) => probe.read()), null, 2))
    await test.info().attach('canvas-contexts', { path, contentType: 'application/json' })
    await contexts.evaluate((probe) => {
      probe.restore()
    })
    await contexts.dispose()
  }
})

test('switching documents while CanvasKit loads does not initialize retired canvases', async ({
  page
}) => {
  let release: () => void = () => undefined
  const loading = new Promise<void>((resolve) => {
    release = resolve
  })
  let intercepted = 0
  await page.route('**/*canvaskit*.wasm*', async (route) => {
    if (route.request().resourceType() === 'script') {
      await route.continue()
      return
    }
    intercepted++
    await loading
    await route.continue()
  })
  const canvas = new CanvasHelper(page)
  let contexts: JSHandle<ReturnType<typeof createCanvasResourceProbe>> | undefined
  try {
    await page.goto('/?test', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => intercepted).toBeGreaterThan(0)
    contexts = await page.evaluateHandle(createCanvasResourceProbe)
    expect(await contexts.evaluate((probe) => probe.read().length)).toBe(0)
    await test.step('create three documents before WASM resumes', async () => {
      for (let index = 0; index < 3; index++)
        await page.getByTestId('tabbar-new').click({ timeout: 3000 })
    })
    release()
    await expect(page.locator('canvas[data-ready="1"]')).toHaveCount(2, { timeout: 5000 })
    await canvas.waitForInit()
    await expect(page.locator('canvas[data-ready="1"]')).toHaveCount(2)
    expect(await contexts.evaluate((probe) => probe.read().length)).toBeLessThanOrEqual(3)
    await canvas.drawRect(120, 100, 100, 80)
    canvas.assertNoErrors()
  } catch (error) {
    if (!page.isClosed())
      await test.info().attach('delayed-canvas-state', {
        body: JSON.stringify(
          await page.evaluate(() => ({
            canvas: Array.from(document.querySelectorAll('canvas')).map(
              (element) => element.outerHTML
            ),
            store: !!window.openPencil?.getStore?.(),
            renderers: window.openPencil?.getStore?.().canvasRenderers.length
          })),
          null,
          2
        ),
        contentType: 'application/json'
      })
    throw error
  } finally {
    release()
    if (contexts && !page.isClosed()) {
      await contexts.evaluate((probe) => {
        probe.restore()
      })
      await contexts.dispose()
    }
  }
})

test('four-pane canvases stay bounded through keyboard closure, document switch and reopening', async () => {
  const { page, canvas } = ctx
  const contexts = await page.evaluateHandle(createCanvasResourceProbe)
  try {
    const headers = page.locator('[data-slot="canvas-pane-header"]')
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let count = 2; count <= 4; count++) {
        await openAppMenu(page, 'View')
        await page
          .getByRole('menuitem', { name: count === 3 ? 'Split down' : 'Split right' })
          .click()
        await expect(headers).toHaveCount(count)
        await expect(page.locator('canvas[data-ready="1"]')).toHaveCount(count * 2)
      }
      const full = await contexts.evaluate((probe) => probe.read())
      // Eight pane contexts plus CanvasKit's existing shared parking context.
      expect(full.length).toBeLessThanOrEqual(9)
      expect(full.filter((context) => context.connected)).toHaveLength(8)
      expect(full.every((context) => !context.lost)).toBe(true)
      for (let count = 3; count >= 1; count--) {
        await test.step(`close to ${count} panes, cycle ${cycle}`, async () => {
          const close = headers.last().getByRole('button', { name: 'Close view' })
          await close.focus()
          await close.press('Enter')
          await expect(page.locator('canvas[data-ready="1"]')).toHaveCount(count * 2)
        })
      }
      await page.getByTestId('tabbar-new').click()
      await canvas.waitForInit()
      const collapsed = await contexts.evaluate((probe) => probe.read())
      expect(collapsed.length).toBeLessThanOrEqual(9)
      expect(collapsed.filter((context) => context.connected)).toHaveLength(2)
      expect(collapsed.every((context) => !context.lost)).toBe(true)
      await canvas.drawRect(120, 100, 60, 40)
      canvas.assertNoErrors()
    }
  } finally {
    if (!page.isClosed()) {
      const path = test.info().outputPath('four-pane-contexts.json')
      await writeFile(
        path,
        JSON.stringify(await contexts.evaluate((probe) => probe.read()), null, 2)
      )
      await test.info().attach('four-pane-contexts', { path, contentType: 'application/json' })
      await contexts.evaluate((probe) => {
        probe.restore()
      })
      await contexts.dispose()
    }
  }
})
