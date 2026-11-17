import type { Locator } from '@playwright/test'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { propertySection } from '#tests/helpers/properties'
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
