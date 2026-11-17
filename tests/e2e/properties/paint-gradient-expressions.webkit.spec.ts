import { readFile } from 'node:fs/promises'

import type { Locator } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

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

test.beforeEach(async () => {
  await editor.canvas.drawRect(120, 100, 160, 120)
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node?.fills[0]) throw new Error('Missing paint fixture')
    store.updateNode(node.id, { fills: [{ ...node.fills[0], opacity: 0.123456 }] })
  })
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.123456)
  await fillDriver(() => editor.page).clearHistory()
})

async function enter(field: Locator, expression: string, key = 'Enter') {
  await field.focus()
  await field.fill(expression)
  await field.press(key)
}

async function gradientFixture() {
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await editor.page.getByTestId('fill-picker-tab-gradient').click()
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    const fill = node?.fills[0]
    if (!store || !node || !fill?.gradientStops) throw new Error('Missing gradient fixture')
    const stops = structuredClone(fill.gradientStops)
    const stop = stops[0]
    if (!stop) throw new Error('Missing first gradient stop')
    stop.position = 0.123456
    stop.color.a = 0.123456
    store.updateNode(node.id, { fills: [{ ...fill, gradientStops: stops }] })
  })
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0]).toMatchObject({
    position: 0.123456,
    color: { a: 0.123456 }
  })
  await fillDriver(() => editor.page).clearHistory()
  const row = editor.page
    .locator('[data-picker-content] [data-slot="stop"]:not([role="slider"])')
    .first()
  await expect(row.getByRole('spinbutton')).toHaveCount(2)
  return {
    position: row.getByRole('spinbutton', { name: 'Position', exact: true }),
    opacity: row.getByRole('spinbutton', { name: 'Opacity', exact: true })
  }
}

test('gradient position applies explicit arithmetic equal to its rounded display', async () => {
  const { position } = await gradientFixture()
  await enter(position, '6*2')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].position).toBe(0.12)
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].position).toBe(0.123456)
  await editor.canvas.redo()
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].position).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('paint and stop arithmetic survive a saved document reopen', async ({ page }, info) => {
  const { position, opacity } = await gradientFixture()
  await enter(position, '6*2')
  await enter(opacity, '6*3')
  await info.attach('gradient-expression-fields', {
    body: await page.locator('[data-picker-content]').screenshot({ animations: 'disabled' }),
    contentType: 'image/png'
  })
  await page.keyboard.press('Escape')
  await enter(
    propertyItems(page, 'fills').first().getByRole('spinbutton', { name: 'Opacity', exact: true }),
    '6*2'
  )
  const before = await getSelectedNode(page)
  expect(before?.fills[0]).toMatchObject({
    opacity: 0.12,
    gradientStops: [{ position: 0.12, color: { a: 0.18 } }, { position: 1 }]
  })
  page.once('dialog', (dialog) => dialog.accept('paint-gradient-arithmetic.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const path = info.outputPath('paint-gradient-arithmetic.pen')
  await (await saving).saveAs(path)
  expect(parsePenDocument(await readFile(path, 'utf8')).children).toHaveLength(1)
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
    fills: [
      {
        opacity: 0.12,
        gradientStops: [{ position: 0.12, color: { a: 46 / 255 } }, { position: 1 }]
      }
    ]
  })
  editor.canvas.assertNoErrors()
})

test('gradient position cancellation retains its full original precision', async () => {
  const { position } = await gradientFixture()
  await position.focus()
  await position.fill('77')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].position).toBe(0.77)
  await position.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].position).toBe(0.123456)
  editor.canvas.assertNoErrors()
})

test('gradient stop opacity applies an explicit result equal to its rounded display', async () => {
  const { opacity } = await gradientFixture()
  await enter(opacity, '6*2')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].color.a).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('gradient stop opacity cancels live preview with original precision', async () => {
  const { opacity } = await gradientFixture()
  await opacity.focus()
  await opacity.fill('77')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].color.a).toBe(0.77)
  await opacity.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0].gradientStops?.[0].color.a).toBe(0.123456)
  editor.canvas.assertNoErrors()
})

test('untouched paint and gradient fields retain fractional values', async () => {
  const paint = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await paint.focus()
  await paint.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.123456)
  const { position, opacity } = await gradientFixture()
  const before = (await getSelectedNode(editor.page))?.fills[0].gradientStops
  for (const field of [position, opacity]) {
    await field.focus()
    await field.press('Tab')
    await field.focus()
    await field.press('Enter')
    expect((await getSelectedNode(editor.page))?.fills[0].gradientStops).toEqual(before)
  }
  editor.canvas.assertNoErrors()
})
