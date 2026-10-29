import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

import { editorSnapshot, seedPresentation } from './fixture'

test('renders frames as slides, navigates and returns to the unchanged editor', async ({
  page
}, testInfo) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit().catch((error: unknown) => {
    canvas.assertNoErrors()
    throw error
  })
  await seedPresentation(page)
  const before = await editorSnapshot(page)
  const trigger = page.getByRole('button', { name: 'Present', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Presentation', exact: true })
  await expect(dialog).toBeVisible()
  const slides = dialog.getByRole('navigation', { name: 'Slides' })
  await expect(slides.getByRole('button')).toHaveCount(2)
  const opening = dialog.getByRole('img', { name: 'Opening', exact: true })
  await expect(opening).toBeVisible()
  await expect
    .poll(() => opening.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(1280)
  const centerPixel = await opening.evaluate(async (image: HTMLImageElement) => {
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(image, image.naturalWidth / 2, image.naturalHeight / 2, 1, 1, 0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data]
  })
  expect(centerPixel).toEqual([255, 0, 0, 255])
  await page.screenshot({ path: testInfo.outputPath('presentation.png'), animations: 'disabled' })
  await expect(dialog.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('img', { name: 'Closing', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  await page.keyboard.press('Home')
  await expect(opening).toBeVisible()
  await page.keyboard.press('End')
  await expect(dialog.getByRole('img', { name: 'Closing', exact: true })).toBeVisible()
  await slides.getByRole('button', { name: 'Slide 1: Opening', exact: true }).click()
  await expect(opening).toBeVisible()
  await dialog.getByRole('button', { name: 'Next slide' }).click()
  await expect(dialog.getByRole('img', { name: 'Closing', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(await editorSnapshot(page)).toEqual(before)
  canvas.assertNoErrors()
})

test('an empty page explains how to add slides and exits by its close button', async ({ page }) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit().catch((error: unknown) => {
    canvas.assertNoErrors()
    throw error
  })
  const trigger = page.getByRole('button', { name: 'Present', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Presentation', exact: true })
  await expect(dialog.locator('[data-slot="placeholder"]')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Exit presentation' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
