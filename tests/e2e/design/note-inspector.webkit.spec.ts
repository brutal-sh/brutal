import { expect, test } from '@playwright/test'

import { parseColor } from '@open-pencil/scene-graph/color'

import { CanvasHelper } from '#tests/helpers/canvas'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { testPath } from '#tests/helpers/paths'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
  })
  await page.goto('/?test&no-rulers')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await noteDriver(page).open(testPath('fixtures/pen-notes-2.22.pen'))
  await canvas.waitForInit()
  await noteDriver(page).select('gold')
})

test('Note presets and custom hex edit with history, without generic frame controls', async ({
  page
}, info) => {
  const notes = noteDriver(page)
  const inspector = page.getByTestId('design-panel-single')
  const section = inspector.getByRole('region', { name: 'Note', exact: true })
  await expect(section.locator('button[aria-pressed="false"]')).toHaveCount(7)
  await expect(section.getByRole('button', { name: 'Yellow', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(inspector.getByRole('region', { name: 'Fill', exact: true })).toHaveCount(0)
  await expect(inspector.getByRole('region', { name: 'Stroke', exact: true })).toHaveCount(0)
  const radius = inspector.getByRole('spinbutton', { name: 'Radius', exact: true })
  await expect(radius).toBeDisabled()
  await expect(radius).toHaveAttribute('aria-valuenow', '0')
  await section.getByRole('button', { name: 'Purple', exact: true }).click()
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#DCC5F9') }])
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#FEE484') }])
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(section.getByRole('button', { name: 'Purple', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  const hex = section.getByRole('textbox', { name: 'Note color', exact: true })
  await hex.fill('ABCDEF')
  await hex.press('Tab')
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#ABCDEF') }])
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#DCC5F9') }])
  await inspector.screenshot({ path: info.outputPath('note-inspector.png') })
})

test('picker cancel restores variable binding, close commits once, and selection cancels late edits', async ({
  page
}) => {
  const notes = noteDriver(page)
  const variable = await notes.bindGold()
  const section = page.getByRole('region', { name: 'Note', exact: true })
  const trigger = () => section.getByRole('button', { name: 'Edit color', exact: true })
  async function preview(hex: string) {
    await trigger().click()
    await expect(page.getByRole('slider', { name: 'Alpha', exact: true })).toHaveCount(0)
    await page.getByTestId('color-format-select').click()
    await page.getByRole('option', { name: 'HEX', exact: true }).click()
    const input = page.getByRole('textbox', { name: 'HEX', exact: true })
    await input.fill(hex)
    await input.press('Tab')
    await expect
      .poll(() => notes.paints(['gold']))
      .toMatchObject([{ id: 'gold', color: parseColor(`#${hex}`) }])
  }
  await preview('ABCDEF')
  expect((await notes.paints())[0].binding).toBeUndefined()
  await page.keyboard.press('Escape')
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#FEE484'), binding: variable }])
  await preview('123456')
  await trigger().click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#FEE484'), binding: variable }])
  await preview('ABCDEF')
  await notes.select('purple')
  await expect(page.locator('[data-picker-content]')).toHaveCount(0)
  await expect
    .poll(() => notes.paints(['gold']))
    .toMatchObject([{ id: 'gold', color: parseColor('#FEE484'), binding: variable }])
})

test('mixed Notes recolor in one step and a read-only transition cancels the picker', async ({
  page
}) => {
  const notes = noteDriver(page)
  await notes.select(['gold', 'purple'])
  const section = page.getByRole('region', { name: 'Note', exact: true })
  const before = await notes.paints()
  await expect(section.getByRole('textbox', { name: 'Note color', exact: true })).toHaveAttribute(
    'placeholder',
    'Mixed'
  )
  await expect(section.getByRole('button', { pressed: true })).toHaveCount(0)
  await section.getByRole('button', { name: 'Blue', exact: true }).click()
  await expect
    .poll(() => notes.paints(['gold', 'purple']))
    .toMatchObject([
      { id: 'gold', color: parseColor('#AEDEFF') },
      { id: 'purple', color: parseColor('#AEDEFF') }
    ])
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => notes.paints()).toEqual(before)
  await section.getByRole('button', { name: 'Edit color', exact: true }).click()
  await expect(page.locator('[data-picker-content]')).toBeVisible()
  await expect.poll(() => notes.paints()).toEqual(before)
  await page.keyboard.press('Escape')
  await expect.poll(() => notes.paints()).toEqual(before)
  const hex = section.getByRole('textbox', { name: 'Note color', exact: true })
  await hex.fill('FEE484')
  await hex.press('Tab')
  await expect
    .poll(() => notes.paints(['gold', 'purple']))
    .toMatchObject([
      { id: 'gold', color: parseColor('#FEE484') },
      { id: 'purple', color: parseColor('#FEE484') }
    ])
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => notes.paints()).toEqual(before)
  await notes.select('gold')
  await section.getByRole('button', { name: 'Edit color', exact: true }).click()
  await notes.readOnly(true)
  await expect(page.locator('[data-picker-content]')).toHaveCount(0)
  await expect(section.getByRole('button', { name: 'Purple', exact: true })).toBeDisabled()
  await expect(section.getByRole('textbox', { name: 'Note color', exact: true })).toBeDisabled()
  await expect.poll(() => notes.paints()).toEqual(before)
})

test('read-only Notes close and refuse the visibility binding context menu', async ({ page }) => {
  const notes = noteDriver(page)
  const eye = page
    .getByTestId('design-panel-single')
    .getByRole('button', { name: 'Toggle visibility' })
  await eye.locator('..').click({ button: 'right' })
  const picker = page.getByRole('dialog', { name: 'Apply variable', exact: true })
  await expect(picker).toBeVisible()
  await notes.readOnly(true)
  await expect(picker).toHaveCount(0)
  await eye.locator('..').click({ button: 'right' })
  await expect(picker).toHaveCount(0)
})

test('Add flex layout wraps the Note and undo restores its original placement', async ({
  page
}) => {
  const notes = noteDriver(page)
  await page.getByRole('button', { name: 'Add flex layout', exact: true }).click()
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      note: { name: 'Frame 1', x: 14, y: 14, width: 270, height: 239 }
    })
  await page.keyboard.press('ControlOrMeta+z')
  expect((await notes.selected()).note).toBeUndefined()
  await notes.select('gold')
  expect((await notes.selected()).note).toMatchObject({ x: 24, y: 24, width: 250, height: 219 })
  await notes.readOnly(true)
  await expect(page.getByRole('button', { name: 'Add flex layout', exact: true })).toBeDisabled()
})

test('Note context edits use the shared history and become disabled in read-only mode', async ({
  page
}) => {
  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Context', exact: true }).click()
  const input = panel.getByRole('textbox', { name: 'Context information', exact: true })
  await input.fill('Note context acceptance')
  await input.press('Tab')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(input).toHaveValue('')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(input).toHaveValue('Note context acceptance')
  await noteDriver(page).readOnly(true)
  await expect(input).toBeDisabled()
})
