import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { fillDriver } from '#tests/helpers/canvas/fill-driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { propertyItems } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', async (page) => {
  await mockOfficialCloudDiscovery(page)
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
})

const original = { r: 0.2, g: 0.4, b: 0.6, a: 128 / 255 }

function alphaField() {
  return editor.page
    .getByTestId('color-slider-alpha')
    .getByRole('spinbutton', { name: 'Alpha', exact: true })
}

async function enterAlpha(expression: string) {
  const field = alphaField()
  await field.focus()
  await field.fill(expression)
  await field.press('Enter')
}

test.beforeEach(async () => {
  const page = editor.page
  await editor.canvas.drawRect(180, 140, 160, 120)
  await page.evaluate((color) => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node?.fills[0]) throw new Error('Missing slider fixture')
    store.updateNode(node.id, { fills: [{ ...node.fills[0], color }] })
  }, original)
  await fillDriver(() => page).clearHistory()
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await expect(
    page.getByTestId('color-slider-alpha').getByRole('spinbutton', { name: 'Alpha', exact: true })
  ).toBeVisible()
  expect((await getSelectedNode(page))?.fills[0].color).toEqual(original)
})

test('alpha slider number commits an explicit percentage equal to its rounded display', async () => {
  const field = editor.page
    .getByTestId('color-slider-alpha')
    .getByRole('spinbutton', { name: 'Alpha', exact: true })
  await field.focus()
  await field.fill('25*2')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 0.5 })
  editor.canvas.assertNoErrors()
})

test('alpha slider number cancels its live preview without losing the original color', async () => {
  const field = editor.page
    .getByTestId('color-slider-alpha')
    .getByRole('spinbutton', { name: 'Alpha', exact: true })
  await field.focus()
  await field.fill('77')
  expect((await getSelectedNode(editor.page))?.fills[0].color.a).toBe(0.77)
  await field.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual(original)
  editor.canvas.assertNoErrors()
})

test('untouched alpha slider number keeps its fractional stored color', async () => {
  const field = editor.page
    .getByTestId('color-slider-alpha')
    .getByRole('spinbutton', { name: 'Alpha', exact: true })
  await field.focus()
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual(original)
  editor.canvas.assertNoErrors()
})
import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

test('alpha slider arithmetic retains invalid input and clamps its percentage bounds', async () => {
  await enterAlpha('5*4')
  for (const invalid of ['1+', '1/0']) {
    await enterAlpha(invalid)
    expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 0.2 })
  }
  await enterAlpha('-10')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 0 })
  await enterAlpha('60*2')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 1 })
  editor.canvas.assertNoErrors()
})

test('alpha slider arithmetic supports one document Undo and Redo after closing the picker', async () => {
  await enterAlpha('5*4')
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 0.2 })
  await editor.page.keyboard.press('Escape')
  await expect(editor.page.locator('[data-picker-content]')).toHaveCount(0)
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual(original)
  await editor.canvas.redo()
  expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual({ ...original, a: 0.2 })
  editor.canvas.assertNoErrors()
})

test('alpha slider arithmetic survives PEN Save and Open with the encoded alpha byte', async ({
  page
}, info) => {
  await enterAlpha('6*3')
  const before = await getSelectedNode(page)
  expect(before?.fills[0].color).toEqual({ ...original, a: 0.18 })
  await info.attach('alpha-slider-picker', {
    body: await page.locator('[data-picker-content]').screenshot({ animations: 'disabled' }),
    contentType: 'image/png'
  })
  await page.keyboard.press('Escape')
  page.once('dialog', (dialog) => dialog.accept('alpha-slider-arithmetic.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const path = info.outputPath('alpha-slider-arithmetic.pen')
  await (await saving).saveAs(path)
  expect(parsePenDocument(await readFile(path, 'utf8')).children).toMatchObject([
    { width: 160, height: 120, fill: [{ color: '#3366992E' }] }
  ])
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (await opening).setFiles(path)
  await editor.canvas.waitForInit()
  await editor.canvas.selectAll()
  expect(await getSelectedNode(page)).toMatchObject({
    x: before?.x,
    y: before?.y,
    width: before?.width,
    height: before?.height,
    fills: [{ color: { ...original, a: 46 / 255 } }]
  })
  editor.canvas.assertNoErrors()
})
