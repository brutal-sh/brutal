import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { create, chooseSource, generated } from '#tests/helpers/document/scripts'
import { openAppMenu } from '#tests/helpers/menu'

test('Script variable pickers follow theme edits and Undo while saved inputs retain references', async ({
  page
}, testInfo) => {
  test.setTimeout(30_000)
  const canvas = await create(page)
  await chooseSource(page)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editor')
    const collection = store.graph.createCollection('Script theme')
    const dark = store.graph.createMode(collection.id, 'Dark')
    if (!dark) throw new Error('Missing dark mode')
    store.graph.createVariable('Columns variable', 'FLOAT', collection.id, 2)
    const ink = store.graph.createVariable('Ink variable', 'COLOR', collection.id, {
      r: 46 / 255,
      g: 111 / 255,
      b: 242 / 255,
      a: 1
    })
    store.updateVariableValue(ink.id, dark, { r: 249 / 255, g: 115 / 255, b: 22 / 255, a: 1 })
    store.requestRender()
  })
  const section = page.getByRole('region', { name: 'Script', exact: true })
  await section.getByRole('button', { name: 'Apply variable: columns', exact: true }).click()
  await page.getByRole('option').filter({ hasText: 'Columns variable' }).click()
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await section.getByRole('button', { name: 'Apply variable: ink', exact: true }).click()
  await page.getByRole('option').filter({ hasText: 'Ink variable' }).click()
  await expect
    .poll(async () => (await generated(page))?.children[0].color)
    .toMatchObject({ r: 46 / 255, g: 111 / 255, b: 242 / 255 })
  await page.getByRole('button', { name: 'Apply variable mode', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Script theme', exact: true }).hover()
  await expect(page.getByRole('menuitemradio', { name: 'Dark', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('script-variables-theme-menu.png') })
  const darkOption = page.getByRole('menuitemradio', { name: 'Dark', exact: true })
  const box = await darkOption.boundingBox()
  if (!box) throw new Error('Missing theme option bounds')
  // Interpolate travel so a left-opening submenu receives real mouse direction events.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
  await darkOption.click()

  await expect
    .poll(async () => (await generated(page))?.children[0].color)
    .toMatchObject({ r: 249 / 255, g: 115 / 255, b: 22 / 255 })
  await canvas.undo()
  await expect
    .poll(async () => (await generated(page))?.children[0].color)
    .toMatchObject({ r: 46 / 255, g: 111 / 255, b: 242 / 255 })
  await canvas.redo()
  await expect
    .poll(async () => (await generated(page))?.children[0].color)
    .toMatchObject({ r: 249 / 255, g: 115 / 255, b: 22 / 255 })
  page.once('dialog', (dialog) => dialog.accept('script-variables.pen'))
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await downloading).path())
  const saved = parsePenDocument(bytes.toString())
  const script = saved.children.find((node) => node.type === 'script')
  expect(script?.inputs).toMatchObject({ columns: '$Columns variable', ink: '$Ink variable' })
  expect(script?.theme).toMatchObject({ 'Script theme': 'Dark' })
  await section.getByRole('button', { name: 'Apply variable: columns', exact: true }).click()
  await page.getByRole('button', { name: 'Detach variable', exact: true }).click()
  await expect(section.getByRole('spinbutton', { name: 'columns', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '2'
  )
  await canvas.undo()
  await expect(section.getByText('Columns variable', { exact: true })).toBeVisible()
})
