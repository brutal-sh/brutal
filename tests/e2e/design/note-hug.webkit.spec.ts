import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'

test.use({ viewport: { width: 1280, height: 1000 } })

test('Hug parent retains fallback and intrinsic Note overflow after File save/reopen', async ({
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
  await notes.open(testPath('fixtures/pen-note-hug.pen'))
  await canvas.waitForInit()
  await notes.origin()
  const savingName = 'note-hug-reopened.pen'
  for (let round = 0; round < 2; round++) {
    await expect
      .poll(() => notes.geometry(['hug', 'gold', 'purple']))
      .toEqual([
        { id: 'hug', x: 0, y: 0, width: 600, height: 500 },
        { id: 'gold', x: 20, y: 20, width: 560, height: 356 },
        { id: 'purple', x: 20, y: 376, width: 560, height: 219 }
      ])
    if (round !== 0) break
    await notes.select('hug')
    const bounds = await canvas.canvas.boundingBox()
    if (!bounds) throw new Error('Missing Note canvas bounds')
    await expect(page).toHaveScreenshot('note-hug-overflow.png', {
      // Include the complete frame and overflow; the session avatar sits outside this crop.
      clip: { x: bounds.x, y: bounds.y, width: 710, height: 750 },
      maxDiffPixels: 0,
      threshold: 0
    })
    page.once('dialog', (dialog) => dialog.accept(savingName))
    const saving = page.waitForEvent('download')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    const path = info.outputPath(savingName)
    await (await saving).saveAs(path)
    const saved = parsePenDocument(await readFile(path, 'utf8'))
    expect(saved.children[0]).toMatchObject({ height: 'fit_content(500)' })
    expect(saved.children[0].children).toMatchObject([
      { height: 'fill_container' },
      { height: 'fill_container' }
    ])
    await notes.open(path)
    await canvas.waitForInit()
  }
  canvas.assertNoErrors()
})
