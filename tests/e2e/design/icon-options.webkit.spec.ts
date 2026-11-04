import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { getSelectedIconGeometry } from '#tests/helpers/icons'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'
import { propertyField } from '#tests/helpers/properties'
import { getNodeById, getSelectedNode } from '#tests/helpers/store'
import { toolbarFlyoutTestId } from '#tests/helpers/test-ids'

const ctx = useEditorSetupWithClear()
const FONT_URL = 'https://fonts.gstatic.com/s/open-pen-fixture/material.ttf'

test.beforeAll(async () => {
  const font = await readFile(testPath('fixtures/fonts/MaterialSymbolsRounded-home-dark_mode.ttf'))
  await ctx.page.route('https://api.iconify.design/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/collections') {
      await route.fulfill({
        json: {
          lucide: { name: 'Lucide', total: 1 },
          feather: { name: 'Feather', total: 1 }
        }
      })
    } else if (url.pathname.endsWith('.json')) {
      const prefix = url.pathname.slice(1, -5)
      await route.fulfill({
        json: {
          prefix,
          width: 24,
          height: 24,
          icons: {
            heart: {
              body: '<path fill="none" stroke="currentColor" d="M2 8L12 20L22 8Z"/>'
            }
          }
        }
      })
    } else if (url.pathname === '/collection') {
      await route.fulfill({ json: { uncategorized: ['heart'] } })
    } else {
      await route.fulfill({ json: { icons: [], total: 0, collections: {} } })
    }
  })
  await ctx.page.route('https://cdn.jsdelivr.net/**/variablefont/**', (route) =>
    route.fulfill({ body: 'home e88a\ndark_mode e51c\n' })
  )
  await ctx.page.route('https://fonts.googleapis.com/css2?**', (route) =>
    route.fulfill({
      body: `@font-face { src: url(${FONT_URL}) format('truetype'); }`
    })
  )
  await ctx.page.route(FONT_URL, (route) => route.fulfill({ body: font, contentType: 'font/ttf' }))
})

async function insertHeart() {
  const { page, canvas } = ctx
  await page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await page.getByRole('menuitemradio', { name: 'Icon', exact: true }).click()
  await canvas.click(350, 250)
  await expect(propertyField(page, 'icon-name')).toContainText('heart')
  await expect
    .poll(async () => (await getSelectedNode(page))?.childIds.length ?? 0)
    .toBeGreaterThan(0)
}

async function currentGeometry() {
  return getSelectedIconGeometry(ctx.page)
}

test('a nested weight override displays and draws its own weight in the inspector', async () => {
  const { page, canvas } = ctx
  const data = await readFile(testPath('fixtures/pen-nested-icon-weight.pen'))
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
  })
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'nested-icon.pen', mimeType: 'application/json', buffer: data })
  await canvas.waitForInit()
  const instance = await getNodeById(page, 'instance')
  const glyphId = instance?.childIds[0]
  if (!glyphId) throw new Error('Nested icon missing after opening')
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), glyphId)
  await expect(propertyField(page, 'icon-weight')).toContainText('700')
  await expect(propertyField(page, 'icon-family')).toHaveText('Material Symbols Rounded')
  const bold = await currentGeometry()
  expect(bold.length).toBeGreaterThan(0)
  await page.evaluate(() => window.openPencil?.getStore?.().select(['glyph']))
  await expect(propertyField(page, 'icon-weight')).toContainText('200')
  const thin = await currentGeometry()
  expect(thin.length).toBeGreaterThan(0)
  expect(thin).not.toEqual(bold)
  await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    editor?.clearSelection()
    editor?.centerOn(210, 130, 2)
  })
  await canvas.waitForRender()
  const bounds = await canvas.canvas.boundingBox()
  if (!bounds) throw new Error('Canvas missing before the nested glyph snapshot')
  expect(
    await page.screenshot({
      clip: { x: bounds.x + 150, y: bounds.y + 230, width: 600, height: 300 }
    })
  ).toMatchSnapshot('nested-icon-weights.png')
  canvas.assertNoErrors()
})

test('family changes preserve the name, size, Fill and frame identity through Undo', async () => {
  const { page, canvas } = ctx
  await insertHeart()
  const before = await getSelectedNode(page)
  const family = page.getByRole('combobox', { name: 'Icon set', exact: true })
  await family.click()
  await page.getByRole('option', { name: 'feather', exact: true }).click()
  await expect(family).toHaveText('feather')
  expect(await getSelectedNode(page)).toMatchObject({
    id: before?.id,
    width: 24,
    height: 24,
    fills: before?.fills
  })
  await expect(propertyField(page, 'icon-name')).toHaveText('heart')
  await canvas.undo()
  await expect(family).toHaveText('lucide')
  await family.click()
  await page.getByRole('option', { name: 'Material Symbols Rounded', exact: true }).click()
  await expect(family).toHaveText('Material Symbols Rounded')
  await expect(propertyField(page, 'icon-name')).toHaveText('heart')
  await expect.poll(async () => (await getSelectedNode(page))?.childIds.length).toBe(0)
  await expect(propertyField(page, 'icon-weight')).toContainText('200')
  canvas.assertNoErrors()
})

for (const size of [24, 64]) {
  test(`${size}px Material weight redraws, cancels without consuming Redo and reopens exactly`, async () => {
    const { page, canvas } = ctx
    await page.getByRole('button', { name: 'New design', exact: true }).click()
    await canvas.waitForInit()
    await insertHeart()
    if (size !== 24) {
      for (const axis of ['width', 'height']) {
        const dimension = propertyField(page, axis)
        await dimension.click()
        const input = dimension.getByRole('spinbutton')
        await input.fill(String(size))
        await input.press('Enter')
      }
    }
    await page.getByRole('combobox', { name: 'Icon set', exact: true }).click()
    await page.getByRole('option', { name: 'Material Symbols Rounded', exact: true }).click()
    await expect(propertyField(page, 'icon-weight')).toContainText('200')
    await propertyField(page, 'icon-name').click()
    const picker = page.getByRole('dialog', { name: 'Swap icon', exact: true })
    await picker.getByRole('textbox').fill('home')
    await picker.getByRole('option', { name: 'home', exact: true }).click()
    await expect(propertyField(page, 'icon-name')).toHaveText('home')
    await expect.poll(currentGeometry).not.toEqual([])
    const original = await currentGeometry()
    const field = propertyField(page, 'icon-weight')
    await field.getByText('200', { exact: true }).click()
    const input = field.getByRole('spinbutton', { name: 'Weight', exact: true })
    await input.fill('400')
    await expect.poll(currentGeometry).not.toEqual(original)
    await input.fill('700')
    await input.press('Enter')
    await expect(field).toContainText('700')
    await expect.poll(currentGeometry).not.toEqual(original)
    await canvas.undo()
    await expect(field).toContainText('200')
    await expect.poll(currentGeometry).toEqual(original)
    await field.focus()
    await input.fill('400')
    await expect.poll(currentGeometry).not.toEqual(original)
    await input.press('Escape')
    await expect(field).toContainText('200')
    await expect.poll(currentGeometry).toEqual(original)
    await canvas.redo()
    await expect(field).toContainText('700')
    await canvas.undo()
    await expect(field).toContainText('200')
    const bounds = await field.boundingBox()
    if (!bounds) throw new Error('Weight range missing')
    await page.clock.install()
    await page.mouse.move(bounds.x + 20, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height / 2)
    await expect(field).toContainText('500')
    // An ongoing pointer edit must survive the shared batch's 300ms idle boundary.
    await page.clock.fastForward(600)
    await page.mouse.move(bounds.x + bounds.width * 0.95, bounds.y + bounds.height / 2)
    await page.mouse.up()
    await expect(field).toContainText('700')
    await canvas.undo()
    await expect(field).toContainText('200')
    const beforeCancel = (await getSelectedNode(page))?.childIds
    const cancelBounds = await field.boundingBox()
    if (!cancelBounds) throw new Error('Weight range missing before cancellation')
    await page.mouse.move(cancelBounds.x + 20, cancelBounds.y + cancelBounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      cancelBounds.x + cancelBounds.width * 0.8,
      cancelBounds.y + cancelBounds.height / 2
    )
    await expect(field).toContainText('600')
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(field).toContainText('200')
    await expect.poll(async () => (await getSelectedNode(page))?.childIds).toEqual(beforeCancel)
    await canvas.redo()
    await expect(field).toContainText('700')
    await canvas.waitForRender()
    const canvasBounds = await canvas.canvas.boundingBox()
    if (!canvasBounds) throw new Error('Canvas missing before the glyph snapshot')
    const rendered =
      size === 24
        ? await canvas.screenshotCanvasRegion(600, 550)
        : await page.screenshot({
            clip: { x: canvasBounds.x + 200, y: canvasBounds.y + 150, width: 300, height: 300 }
          })
    expect(rendered).toMatchSnapshot(
      size === 24 ? 'material-icon-weight-700.png' : 'material-icon-weight-64-700.png'
    )
    const beforeSave = await getSelectedNode(page)
    const geometry = await currentGeometry()
    if (!beforeSave) throw new Error('Material icon missing before Save')
    await page.evaluate(() => {
      window.showSaveFilePicker = undefined
      window.showOpenFilePicker = undefined
    })
    page.once('dialog', (dialog) => dialog.accept('material-weight.pen'))
    const downloading = page.waitForEvent('download')
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
      .first()
      .click()
    const saved = await readFile(await (await downloading).path())
    expect(parsePenDocument(saved.toString()).children[0]).toMatchObject({
      id: beforeSave.id,
      type: 'icon',
      library: 'Material Symbols Rounded',
      icon: 'home',
      weight: 700,
      width: size,
      height: size,
      fill: [{ type: 'color', color: '#FFFFFF', enabled: true }]
    })
    const opening = page.waitForEvent('filechooser')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await opening
    ).setFiles({ name: 'material-weight.pen', mimeType: 'application/json', buffer: saved })
    await canvas.waitForInit()
    await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), beforeSave.id)
    await expect(propertyField(page, 'icon-family')).toHaveText('Material Symbols Rounded')
    await expect(field).toContainText('700')
    await expect.poll(currentGeometry).toEqual(geometry)
    canvas.assertNoErrors()
  })
}
