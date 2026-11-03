import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

const fixture = Buffer.from(
  JSON.stringify({
    version: '2.21',
    children: [
      {
        id: 'corner-a',
        name: 'Corner A',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 64,
        height: 64,
        cornerRadius: 3.5,
        fill: '#7799BB'
      },
      {
        id: 'corner-b',
        name: 'Corner B',
        type: 'rectangle',
        x: 100,
        y: 0,
        width: 64,
        height: 64,
        cornerRadius: 5.5,
        fill: '#7799BB'
      }
    ]
  })
)

async function openFixture(page: Page, bytes = fixture) {
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({ name: 'compact-corners.pen', mimeType: 'application/json', buffer: bytes })
  await new CanvasHelper(page).waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
}

async function setup(page: Page) {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openFixture(page)
  const row = (name: string) => page.getByTestId('layers-item').filter({ hasText: name })
  const section = page
    .getByTestId('properties-panel')
    .getByRole('region', { name: 'Appearance', exact: true })
  return {
    canvas,
    row,
    section,
    uniform: section.getByRole('spinbutton', { name: 'Radius', exact: true }),
    corner: (name: string) => section.getByRole('spinbutton', { name, exact: true }),
    toggle: section.getByRole('button', { name: 'Independent corner radii', exact: true })
  }
}

async function corners(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return ['corner-a', 'corner-b'].map((id) => {
      const node = store.graph.getNode(id)
      if (!node) throw new Error('Corner fixture missing')
      return {
        id,
        independent: node.independentCorners,
        uniform: node.cornerRadius,
        values: [
          node.topLeftRadius,
          node.topRightRadius,
          node.bottomRightRadius,
          node.bottomLeftRadius
        ],
        bindings: node.boundVariables,
        scales: node.variableBindingScales
      }
    })
  })
}

test('single corner disclosure preserves the uniform field, data and history through collapse and reopen', async ({
  page
}) => {
  const { canvas, row, uniform, corner, toggle } = await setup(page)
  await row('Corner A').click()
  const original = await corners(page)
  await toggle.click()
  await expect(uniform).toHaveCount(1)
  await expect(toggle).toHaveCount(1)
  for (const name of ['TL', 'TR', 'BL', 'BR'])
    await expect(corner(name)).toHaveAttribute('aria-valuenow', '3.5')
  expect(await corners(page)).toEqual(original)
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await corner('TL').dblclick()
  await corner('TL').fill('7.25')
  await corner('TL').press('Escape')
  expect(await corners(page)).toEqual(original)
  await corner('TL').dblclick()
  await corner('TL').fill('7.25')
  await corner('TL').press('Enter')
  await expect(uniform).toHaveAttribute('data-mixed')
  const edited = await corners(page)
  expect(edited[0]).toMatchObject({ independent: true, values: [7.25, 3.5, 3.5, 3.5] })
  await toggle.click()
  await expect(corner('TL')).toHaveCount(0)
  expect(await corners(page)).toEqual(edited)
  await toggle.click()
  await expect(corner('TL')).toHaveAttribute('aria-valuenow', '7.25')
  await canvas.undo()
  expect(await corners(page)).toEqual(original)
  await expect(corner('TL')).toHaveAttribute('aria-valuenow', '3.5')
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await canvas.redo()
  expect(await corners(page)).toEqual(edited)
  await uniform.dblclick()
  await uniform.fill('4.25')
  await uniform.press('Escape')
  expect(await corners(page)).toEqual(edited)
  await uniform.dblclick()
  await uniform.fill('4.25')
  await uniform.press('Enter')
  expect((await corners(page))[0]).toMatchObject({
    independent: false,
    uniform: 4.25,
    values: [4.25, 4.25, 4.25, 4.25]
  })
  await canvas.undo()
  expect(await corners(page)).toEqual(edited)
  canvas.assertNoErrors()
})

test('multi-corner edits preserve each original through Escape, one-step Undo and actual pen save/reopen', async ({
  page
}) => {
  const { canvas, row, uniform, corner, toggle } = await setup(page)
  await row('Corner A').click()
  await row('Corner B').click({ modifiers: ['Shift'] })
  const original = await corners(page)
  await toggle.click()
  await expect(toggle).toHaveCount(1)
  await expect(uniform).toHaveAttribute('data-mixed')
  for (const name of ['TL', 'TR', 'BL', 'BR'])
    await expect(corner(name)).toHaveAttribute('data-mixed')
  expect(await corners(page)).toEqual(original)
  await corner('TL').dblclick()
  await corner('TL').fill('7.25')
  await corner('TL').press('Escape')
  expect(await corners(page)).toEqual(original)
  await corner('TL').dblclick()
  await corner('TL').fill('7.25')
  await corner('TL').press('Enter')
  const edited = await corners(page)
  expect(edited[0]).toMatchObject({ independent: true, values: [7.25, 3.5, 3.5, 3.5] })
  expect(edited[1]).toMatchObject({ independent: true, values: [7.25, 5.5, 5.5, 5.5] })
  await expect(corner('TR')).toHaveAttribute('data-mixed')
  await toggle.click()
  expect(await corners(page)).toEqual(edited)
  await canvas.undo()
  expect(await corners(page)).toEqual(original)
  await canvas.redo()
  expect(await corners(page)).toEqual(edited)
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(parsePenDocument(bytes.toString()).children.map((node) => node.cornerRadius)).toEqual([
    [7.25, 3.5, 3.5, 3.5],
    [7.25, 5.5, 5.5, 5.5]
  ])
  await openFixture(page, bytes)
  await row('Corner A').click()
  await row('Corner B').click({ modifiers: ['Shift'] })
  await expect(corner('TL')).toHaveCount(0)
  await expect(uniform).toHaveAttribute('data-mixed')
  await toggle.click()
  await expect(corner('TL')).toHaveAttribute('aria-valuenow', '7.25')
  await expect(corner('TR')).toHaveAttribute('data-mixed')
  canvas.assertNoErrors()
})

for (const advanced of [false, true]) {
  test(`${advanced ? 'Advanced uniform' : 'Compact individual'} corner binding transactions survive cancellation, deactivation and selection changes`, async ({
    page
  }) => {
    const { canvas, row, uniform, corner, toggle } = await setup(page)
    await row('Corner A').click()
    if (advanced)
      await (
        await openAppMenu(page, 'View')
      )
        .getByRole('menuitem', { name: 'Advanced properties', exact: true })
        .click()
    await page.evaluate(() => {
      const editor = window.openPencil?.getStore?.()
      if (!editor) throw new Error('Editor unavailable')
      const collection = editor.graph.createCollection('Corner cancellation')
      const global = editor.graph.createVariable('Radius/global', 'FLOAT', collection.id, 4)
      const local = editor.graph.createVariable('Radius/local', 'FLOAT', collection.id, 4)
      const ink = editor.graph.createVariable('Ink', 'COLOR', collection.id, {
        r: 0.4,
        g: 0.5,
        b: 0.6,
        a: 1
      })
      editor.graph.updateNode('corner-a', {
        cornerRadius: 8,
        topLeftRadius: 8,
        topRightRadius: 8,
        bottomRightRadius: 8,
        bottomLeftRadius: 8,
        boundVariables: {
          cornerRadius: global.id,
          topLeftRadius: local.id,
          'fills/0/color': ink.id
        },
        variableBindingScales: { cornerRadius: 2, topLeftRadius: 2 }
      })
      editor.requestRender()
    })
    const original = await corners(page)
    if (!advanced) await toggle.click()
    const field = advanced ? uniform : corner('TL')
    for (const terminal of ['Escape', 'invalid', 'deactivate', 'selection'] as const) {
      await field.dblclick()
      await field.fill('7.25')
      await expect.poll(async () => (await corners(page))[0].values[0]).toBe(7.25)
      if (terminal === 'invalid') {
        await field.fill('invalid')
        await field.press('Enter')
      } else if (terminal === 'Escape') {
        await field.press('Escape')
      } else if (terminal === 'deactivate') {
        await page.evaluate(() => window.openPencil?.getStore?.().setTool('FRAME'))
        await expect(field).toHaveCount(0)
        expect(await corners(page)).toEqual(original)
        await page.evaluate(() => window.openPencil?.getStore?.().setTool('SELECT'))
      } else {
        await page.evaluate(() => window.openPencil?.getStore?.().select(['corner-b']))
        await expect(page.getByRole('textbox', { name: 'Layer name', exact: true })).toHaveValue(
          'Corner B'
        )
        expect(await corners(page)).toEqual(original)
        await row('Corner A').click()
      }
      expect(await corners(page)).toEqual(original)
      expect(
        await page.evaluate(() => ({
          undo: window.openPencil?.getStore?.().undo.canUndo,
          interactive: window.openPencil?.getStore?.().isInteractiveEditing()
        }))
      ).toEqual({ undo: false, interactive: false })
    }
    await field.dblclick()
    await field.fill('7.25')
    await field.press('Enter')
    const edited = await corners(page)
    if (advanced) {
      expect(edited[0]).toMatchObject({
        independent: false,
        values: [7.25, 7.25, 7.25, 7.25],
        bindings: { 'fills/0/color': original[0].bindings['fills/0/color'] },
        scales: {}
      })
    } else {
      expect(edited[0]).toMatchObject({
        independent: true,
        values: [7.25, 8, 8, 8],
        bindings: {
          topRightRadius: original[0].bindings.cornerRadius,
          bottomRightRadius: original[0].bindings.cornerRadius,
          bottomLeftRadius: original[0].bindings.cornerRadius,
          'fills/0/color': original[0].bindings['fills/0/color']
        },
        scales: { topRightRadius: 2, bottomRightRadius: 2, bottomLeftRadius: 2 }
      })
      expect(edited[0].bindings.topLeftRadius).toBeUndefined()
      expect(edited[0].bindings.cornerRadius).toBeUndefined()
    }
    await canvas.undo()
    expect(await corners(page)).toEqual(original)
    expect(await page.evaluate(() => window.openPencil?.getStore?.().undo.canUndo)).toBe(false)
    await canvas.redo()
    expect(await corners(page)).toEqual(edited)
    canvas.assertNoErrors()
  })
}
