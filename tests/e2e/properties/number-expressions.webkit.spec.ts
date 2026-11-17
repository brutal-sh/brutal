import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { propertyField } from '#tests/helpers/properties'
import {
  getNodeById,
  getPageChildren,
  getSelectedNode,
  getSelectedNodes
} from '#tests/helpers/store'

const ctx = useIsolatedEditorSetupWithClear('/', mockOfficialCloudDiscovery)

test.beforeEach(async () => {
  await ctx.canvas.drawRect(120, 100, 80, 80)
})

async function edit(property: string, expression: string) {
  const field =
    property === 'opacity'
      ? ctx.page
          .getByRole('region', { name: 'Appearance', exact: true })
          .locator('[data-property="opacity"]')
      : propertyField(ctx.page, property)
  await field.click()
  const input = field.getByRole('spinbutton')
  await input.fill(expression)
  return input
}

test('numeric inspector arithmetic preserves precision through history', async () => {
  await (await edit('x', '120*2')).press('Enter')
  expect((await getSelectedNode(ctx.page))?.x).toBe(240)
  await (await edit('width', '(1440-32)/3')).press('Enter')
  expect((await getSelectedNode(ctx.page))?.width).toBe(1408 / 3)
  await ctx.canvas.undo()
  expect((await getSelectedNode(ctx.page))?.width).toBe(80)
  await ctx.canvas.redo()
  expect((await getSelectedNode(ctx.page))?.width).toBe(1408 / 3)
  ctx.canvas.assertNoErrors()
})

test('invalid and non-finite numeric drafts restore committed values', async () => {
  for (const expression of ['1+', '1/0', '1e999', 'constructor']) {
    const input = await edit('width', expression)
    if (expression === '1e999') expect((await getSelectedNode(ctx.page))?.width).toBe(80)
    await input.press('Enter')
    expect((await getSelectedNode(ctx.page))?.width).toBe(80)
  }
  ctx.canvas.assertNoErrors()
})

test('signed arithmetic uses absolute coordinates and respects blur and Escape', async () => {
  await (await edit('y', '-10')).press('Enter')
  expect((await getSelectedNode(ctx.page))?.y).toBe(-10)
  await (await edit('x', '12.5*2')).press('Tab')
  expect((await getSelectedNode(ctx.page))?.x).toBe(25)
  await (await edit('x', '120*2')).press('Escape')
  expect((await getSelectedNode(ctx.page))?.x).toBe(25)
  ctx.canvas.assertNoErrors()
})

test('arithmetic retains the measured opacity and width clamping', async () => {
  await (await edit('opacity', '40')).press('Enter')
  await (await edit('opacity', '120*2')).press('Enter')
  await expect(
    ctx.page
      .getByRole('region', { name: 'Appearance', exact: true })
      .locator('[data-property="opacity"]')
  ).toHaveAttribute('aria-valuenow', '100')
  await (await edit('width', '-10')).press('Enter')
  expect((await getSelectedNode(ctx.page))?.width).toBe(0)
  ctx.canvas.assertNoErrors()
})

test('mixed arithmetic commits one undoable change and cancels invalid drafts', async () => {
  await ctx.canvas.drawRect(300, 100, 80, 80)
  await ctx.canvas.selectAll()
  const original = (await getSelectedNodes(ctx.page)).map((node) => node.x)
  await (await edit('x', '120*2')).press('Enter')
  expect((await getSelectedNodes(ctx.page)).map((node) => node.x)).toEqual([240, 240])
  await ctx.canvas.undo()
  expect((await getSelectedNodes(ctx.page)).map((node) => node.x)).toEqual(original)
  await (await edit('x', '1+')).press('Enter')
  expect((await getSelectedNodes(ctx.page)).map((node) => node.x)).toEqual(original)
  ctx.canvas.assertNoErrors()
})

test('bound radius arithmetic restores its token on invalid input and undo', async () => {
  const fixture = await ctx.page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    const node = editor?.getSelectedNodes()[0]
    if (!editor || !node) throw new Error('Rectangle fixture missing')
    const collection = editor.graph.createCollection('Arithmetic')
    const variable = editor.graph.createVariable('Radius', 'FLOAT', collection.id, 12)
    editor.bindVariable(node.id, 'cornerRadius', variable.id)
    return { nodeId: node.id, variableId: variable.id }
  })
  const binding = () =>
    ctx.page.evaluate(
      (id) => window.openPencil?.getStore?.().graph.getNode(id)?.boundVariables.cornerRadius,
      fixture.nodeId
    )
  const field = propertyField(ctx.page, 'cornerRadius')
  await expect(field).toHaveAttribute('data-bound')
  await (await edit('cornerRadius', '1+')).press('Enter')
  await expect(field).toHaveAttribute('data-bound')
  expect(await binding()).toBe(fixture.variableId)
  expect((await getSelectedNode(ctx.page))?.cornerRadius).toBe(12)
  await (await edit('cornerRadius', '12*2')).press('Enter')
  await expect(field).not.toHaveAttribute('data-bound')
  expect(await binding()).toBeUndefined()
  expect((await getSelectedNode(ctx.page))?.cornerRadius).toBe(24)
  await ctx.canvas.undo()
  await expect(field).toHaveAttribute('data-bound')
  expect(await binding()).toBe(fixture.variableId)
  expect((await getSelectedNode(ctx.page))?.cornerRadius).toBe(12)
  ctx.canvas.assertNoErrors()
})

test('layout gap and padding evaluate full expressions', async () => {
  const id = await ctx.page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const id = editor.createShape('FRAME', 100, 100, 240, 180)
    editor.updateNode(id, { layoutMode: 'HORIZONTAL', itemSpacing: 8 })
    editor.select([id])
    return id
  })
  const gap = ctx.page.getByRole('spinbutton', { name: 'Fixed gap amount', exact: true })
  await gap.focus()
  await gap.fill('(32-8)/2')
  await gap.press('Enter')
  expect((await getSelectedNode(ctx.page))?.itemSpacing).toBe(12)
  const padding = ctx.page.getByRole('spinbutton', { name: 'Horizontal padding', exact: true })
  await padding.focus()
  await padding.fill('8*2')
  await padding.press('Enter')
  expect(await getNodeById(ctx.page, id)).toMatchObject({ paddingLeft: 16, paddingRight: 16 })
  ctx.canvas.assertNoErrors()
})

test('typography arithmetic retains typed units and steps the evaluated draft', async () => {
  const id = await ctx.page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const id = editor.createShape('TEXT', 100, 100, 240, 80)
    editor.updateNode(id, {
      text: 'Arithmetic units',
      fontSize: 20,
      letterSpacing: { value: 0, unit: 'PIXELS' }
    })
    editor.select([id])
    return id
  })
  const read = () =>
    ctx.page.evaluate((id) => {
      const node = window.openPencil?.getStore?.().graph.getNode(id)
      if (!node) throw new Error('Text fixture missing')
      return { lineHeight: node.lineHeight, letterSpacing: node.letterSpacing }
    }, id)
  await (await edit('lineHeight', '75*2%')).press('Enter')
  expect((await read()).lineHeight).toEqual({ value: 150, unit: 'PERCENT' })
  const tracking = await edit('letterSpacing', '1.5*2px')
  await tracking.press('ArrowUp')
  await tracking.press('Enter')
  expect((await read()).letterSpacing).toEqual({ value: 4, unit: 'PIXELS' })
  await ctx.canvas.undo()
  expect((await read()).letterSpacing).toEqual({ value: 0, unit: 'PIXELS' })
  ctx.canvas.assertNoErrors()
})

test('arithmetic dimensions save and reopen through the pen document workflow', async () => {
  const { page, canvas } = ctx
  await (await edit('width', '(1440-32)/3')).press('Enter')
  const placed = await getSelectedNode(page)
  if (!placed) throw new Error('Edited rectangle missing')
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  page.once('dialog', (dialog) => dialog.accept('arithmetic.pen'))
  const downloading = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const saved = await downloading
  const bytes = await readFile(await saved.path())
  expect(parsePenDocument(bytes.toString()).children[0]?.width).toBe(1408 / 3)
  await page.getByTestId('tabbar-close').click()
  const choosing = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await choosing
  ).setFiles({ name: 'arithmetic.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  expect(await getPageChildren(page)).toMatchObject([{ id: placed.id, width: 1408 / 3 }])
  canvas.assertNoErrors()
})
