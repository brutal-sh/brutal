import { readFile, writeFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { create, generated, exportScript } from '#tests/helpers/document/scripts'
import { openAppMenu } from '#tests/helpers/menu'

const examples = [
  ['Candlestick', 540, 361],
  ['Chart', 660, 336],
  ['Circle Text', 407, 420],
  ['Circular Visualizer', 407, 420],
  ['Clock', 300, 300],
  ['Digital Spectrum', 589, 336],
  ['Digital Time', 379, 300],
  ['Flow Field', 650, 610],
  ['Gauge', 300, 300],
  ['Lines', 407, 420],
  ['Radar', 300, 300]
] as const

for (const [name, width, height] of examples) {
  test(`gallery inserts an editable ${name} Script with one Undo step`, async ({
    page
  }, testInfo) => {
    const canvas = await create(page)
    const original = (await generated(page))?.id
    await page.getByRole('button', { name: 'Script Gallery...', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Goodies', exact: true })
    await dialog.getByRole('button', { name: `Insert to Canvas: ${name}`, exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect.poll(() => generated(page)).toMatchObject({ width, height })
    const section = page.getByRole('region', { name: 'Script', exact: true })
    await expect(section).toHaveAttribute('aria-busy', 'false')
    await expect(section.getByRole('alert')).toHaveCount(0)
    await expect.poll(async () => (await generated(page))?.children.length).toBeGreaterThan(0)
    const inserted = (await generated(page))?.id
    expect(inserted).not.toBe(original)
    const image = await exportScript(page)
    expect(image.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    if (name === 'Candlestick' || name === 'Chart')
      expect(Buffer.from(image)).toMatchSnapshot(`gallery-${name.toLowerCase()}.png`)
    await writeFile(testInfo.outputPath('gallery-preview.png'), Buffer.from(image))
    await canvas.undo()
    await expect
      .poll(async () =>
        page.evaluate((id) => !!(id && window.openPencil?.getStore?.().graph.getNode(id)), inserted)
      )
      .toBe(false)
    await canvas.redo()
    await expect
      .poll(async () =>
        page.evaluate((id) => !!(id && window.openPencil?.getStore?.().graph.getNode(id)), inserted)
      )
      .toBe(true)
    canvas.assertNoErrors()
  })
}

test('gallery Script saves and reopens with its bundled source and editable inputs', async ({
  page
}) => {
  const canvas = await create(page)
  await page.getByRole('button', { name: 'Script Gallery...', exact: true }).click()
  await page.getByRole('button', { name: 'Insert to Canvas: Chart', exact: true }).click()
  const stroke = page.getByRole('spinbutton', { name: 'stroke', exact: true })
  await expect(stroke).toBeVisible()
  await stroke.dblclick()
  await stroke.fill('3')
  await stroke.press('Enter')
  await expect(stroke).toHaveAttribute('aria-valuenow', '3')
  page.once('dialog', (dialog) => dialog.accept('gallery-roundtrip.pen'))
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await readFile(await (await downloading).path())
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'gallery-roundtrip.pen', mimeType: 'application/json', buffer: saved })
  await canvas.waitForInit()
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const chart = store?.graph
      .getChildren(store.state.currentPageId)
      .find((node) => node.name === 'Chart')
    if (chart) store?.select([chart.id])
  })
  await expect(stroke).toHaveAttribute('aria-valuenow', '3')
  await expect.poll(async () => (await generated(page))?.children.length).toBeGreaterThan(0)
  await expect(
    page.getByRole('region', { name: 'Script', exact: true }).getByRole('alert')
  ).toHaveCount(0)
  canvas.assertNoErrors()
})
