import type { Locator } from '@playwright/test'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAdvancedProperties, propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', mockOfficialCloudDiscovery)

function readEffects() {
  return editor.page.evaluate(() => {
    const node = window.openPencil?.getStore?.()?.getSelectedNodes()[0]
    if (!node) throw new Error('Missing selected effect fixture')
    return node.effects
  })
}

async function enter(field: Locator, expression: string, key = 'Enter') {
  await field.focus()
  await field.fill(expression)
  await field.press(key)
}

async function strokeFixture() {
  await editor.canvas.drawRect(120, 100, 160, 120)
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
          opacity: 1,
          visible: true,
          align: 'CENTER'
        }
      ]
    })
  })
}

function readStroke() {
  return editor.page.evaluate(() => {
    const node = window.openPencil?.getStore?.()?.getSelectedNodes()[0]
    if (!node) throw new Error('Missing selected stroke fixture')
    return { stroke: node.strokes[0], miter: node.strokeMiterLimit }
  })
}

async function openStrokeSettings() {
  await propertySection(editor.page, 'Stroke')
    .getByRole('button', { name: 'Stroke settings', exact: true })
    .click()
  return editor.page.getByRole('dialog', { name: 'Stroke settings', exact: true })
}

test('shadow arithmetic preserves precision, invalid drafts and layer position', async () => {
  await editor.canvas.drawRect(120, 100, 160, 120)
  const before = await getSelectedNode(editor.page)
  const section = propertySection(editor.page, 'Effects')
  await section.getByRole('combobox', { name: 'Add effect', exact: true }).click()
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  const popup = editor.page.locator('[data-effect-popup]')
  const blur = popup.getByRole('spinbutton', { name: 'Blur', exact: true })
  await enter(blur, '(1440-32)/3')
  expect((await readEffects())[0].radius).toBe(1408 / 3)
  await enter(blur, '1+')
  await enter(blur, '1/0')
  expect((await readEffects())[0].radius).toBe(1408 / 3)
  await enter(blur, '-10')
  expect((await readEffects())[0].radius).toBe(0)
  await enter(blur, '12.5*2', 'Tab')
  expect((await readEffects())[0].radius).toBe(25)
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect((await readEffects())[0].radius).toBe(0)
  await editor.canvas.redo()
  expect((await readEffects())[0].radius).toBe(25)
  expect(await getSelectedNode(editor.page)).toMatchObject({
    x: before?.x,
    y: before?.y
  })
  editor.canvas.assertNoErrors()
})

test('stroke weight arithmetic commits once and retains invalid and cancelled drafts', async () => {
  await strokeFixture()
  const weight = editor.page.getByRole('spinbutton', { name: 'Stroke weight', exact: true })
  await enter(weight, '120*2')
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(240)
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(2)
  await editor.canvas.redo()
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(240)
  for (const expression of ['1+', '1/0']) await enter(weight, expression)
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(240)
  await enter(weight, '77', 'Escape')
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(240)
  await enter(weight, '-10')
  expect((await getSelectedNode(editor.page))?.strokes[0].weight).toBe(0)
  editor.canvas.assertNoErrors()
})

test('shadow offset arithmetic accepts signed values and cancels invalid drafts', async () => {
  await editor.canvas.drawRect(120, 100, 160, 120)
  const before = await getSelectedNode(editor.page)
  await propertySection(editor.page, 'Effects')
    .getByRole('combobox', { name: 'Add effect', exact: true })
    .click()
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  const popup = editor.page.locator('[data-effect-popup]')
  const x = popup.getByRole('spinbutton', { name: 'X Axis', exact: true })
  const y = popup.getByRole('spinbutton', { name: 'Y Axis', exact: true })
  await enter(x, '-12.5*2')
  await enter(y, '120*2')
  expect((await readEffects())[0].offset).toEqual({ x: -25, y: 240 })
  for (const expression of ['1+', '1/0']) await enter(x, expression)
  expect((await readEffects())[0].offset).toEqual({ x: -25, y: 240 })
  await enter(x, '77', 'Escape')
  expect((await readEffects())[0].offset).toEqual({ x: -25, y: 240 })
  expect(await getSelectedNode(editor.page)).toMatchObject({ x: before?.x, y: before?.y })
  editor.canvas.assertNoErrors()
})

test('stroke dash arithmetic retains constraints, invalid input and document history', async () => {
  await strokeFixture()
  await openAdvancedProperties(editor.page)
  const popup = await openStrokeSettings()
  expect((await readStroke()).stroke.dashPattern).toBeUndefined()
  await popup.getByRole('switch', { name: 'Dashed stroke', exact: true }).click()
  await editor.page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await editor.canvas.undo()
  expect((await readStroke()).stroke.dashPattern).toBeUndefined()
  await editor.canvas.redo()
  await openStrokeSettings()
  const before = (await readStroke()).stroke.dashPattern
  expect(before).toEqual([6, 6])
  const dash = popup.getByRole('spinbutton', { name: 'Dash', exact: true })
  const gap = popup.getByRole('spinbutton', { name: 'Gap', exact: true })
  await enter(dash, '8*2')
  expect((await readStroke()).stroke.dashPattern?.[0]).toBe(16)
  await editor.page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await editor.canvas.undo()
  expect((await readStroke()).stroke.dashPattern).toEqual(before)
  await editor.canvas.redo()
  expect((await readStroke()).stroke.dashPattern?.[0]).toBe(16)
  await openStrokeSettings()
  await enter(gap, '(24-8)/2')
  expect((await readStroke()).stroke.dashPattern).toEqual([16, 8])
  for (const expression of ['1+', '1/0']) await enter(gap, expression)
  expect((await readStroke()).stroke.dashPattern).toEqual([16, 8])
  await enter(dash, '-10')
  expect((await readStroke()).stroke.dashPattern).toEqual([1, 8])
  editor.canvas.assertNoErrors()
})

test('stroke miter arithmetic preserves division precision, clamping and history', async () => {
  await strokeFixture()
  await openAdvancedProperties(editor.page)
  const popup = await openStrokeSettings()
  const miter = popup.getByRole('spinbutton', { name: 'Miter limit', exact: true })
  const before = (await readStroke()).miter
  await enter(miter, '(1440-32)/3')
  expect((await readStroke()).miter).toBe(1408 / 3)
  await editor.page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await editor.canvas.undo()
  expect((await readStroke()).miter).toBe(before)
  await editor.canvas.redo()
  expect((await readStroke()).miter).toBe(1408 / 3)
  await openStrokeSettings()
  for (const expression of ['1+', '1/0']) await enter(miter, expression)
  expect((await readStroke()).miter).toBe(1408 / 3)
  await enter(miter, '-10')
  expect((await readStroke()).miter).toBe(1)
  editor.canvas.assertNoErrors()
})
