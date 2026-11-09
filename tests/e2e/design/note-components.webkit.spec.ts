import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { openAppMenu } from '#tests/helpers/menu'
import { testPath } from '#tests/helpers/paths'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test&no-rulers')
  await new CanvasHelper(page).waitForInit()
  await noteDriver(page).open(testPath('fixtures/pen-notes-2.22.pen'))
  await new CanvasHelper(page).waitForInit()
  await noteDriver(page).select('gold')
})

test('Note component controls create and detach with undo, and refuse read-only edits', async ({
  page
}, info) => {
  const notes = noteDriver(page)
  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Create Component', exact: true }).click()
  await expect
    .poll(() => notes.selected())
    .toMatchObject({ note: { type: 'COMPONENT', id: 'gold' } })
  await expect(panel.getByTestId('add-variant')).toHaveCount(0)
  const detach = panel.getByRole('button', { name: 'Detach Component', exact: true })
  await panel.screenshot({ path: info.outputPath('note-component-inspector.png') })
  await notes.readOnly(true)
  await expect(detach).toBeDisabled()
  await notes.readOnly(false)
  await detach.click()
  await expect.poll(() => notes.selected()).toMatchObject({ note: { type: 'FRAME', id: 'gold' } })
  await page.keyboard.press('ControlOrMeta+z')
  await expect(detach).toBeVisible()
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(panel.getByRole('button', { name: 'Create Component', exact: true })).toBeVisible()
  new CanvasHelper(page).assertNoErrors()
})

test('Note instance detaches through its inspector and survives File save/reopen', async ({
  page
}, info) => {
  const notes = noteDriver(page)
  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Create Component', exact: true }).click()
  const instance = await notes.createInstance('gold')
  await expect
    .poll(() => notes.selected())
    .toMatchObject({ note: { type: 'INSTANCE', componentId: 'gold' } })
  await notes.readOnly(true)
  await expect(panel.getByTestId('instance-detach')).toBeDisabled()
  await notes.readOnly(false)
  await panel.getByTestId('instance-detach').click()
  await expect
    .poll(() => notes.selected())
    .toMatchObject({ note: { id: instance, type: 'FRAME', componentId: null } })
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => notes.selected())
    .toMatchObject({ note: { id: instance, type: 'INSTANCE', componentId: 'gold' } })
  await page.keyboard.press('ControlOrMeta+Shift+z')
  const before = (await notes.selected()).note
  page.once('dialog', (dialog) => dialog.accept('detached-note.pen'))
  const downloading = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const savedPath = info.outputPath('detached-note.pen')
  await (await downloading).saveAs(savedPath)
  await notes.open(savedPath)
  await new CanvasHelper(page).waitForInit()
  await notes.select(instance)
  const reopened = await notes.selected()
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      note: { ...before, parentId: reopened.pageId }
    })
  new CanvasHelper(page).assertNoErrors()
})

test('resolved nested Note copies omit independent instance actions while prototypes offer them', async ({
  page
}) => {
  const notes = noteDriver(page)
  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Create Component', exact: true }).click()
  const { prototype } = await notes.createNestedInstance('gold')
  await expect(panel.getByTestId('instance-detach')).toHaveCount(0)
  await expect(panel.getByTestId('instance-go-to-main')).toHaveCount(0)
  await notes.select(prototype)
  await expect(panel.getByTestId('instance-detach')).toBeVisible()
  await expect(panel.getByTestId('instance-go-to-main')).toBeVisible()
})
