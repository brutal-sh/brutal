import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'

import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'

test('Pen Notes render against the native reference and survive a File save/reopen', async ({
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
  await notes.open(testPath('fixtures/pen-notes-2.22.pen'))
  await canvas.waitForInit()
  await expect
    .poll(() => notes.read())
    .toMatchObject([
      { id: 'gold', width: 250, height: 219, content: 'Default note\nSecond line' },
      { id: 'purple', width: 250, height: 219, content: 'Purple note' },
      { id: 'long', width: 300, height: 356 }
    ])
  const before = await notes.read()
  await notes.select('reference')
  const menu = await openAppMenu(page, 'File')
  await menu.getByRole('menuitem', { name: 'Export selection…', exact: true }).hover()
  const exporting = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'PNG', exact: true }).click()
  const exported = await exporting
  const pngPath = info.outputPath('notes.png')
  await exported.saveAs(pngPath)

  page.once('dialog', (dialog) => dialog.accept('reopened-notes.pen'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const savedPath = info.outputPath('reopened-notes.pen')
  await (await saving).saveAs(savedPath)
  await notes.open(savedPath)
  await canvas.waitForInit()
  await expect.poll(() => notes.read()).toEqual(before)
  canvas.assertNoErrors()

  const codec = createCanvasKitRasterCodec(await initCanvasKit())
  const reference = codec.decode(
    new Uint8Array(await readFile(testPath('fixtures/pen-notes-reference.png')))
  )
  const ours = codec.decode(new Uint8Array(await readFile(pngPath)))
  if (!reference || !ours) throw new Error('Note PNG unavailable')
  expect([ours.width, ours.height]).toEqual([reference.width, reference.height])
  let changedChannels = 0
  for (let i = 0; i < reference.data.length; i++)
    if (reference.data[i] !== ours.data[i]) changedChannels++
  expect(changedChannels).toBe(0)
})
