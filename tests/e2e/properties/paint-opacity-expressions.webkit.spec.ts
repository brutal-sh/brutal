import type { Locator } from '@playwright/test'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { fillDriver } from '#tests/helpers/canvas/fill-driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { propertyItems } from '#tests/helpers/properties'
import { getSelectedNode, getSelectedNodes } from '#tests/helpers/store'

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

test('paint opacity applies explicit arithmetic equal to its rounded display', async () => {
  const field = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await enter(field, '6*2')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.12)
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.123456)
  await editor.canvas.redo()
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('paint opacity cancels live preview without rounding its original value', async () => {
  const field = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await field.focus()
  await field.fill('77')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.77)
  await field.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.123456)
  editor.canvas.assertNoErrors()
})

test('paint integer stepping and clamping retain visible percent behavior', async () => {
  const field = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await enter(field, '40')
  await field.focus()
  await field.press('ArrowUp')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.41)
  await field.focus()
  await field.press('Shift+ArrowUp')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.51)
  await enter(field, '120*2')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(1)
  await enter(field, '-10')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0)
  editor.canvas.assertNoErrors()
})

test('fractional paint stepping uses the unrounded model and keeps integer display', async () => {
  const field = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await expect(field).toHaveText('12%')
  await field.focus()
  await field.press('ArrowUp')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.133456)
  await expect(field).toHaveText('13%')
  editor.canvas.assertNoErrors()
})

test('paint scrubbing previews and Escape restores the original fractional value', async () => {
  const field = propertyItems(editor.page, 'fills')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  const box = await field.boundingBox()
  if (!box) throw new Error('Missing opacity scrub bounds')
  await editor.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 3 })
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).not.toBe(0.123456)
  await editor.page.keyboard.press('Escape')
  await editor.page.mouse.up()
  expect((await getSelectedNode(editor.page))?.fills[0].opacity).toBe(0.123456)
  editor.canvas.assertNoErrors()
})

test('stroke opacity retains live cancellation and explicit fractional arithmetic', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node) throw new Error('Missing stroke fixture')
    store.updateNode(node.id, {
      strokes: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 },
          weight: 2,
          opacity: 0.123456,
          visible: true,
          align: 'CENTER'
        }
      ]
    })
  })
  const field = propertyItems(editor.page, 'strokes')
    .first()
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await field.focus()
  await field.fill('77')
  expect((await getSelectedNode(editor.page))?.strokes[0].opacity).toBe(0.77)
  await field.press('Escape')
  expect((await getSelectedNode(editor.page))?.strokes[0].opacity).toBe(0.123456)
  await enter(field, '6*2')
  expect((await getSelectedNode(editor.page))?.strokes[0].opacity).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('shadow opacity keeps fractional cancellation and arithmetic in its popup', async () => {
  await editor.page
    .getByRole('region', { name: 'Effects', exact: true })
    .getByRole('combobox', { name: 'Add effect', exact: true })
    .click()
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node?.effects[0]) throw new Error('Missing shadow fixture')
    store.updateNode(node.id, {
      effects: [{ ...node.effects[0], color: { ...node.effects[0].color, a: 0.123456 } }]
    })
  })
  const alpha = () =>
    editor.page.evaluate(
      () => window.openPencil?.getStore?.()?.getSelectedNodes()[0]?.effects[0].color.a
    )
  const field = editor.page
    .locator('[data-effect-popup]')
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await field.focus()
  await field.fill('77')
  expect(await alpha()).toBe(0.77)
  await field.press('Escape')
  expect(await alpha()).toBe(0.123456)
  await enter(field, '6*2')
  expect(await alpha()).toBe(0.12)
  await enter(field, '1/0')
  expect(await alpha()).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('page opacity uses the same raw percent model', async () => {
  await (
    await openAppMenu(editor.page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing page fixture')
    store.setPageColor({ r: 0.2, g: 0.4, b: 0.6, a: 0.123456 })
    store.clearSelection()
  })
  const field = editor.page
    .getByRole('region', { name: 'Page', exact: true })
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await enter(field, '6*2')
  expect(await editor.page.evaluate(() => window.openPencil?.getStore?.().state.pageColor.a)).toBe(
    0.12
  )
  editor.canvas.assertNoErrors()
})

test('selection color opacity applies to both selected paints', async () => {
  await (
    await openAppMenu(editor.page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await editor.canvas.drawRect(300, 100, 160, 120)
  await editor.canvas.selectAll()
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing selection fixture')
    for (const [index, node] of store.getSelectedNodes().entries()) {
      const paint = { ...node.fills[0], opacity: 0.123456 }
      store.updateNode(node.id, {
        fills:
          index === 0
            ? [paint]
            : [
                paint,
                {
                  ...paint,
                  color: { r: 0, g: 0, b: 0, a: 1 },
                  opacity: 1
                }
              ]
      })
    }
  })
  expect((await getSelectedNodes(editor.page)).map((node) => node.fills[0].opacity)).toEqual([
    0.123456, 0.123456
  ])
  const field = editor.page
    .getByRole('region', { name: 'Selection colors', exact: true })
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
    .first()
  await enter(field, '6*2')
  expect((await getSelectedNodes(editor.page)).map((node) => node.fills[0].opacity)).toEqual([
    0.12, 0.12
  ])
  editor.canvas.assertNoErrors()
})
