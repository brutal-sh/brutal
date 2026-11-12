import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { addPages } from '#tests/helpers/pages'
import {
  openFreshPage,
  pageBackgroundState,
  setPageBackground
} from '#tests/helpers/pages/background'
import { getPageChildren } from '#tests/helpers/store'

test.beforeEach(async ({ page }) => {
  await openFreshPage(page)
})

test('canvas fixtures use a clean light page without adding undo history', async ({ page }) => {
  expect(await pageBackgroundState(page)).toEqual({
    color: { r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 1 },
    pages: 1,
    canUndo: false,
    canRedo: false,
    dirty: false
  })
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.waitForInit()
  expect(await pageBackgroundState(page)).toEqual({
    color: { r: 0.96, g: 0.96, b: 0.96, a: 1 },
    pages: 1,
    canUndo: false,
    canRedo: false,
    dirty: false
  })
  canvas.assertNoErrors()
})

for (const color of [
  { r: 0.2, g: 0.4, b: 0.6, a: 1 },
  { r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 0.5 }
]) {
  test(`canvas initialization preserves a custom background with alpha ${color.a}`, async ({
    page
  }) => {
    await setPageBackground(page, color)
    await expect.poll(async () => (await pageBackgroundState(page)).dirty).toBe(true)
    const before = await pageBackgroundState(page)
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    expect(await pageBackgroundState(page)).toEqual(before)
    canvas.assertNoErrors()
  })
}

test('canvas initialization preserves a nonempty dark page and its editable history', async ({
  page
}) => {
  const canvas = new CanvasHelper(page)
  await canvas.drawRect(160, 180, 70, 40)
  await expect.poll(async () => (await getPageChildren(page)).length).toBe(1)
  const before = await pageBackgroundState(page)
  const children = await getPageChildren(page)
  expect(before).toMatchObject({ canUndo: true, dirty: true })
  await canvas.waitForInit()
  expect(await pageBackgroundState(page)).toEqual(before)
  expect(await getPageChildren(page)).toEqual(children)
  await canvas.undo()
  await expect.poll(() => getPageChildren(page)).toHaveLength(0)
  canvas.assertNoErrors()
})

test('canvas initialization preserves multiple empty pages', async ({ page }) => {
  await addPages(page, ['Second page'])
  const before = await pageBackgroundState(page)
  expect(before.pages).toBe(2)
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  expect(await pageBackgroundState(page)).toEqual(before)
  canvas.assertNoErrors()
})

for (const emptyBy of ['delete', 'undo'] as const) {
  test(`canvas initialization preserves an edited empty page after ${emptyBy}`, async ({
    page
  }) => {
    const canvas = new CanvasHelper(page)
    await canvas.drawRect(160, 180, 70, 40)
    if (emptyBy === 'delete') await canvas.deleteSelection()
    else await canvas.undo()
    await expect.poll(() => getPageChildren(page)).toHaveLength(0)
    const before = await pageBackgroundState(page)
    expect(before.color).toEqual({ r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 1 })
    await canvas.waitForInit()
    expect(await pageBackgroundState(page)).toEqual(before)
    if (emptyBy === 'delete') await canvas.undo()
    else await canvas.redo()
    await expect.poll(() => getPageChildren(page)).toHaveLength(1)
    canvas.assertNoErrors()
  })
}
