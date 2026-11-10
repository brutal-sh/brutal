import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'

test('Note Fill controls retain intrinsic height, authored fallbacks and save/reopen history', async ({
  page
}, info) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test&no-rulers')
  const canvas = new CanvasHelper(page)
  const notes = noteDriver(page)
  await canvas.waitForInit()
  await notes.open(testPath('fixtures/pen-note-fill.pen'))
  await canvas.waitForInit()
  await expect
    .poll(() => notes.read())
    .toEqual([
      { id: 'gold', width: 560, height: 219, content: 'Fill sizing' },
      { id: 'purple', width: 560, height: 219, content: 'Second Note' },
      { id: 'long', width: 250, height: 219, content: 'Root fallback' }
    ])
  await notes.select('gold')
  const widthFill = page.getByRole('checkbox', { name: 'Fill Width', exact: true })
  const heightFill = page.getByRole('checkbox', { name: 'Fill Height', exact: true })
  await expect(widthFill).toBeChecked()
  await expect(heightFill).toBeChecked()
  const bounds = await canvas.canvas.boundingBox()
  if (!bounds) throw new Error('Missing Note canvas bounds')
  await expect(page).toHaveScreenshot('note-fill-layout.png', {
    clip: { x: bounds.x, y: bounds.y, width: 650, height: 650 },
    maxDiffPixels: 0,
    threshold: 0
  })
  await widthFill.uncheck()
  await expect(widthFill).not.toBeChecked()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(widthFill).toBeChecked()
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(widthFill).not.toBeChecked()
  await heightFill.uncheck()
  const height = page.getByRole('spinbutton', { name: 'Height', exact: true })
  await height.dblclick()
  await height.fill('450')
  await height.press('Tab')
  await expect.poll(() => notes.selected()).toMatchObject({ note: { width: 560, height: 219 } })
  await page.keyboard.press('ControlOrMeta+z')
  await expect(heightFill).not.toBeChecked()
  await page.keyboard.press('ControlOrMeta+Shift+z')
  const before = await notes.read()
  page.once('dialog', (dialog) => dialog.accept('note-fill-reopened.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const path = info.outputPath('note-fill-reopened.pen')
  await (await saving).saveAs(path)
  const saved = parsePenDocument(await readFile(path, 'utf8'))
  expect(saved.children[0].children).toMatchObject([
    { id: 'gold', width: 560, height: 450, content: 'Fill sizing' },
    { id: 'purple', width: 'fill_container', height: 'fill_container', content: 'Second Note' }
  ])
  expect(saved.children[1]).toMatchObject({
    width: 'fill_container(200)',
    height: 'fill_container(550)',
    content: 'Root fallback'
  })
  await notes.open(path)
  await canvas.waitForInit()
  await expect.poll(() => notes.read()).toEqual(before)
  await notes.select('gold')
  await expect(widthFill).not.toBeChecked()
  await expect(heightFill).not.toBeChecked()
  await notes.readOnly(true)
  await expect(widthFill).toBeDisabled()
  await expect(heightFill).toBeDisabled()
  await expect(height).toHaveAttribute('aria-disabled', 'true')
  canvas.assertNoErrors()
})

test('typing with Note Fill checked saves the entered fallbacks and Escape restores the draft', async ({
  page
}, info) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test&no-rulers')
  const canvas = new CanvasHelper(page)
  const notes = noteDriver(page)
  await canvas.waitForInit()
  await notes.open(testPath('fixtures/pen-note-fill.pen'))
  await canvas.waitForInit()
  await notes.select('gold')
  for (const axis of ['Width', 'Height']) {
    const field = page.getByRole('spinbutton', { name: axis, exact: true })
    await field.dblclick()
    await field.fill('450')
    await field.press('Tab')
    await expect(page.getByRole('checkbox', { name: `Fill ${axis}`, exact: true })).toBeChecked()
  }
  const width = page.getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('700')
  await width.press('Escape')
  await expect.poll(() => notes.selected()).toMatchObject({ note: { width: 560, height: 219 } })
  page.once('dialog', (dialog) => dialog.accept('retained-note-fill.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const path = info.outputPath('retained-note-fill.pen')
  await (await saving).saveAs(path)
  expect(parsePenDocument(await readFile(path, 'utf8')).children[0].children?.[0]).toMatchObject({
    width: 'fill_container(450)',
    height: 'fill_container(450)',
    content: 'Fill sizing'
  })
  await notes.open(path)
  await canvas.waitForInit()
  await notes.select('gold')
  await expect.poll(() => notes.selected()).toMatchObject({ note: { width: 560, height: 219 } })
  await expect(page.getByRole('checkbox', { name: 'Fill Width', exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Fill Height', exact: true })).toBeChecked()
  canvas.assertNoErrors()
})
