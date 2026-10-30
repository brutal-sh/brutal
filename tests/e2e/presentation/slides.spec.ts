import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { editorSnapshot, seedPresentation } from '#tests/helpers/presentation/fixture'

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

test('Slides previews select frames and export all or selected slides as PDF pages', async ({
  page
}, testInfo) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await seedPresentation(page)
  await page.getByRole('tab', { name: 'Slides', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Slides', exact: true })
  await expect(panel.getByRole('img', { name: 'Opening', exact: true })).toBeVisible()
  await expect(panel.getByRole('img', { name: 'Closing', exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Hidden frame', exact: true })).toHaveCount(0)
  await panel.getByRole('button', { name: 'Opening', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Opening', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  const before = await editorSnapshot(page)
  for (const [action, count] of [
    ['Export all slides', 2],
    ['Export selected slides (1)', 1]
  ] as const) {
    await panel.getByRole('button', { name: 'Export PDF', exact: true }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: action, exact: true }).click()
    const file = await download
    const path = testInfo.outputPath(`slides-${count}.pdf`)
    await file.saveAs(path)
    const { readFile } = await import('node:fs/promises')
    const pdf = (await readFile(path)).toString('latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(count)
    expect(await editorSnapshot(page)).toEqual(before)
  }
  await panel.getByRole('button', { name: 'Present', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Presentation', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel.getByRole('button', { name: 'Present', exact: true })).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('slides-panel.png') })
})

test('Components creates a component from the selection and Undo restores the frame', async ({
  page
}) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await page.getByRole('tab', { name: 'Components', exact: true }).click()
  const panel = page.getByTestId('assets-panel')
  const create = panel.getByRole('button', { name: 'Create component', exact: true })
  await expect(create).toBeDisabled()
  await seedPresentation(page)
  await expect(create).toBeEnabled()
  await create.click()
  await expect(panel.getByTestId('asset-item')).toHaveCount(1)
  await expect(create).toBeDisabled()
  await expect(panel.getByRole('img', { name: 'Closing preview', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+z')
  await page.getByRole('tab', { name: 'Components', exact: true }).click()
  await expect(panel.getByTestId('asset-item')).toHaveCount(0)
  await expect(create).toBeEnabled()
})

test('Libraries stays inline and opens the local publication and manager flows', async ({
  page
}) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await seedPresentation(page)
  await page.getByRole('tab', { name: 'Components', exact: true }).click()
  await page
    .getByTestId('assets-panel')
    .getByRole('button', { name: 'Create component', exact: true })
    .click()
  await page.getByRole('tab', { name: 'Libraries', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Libraries', exact: true })
  await expect(panel).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await panel.getByRole('button', { name: 'Turn this file into a library', exact: true }).click()
  const publish = page.getByRole('dialog').filter({ hasText: 'Publish library' })
  await publish.getByLabel('Library ID').fill('inline-library')
  await publish.getByLabel('Library name').fill('Inline library')
  await publish.getByRole('button', { name: 'Publish library', exact: true }).click()
  await expect(publish).toBeHidden()
  await page.getByRole('tab', { name: 'Agent', exact: true }).click()
  await page.getByRole('tab', { name: 'Libraries', exact: true }).click()
  await expect(panel.getByRole('heading', { name: 'Inline library', exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Add library', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Remove library', exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Remove library', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Add library', exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Manage libraries', exact: true }).click()
  await expect(page.getByTestId('asset-libraries-dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeVisible()
})
