import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { chooseSource, create, generated } from '#tests/helpers/document/scripts'
import { openAppMenu } from '#tests/helpers/menu'

const source = `/**
 * @schema 2.21
 * @input extent: number = 80
 */
return [{type:'rectangle',width:pencil.input.extent,height:40,fill:'#34A878'}];`

test('Script arithmetic retains precision through history, invalid drafts and saved reattachment', async ({
  page
}) => {
  await mockOfficialCloudDiscovery(page)
  const canvas = await create(page)
  await chooseSource(page, source)
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(80)
  const field = page.getByRole('spinbutton', { name: 'extent', exact: true })
  await field.focus()
  await field.fill('(1440-32)/3')
  await field.press('Enter')
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(1408 / 3)
  await canvas.undo()
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(80)
  await canvas.redo()
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(1408 / 3)
  for (const expression of ['1+', '1/0']) {
    await field.focus()
    await field.fill(expression)
    await field.press('Enter')
    await expect(field).toHaveAttribute('aria-valuenow', String(1408 / 3))
  }
  await field.focus()
  await field.fill('77')
  await field.press('Escape')
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(1408 / 3)
  page.once('dialog', (dialog) => dialog.accept('script-arithmetic.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const bytes = await readFile(await (await saving).path())
  expect(parsePenDocument(bytes.toString()).children[0].inputs).toEqual({ extent: 1408 / 3 })
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'script-arithmetic.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await canvas.selectAll()
  await chooseSource(page, source)
  await expect.poll(async () => (await generated(page))?.children[0]?.width).toBe(1408 / 3)
  canvas.assertNoErrors()
})
