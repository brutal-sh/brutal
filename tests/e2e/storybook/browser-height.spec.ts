import { expect, test, type Page } from '@playwright/test'

import { storyOutcome } from '#tests/helpers/storybook/outcome'

async function openHeight(page: Page, story = 'desktop', theme = 'dark') {
  await page.goto(
    `/iframe.html?id=app-browser-preview-import-height--${story}&viewMode=story&globals=theme:${theme}`
  )
  await expect(page.getByRole('separator', { name: 'Browser import height' })).toBeVisible()
  return page.getByRole('separator', { name: 'Browser import height' })
}

async function beginDrag(page: Page) {
  const grip = page.getByRole('separator', { name: 'Browser import height' })
  const box = await grip.boundingBox()
  if (!box) throw new Error('Browser import height is not visible')
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  return { grip, point }
}

test.use({ viewport: { width: 900, height: 850 } })

for (const theme of ['dark', 'light']) {
  for (const story of ['desktop', 'phone', 'tablet', 'pending-backdrop']) {
    test(`${story} renders accessibly in ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=app-browser-preview-import-height--${story}&viewMode=story&globals=theme:${theme}`
      )
      expect(await storyOutcome(page)).toBe('ok')
    })
  }
}

for (const preset of ['desktop', 'phone', 'tablet']) {
  test(`${preset} dragging clips a stable frame, restores native visibility and supports keyboard`, async ({
    page
  }, info) => {
    const grip = await openHeight(page, preset)
    const maximum = Number(await grip.getAttribute('aria-valuemax'))
    const { point } = await beginDrag(page)
    await expect(grip).toBeFocused()
    await expect(page.getByLabel('Native surface', { exact: true })).toHaveText('hidden')
    const image = page.locator('[data-slot="browser-backdrop"]')
    await expect(image).toBeVisible()
    const originalFrame = await image.boundingBox()
    if (!originalFrame) throw new Error('The prepared browser frame is missing')
    const originalSource = await image.getAttribute('src')
    await page.mouse.move(point.x, point.y - 80)
    await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 80))
    for (let frame = 0; frame < 3; frame++) {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
          })
      )
      const clippedFrame = await image.boundingBox()
      expect(clippedFrame?.height).toBe(originalFrame.height)
      expect(clippedFrame?.width).toBe(originalFrame.width)
    }
    await expect(image).toHaveAttribute('src', originalSource ?? '')
    await page.screenshot({ path: info.outputPath('clip-mid-drag.png') })
    await page.mouse.up()
    await expect(grip).toHaveAttribute('data-dragging', 'false')
    await expect(page.getByLabel('Native surface', { exact: true })).toHaveText('visible')
    await expect(image).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('clip-restored.png') })
    await expect(page.locator('[data-slot="browser-height-clipped"]')).toBeVisible()
    await grip.press('End')
    await expect(page.getByLabel('Import height', { exact: true })).toHaveText('Full page')
    await expect(page.locator('[data-slot="browser-height-clipped"]')).toHaveCount(0)
    await grip.press('ArrowUp')
    await grip.press('Shift+ArrowUp')
    await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 60))
    await grip.press('Home')
    await expect(grip).toHaveAttribute(
      'aria-valuenow',
      (await grip.getAttribute('aria-valuemin')) ?? ''
    )
    await grip.press('End')
    await grip.dblclick()
    await expect(page.getByLabel('Height resets', { exact: true })).toHaveText('1')
    await grip.press('Enter')
    await expect(page.getByLabel('Height resets', { exact: true })).toHaveText('2')
  })
}

test('Escape cancels pending preparation and an old rejection cannot cancel a new drag', async ({
  page
}) => {
  const grip = await openHeight(page, 'pending-backdrop')
  const maximum = Number(await grip.getAttribute('aria-valuemax'))
  await beginDrag(page)
  await expect(page.getByRole('button', { name: 'Ready 1', exact: true })).toBeVisible()
  await expect(grip).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(grip).toHaveAttribute('aria-disabled', 'false')
  await page.mouse.up()
  const { point } = await beginDrag(page)
  await expect(page.getByRole('button', { name: 'Ready 2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fail 1', exact: true }).press('Enter')
  await expect(grip).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ready 2', exact: true }).press('Enter')
  await expect(grip).toHaveAttribute('data-dragging', 'true')
  await page.mouse.move(point.x, point.y - 70)
  await page.mouse.up()
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 70))
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const outcome of ['Refuse', 'Fail']) {
  test(`${outcome.toLowerCase()} during preparation leaves the previous height intact`, async ({
    page
  }) => {
    const grip = await openHeight(page, 'pending-backdrop')
    const maximum = Number(await grip.getAttribute('aria-valuemax'))
    await grip.press('ArrowUp')
    await beginDrag(page)
    await page.getByRole('button', { name: `${outcome} 1`, exact: true }).press('Enter')
    await expect(grip).toHaveAttribute('aria-disabled', 'false')
    await expect(grip).toHaveAttribute('data-dragging', 'false')
    await expect(page.getByLabel('Native surface', { exact: true })).toHaveText('visible')
    await expect(page.locator('[data-slot="browser-backdrop"]')).toHaveCount(0)
    await page.mouse.up()
    await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 10))
    if (outcome === 'Fail')
      await expect(page.getByRole('alert')).toHaveText('Fixture backdrop failed.')
    else await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('Escape restores a committed clip after movement in an active drag', async ({ page }) => {
  const grip = await openHeight(page)
  const maximum = Number(await grip.getAttribute('aria-valuemax'))
  await grip.press('ArrowUp')
  const { point } = await beginDrag(page)
  await expect(grip).toHaveAttribute('data-dragging', 'true')
  await page.mouse.move(point.x, point.y - 70)
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 80))
  await page.keyboard.press('Escape')
  await expect(grip).toHaveAttribute('data-dragging', 'false')
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 10))
  await expect(page.getByLabel('Native surface', { exact: true })).toHaveText('visible')
  await expect(page.locator('[data-slot="browser-backdrop"]')).toHaveCount(0)
  await page.mouse.up()
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText(String(maximum - 10))
})

test('Tablet height reaches the actual Pen minimum', async ({ page }, info) => {
  const grip = await openHeight(page, 'tablet')
  const { point } = await beginDrag(page)
  await expect(grip).toHaveAttribute('data-dragging', 'true')
  await page.mouse.move(point.x, point.y - 400)
  await page.mouse.up()
  await expect(grip).toHaveAttribute('aria-valuenow', '240')
  await page.screenshot({ path: info.outputPath('tablet-minimum.png') })
})

test('ending a pending pointer gesture releases capture ownership before reset', async ({
  page
}) => {
  const grip = await openHeight(page, 'pending-backdrop')
  await grip.press('ArrowUp')
  await beginDrag(page)
  await expect(page.getByRole('button', { name: 'Ready 1', exact: true })).toBeVisible()
  await expect(page.getByLabel('Backdrop capture', { exact: true })).toHaveText('pending')
  await page.mouse.up()
  await expect(page.getByLabel('Backdrop capture', { exact: true })).toHaveText('idle')
  await grip.dblclick()
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText('Full page')
  await expect(page.getByLabel('Height resets', { exact: true })).toHaveText('1')
  await page.getByRole('button', { name: 'Fail 1', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Import height', { exact: true })).toHaveText('Full page')
})
