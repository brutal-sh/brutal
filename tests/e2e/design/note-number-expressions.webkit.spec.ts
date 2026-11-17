import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'

async function openNoteFixture(page: Page) {
  await mockOfficialCloudDiscovery(page)
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  const notes = noteDriver(page)
  await canvas.waitForInit()
  await notes.open(testPath('fixtures/pen-note-fill.pen'))
  await canvas.waitForInit()
  await notes.select('gold')
  return { canvas, notes }
}

test('Note opacity arithmetic retains history, cancellation and saved body content', async ({
  page
}) => {
  const { canvas, notes } = await openNoteFixture(page)
  const field = page
    .getByRole('region', { name: 'Appearance', exact: true })
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  const opacity = () =>
    page.evaluate(() => window.openPencil?.getStore?.().graph.getNode('gold')?.opacity)
  await field.focus()
  await field.fill('(100-20)/2')
  await field.press('Tab')
  expect(await opacity()).toBe(0.4)
  await page.getByRole('heading', { name: 'Appearance', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Note color', exact: true })).not.toBeFocused()
  await canvas.undo()
  expect(await opacity()).toBe(1)
  await canvas.redo()
  expect(await opacity()).toBe(0.4)
  for (const expression of ['1+', '1/0']) {
    await field.focus()
    await field.fill(expression)
    await field.press('Enter')
    expect(await opacity()).toBe(0.4)
  }
  await field.focus()
  await field.fill('80')
  await field.press('Escape')
  expect(await opacity()).toBe(0.4)
  page.once('dialog', (dialog) => dialog.accept('note-arithmetic.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const bytes = await readFile(await (await saving).path())
  expect(parsePenDocument(bytes.toString()).children[0].children?.[0]).toMatchObject({
    id: 'gold',
    opacity: 0.4,
    content: 'Fill sizing'
  })
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'note-arithmetic.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await notes.select('gold')
  expect(await opacity()).toBe(0.4)
  expect((await notes.read())[0].content).toBe('Fill sizing')
  canvas.assertNoErrors()
})
