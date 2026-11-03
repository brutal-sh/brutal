import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import { getSelectedNode } from '#tests/helpers/store'

test('top-level Fill sizing retains geometry, supports Undo and numeric override, and saves and reopens', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 270, 230)
  const inspector = page.getByTestId('properties-panel')
  const fill = inspector.getByRole('checkbox', { name: 'Fill Width', exact: true })
  await fill.check()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(fill).not.toBeChecked()
  await fill.check()
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('140')
  await width.press('Enter')
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(140)
  await canvas.undo()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  page.once('dialog', (dialog) => dialog.accept('deferred-fill.pen'))
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await download
  const bytes = await readFile(await saved.path())
  expect(parsePenDocument(bytes.toString()).children[0]).toMatchObject({
    width: 'fill_container(120)',
    height: 80
  })
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({ name: 'deferred-fill.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Frame 1' }).click()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await inspector.getByRole('button', { name: 'Vertical layout', exact: true }).click()
  await inspector.getByRole('checkbox', { name: 'Hug Width', exact: true }).check()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  canvas.assertNoErrors()
})

test('compact flex direction retains dimensions and keeps Fill and Hug mutually exclusive', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 350, 270)
  await canvas.drawRect(170, 170, 90, 30)
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Frame 1' }).first().click()
  const inspector = page.getByTestId('properties-panel')
  await inspector.getByRole('button', { name: 'Vertical layout', exact: true }).click()
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(200)
  await expect.poll(async () => (await getSelectedNode(page))?.height).toBe(120)
  const fill = inspector.getByRole('checkbox', { name: 'Fill Width', exact: true })
  const hug = inspector.getByRole('checkbox', { name: 'Hug Width', exact: true })
  await expect(hug).not.toBeChecked()
  await fill.check()
  await expect(hug).not.toBeChecked()
  await hug.check()
  await expect(fill).not.toBeChecked()
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(90)
  await inspector.getByRole('button', { name: 'Horizontal layout', exact: true }).click()
  await expect(hug).toBeChecked()
  await expect.poll(async () => (await getSelectedNode(page))?.height).toBe(120)
  await canvas.undo()
  await expect(
    inspector.getByRole('button', { name: 'Vertical layout', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(hug).toBeChecked()
  canvas.assertNoErrors()
})

test('compact multi-selection Fill retains individual fallbacks through numeric edits, mixed toggles, history and pen save/reopen', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const fixture = Buffer.from(
    JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'fill-a',
          type: 'rectangle',
          name: 'Fill A',
          x: 0,
          y: 0,
          width: 120.5,
          height: 80.75,
          fill: '#7799BB'
        },
        {
          id: 'fill-b',
          type: 'rectangle',
          name: 'Fill B',
          x: 180,
          y: 0,
          width: 80.25,
          height: 45.5,
          fill: '#AA6677'
        }
      ]
    })
  )
  const open = async (bytes: Buffer) => {
    const chooser = page.waitForEvent('filechooser')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await chooser
    ).setFiles({ name: 'multi-fill.pen', mimeType: 'application/json', buffer: bytes })
    await canvas.waitForInit()
    await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  }
  const row = (name: string) => page.getByTestId('layers-item').filter({ hasText: name })
  const selectBoth = async () => {
    await row('Fill A').click()
    await row('Fill B').click({ modifiers: ['Shift'] })
  }
  const sizes = () =>
    page.evaluate(() =>
      ['fill-a', 'fill-b'].map((id) => {
        const node = window.openPencil?.getStore?.().graph.getNode(id)
        if (!node) throw new Error('Fill fixture missing')
        return { width: node.width, height: node.height, x: node.x, y: node.y }
      })
    )
  await open(fixture)
  await selectBoth()
  await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const collection = editor.graph.createCollection('Dimension bindings')
    for (const [id, value] of [
      ['fill-a', 60.25],
      ['fill-b', 40.125]
    ] as const) {
      const variable = editor.graph.createVariable(id + ' width', 'FLOAT', collection.id, value)
      editor.graph.updateNode(id, {
        boundVariables: { width: variable.id },
        variableBindingScales: { width: 2 }
      })
    }
    editor.requestRender()
  })
  const bindings = () =>
    page.evaluate(() =>
      ['fill-a', 'fill-b'].map((id) => {
        const node = window.openPencil?.getStore?.().graph.getNode(id)
        if (!node) throw new Error('Fill fixture missing')
        return { bindings: node.boundVariables, scales: node.variableBindingScales }
      })
    )
  const originalBindings = await bindings()
  const inspector = page.getByTestId('properties-panel')
  const layout = inspector.getByRole('region', { name: 'Layout', exact: true })
  const width = layout.getByRole('spinbutton', { name: 'Width', exact: true })
  const fillWidth = layout.getByRole('checkbox', { name: 'Fill Width', exact: true })
  const fillHeight = layout.getByRole('checkbox', { name: 'Fill Height', exact: true })
  const original = await sizes()
  await expect(width).toHaveAttribute('data-mixed')
  await expect(layout.getByRole('spinbutton', { name: 'Spacing', exact: true })).toHaveCount(0)
  await fillWidth.check()
  await fillHeight.check()
  expect(await sizes()).toEqual(original)
  await width.dblclick()
  await width.fill('177.75')
  await width.press('Escape')
  expect(await sizes()).toEqual(original)
  expect(await bindings()).toEqual(originalBindings)
  await width.dblclick()
  await width.fill('140.25')
  await width.press('Enter')
  await expect(fillWidth).toBeChecked()
  await expect(fillHeight).toBeChecked()
  const edited = original.map((node) => ({ ...node, width: 140.25 }))
  expect(await sizes()).toEqual(edited)
  expect(await bindings()).toEqual([
    { bindings: {}, scales: {} },
    { bindings: {}, scales: {} }
  ])
  await width.dblclick()
  await width.fill('177.75')
  await width.press('Escape')
  expect(await sizes()).toEqual(edited)
  await expect(fillWidth).toBeChecked()
  await canvas.undo()
  expect(await sizes()).toEqual(original)
  expect(await bindings()).toEqual(originalBindings)
  await expect(fillWidth).toBeChecked()
  await canvas.redo()
  expect(await sizes()).toEqual(edited)
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(
    parsePenDocument(bytes.toString()).children.map((node) => [node.width, node.height])
  ).toEqual([
    ['fill_container(140.25)', 'fill_container(80.75)'],
    ['fill_container(140.25)', 'fill_container(45.5)']
  ])
  await open(bytes)
  await row('Fill A').click()
  await fillWidth.uncheck()
  await row('Fill B').click({ modifiers: ['Shift'] })
  await expect(fillWidth).toBeChecked({ indeterminate: true })
  await fillWidth.click()
  await expect(fillWidth).toBeChecked()
  expect(await sizes()).toEqual(edited)
  await canvas.undo()
  await expect(fillWidth).toBeChecked({ indeterminate: true })
  await canvas.redo()
  await expect(fillWidth).toBeChecked()
  await fillHeight.uncheck()
  expect(await sizes()).toEqual(edited)
  await canvas.undo()
  await expect(fillHeight).toBeChecked()
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await expect(layout.getByRole('spinbutton', { name: 'Spacing', exact: true })).toBeVisible()
  canvas.assertNoErrors()
})

test('a bound single Fill width restores its original binding when selection changes during a live edit', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const collection = editor.graph.createCollection('Fill cancellation')
    const variable = editor.graph.createVariable('Bound width', 'FLOAT', collection.id, 60)
    const first = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: 'Bound Fill A',
      width: 120,
      height: 80,
      boundVariables: { width: variable.id },
      variableBindingScales: { width: 2 }
    })
    const second = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: 'Bound Fill B',
      x: 180,
      width: 90,
      height: 60
    })
    editor.select([first.id])
    editor.requestRender()
    return { first: first.id, second: second.id }
  })
  const inspector = page.getByTestId('properties-panel')
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  const fill = inspector.getByRole('checkbox', { name: 'Fill Width', exact: true })
  await fill.check()
  const read = () =>
    page.evaluate((id) => {
      const node = window.openPencil?.getStore?.().graph.getNode(id)
      if (!node) throw new Error('Bound Fill fixture missing')
      return {
        width: node.width,
        height: node.height,
        bindings: node.boundVariables,
        scales: node.variableBindingScales,
        pluginData: node.pluginData
      }
    }, ids.first)
  const original = await read()
  await width.dblclick()
  await width.fill('160.25')
  await expect.poll(async () => (await read()).width).toBe(160.25)
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), ids.second)
  await expect(inspector.getByRole('textbox', { name: 'Layer name', exact: true })).toHaveValue(
    'Bound Fill B'
  )
  expect(await read()).toEqual(original)
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Bound Fill A' }).click()
  await expect(fill).toBeChecked()
  await canvas.undo()
  await expect(fill).not.toBeChecked()
  expect((await read()).bindings).toEqual(original.bindings)
  canvas.assertNoErrors()
})

test('compact multi-frame clipping appears in Appearance and restores each mixed value in one Undo step', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const first = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      width: 120,
      height: 80,
      clipsContent: false
    })
    const second = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      x: 180,
      width: 90,
      height: 60,
      clipsContent: true
    })
    editor.select([first.id, second.id])
    editor.requestRender()
    return [first.id, second.id]
  })
  const inspector = page.getByTestId('properties-panel')
  const appearance = inspector.getByRole('region', { name: 'Appearance', exact: true })
  const clip = appearance.getByRole('checkbox', { name: 'Clip content', exact: true })
  await expect(clip).toBeChecked({ indeterminate: true })
  await expect(
    inspector
      .getByRole('region', { name: 'Layout', exact: true })
      .getByRole('checkbox', { name: 'Clip content', exact: true })
  ).toHaveCount(0)
  const values = () =>
    page.evaluate(
      (ids) => ids.map((id) => window.openPencil?.getStore?.().graph.getNode(id)?.clipsContent),
      ids
    )
  await clip.click()
  expect(await values()).toEqual([true, true])
  await canvas.undo()
  expect(await values()).toEqual([false, true])
  await expect(clip).toBeChecked({ indeterminate: true })
  await canvas.redo()
  expect(await values()).toEqual([true, true])
  canvas.assertNoErrors()
})

test('compact frame inspector edits paired dimensions, appearance and clipping with Undo', async ({
  page
}, testInfo) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 350, 270)
  const inspector = page.getByTestId('properties-panel')
  await expect(inspector.getByRole('tablist')).toHaveCount(0)
  await expect(inspector.getByRole('region', { name: 'Status', exact: true })).toHaveCount(0)
  await expect(inspector.getByRole('combobox', { name: 'Frame preset', exact: true })).toHaveCount(
    0
  )
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  const height = inspector.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(width).toHaveAttribute('aria-valuenow', '200')
  const w = await width.boundingBox()
  const h = await height.boundingBox()
  expect(w && h && Math.abs(w.y - h.y)).toBeLessThan(1)
  await width.dblclick()
  await width.fill('240')
  await width.press('Enter')
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(240)
  await canvas.undo()
  await expect(width).toHaveAttribute('aria-valuenow', '200')
  const opacity = inspector
    .getByRole('region', { name: 'Appearance', exact: true })
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await opacity.dblclick()
  await opacity.fill('50')
  await opacity.press('Enter')
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.opacity))
    .toBe(0.5)
  await expect(opacity.locator('[data-slot="value"]')).toHaveText('50')
  await canvas.undo()
  const appearance = inspector.getByRole('region', { name: 'Appearance', exact: true })
  await expect(appearance.getByRole('combobox', { name: 'Blend mode', exact: true })).toHaveCount(0)
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await appearance.getByRole('combobox', { name: 'Blend mode', exact: true }).click()
  await page.getByRole('option', { name: 'Multiply', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.blendMode))
    .toBe('MULTIPLY')
  await canvas.undo()
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Design properties', exact: true })
    .click()
  const radius = inspector.getByRole('spinbutton', { name: 'Radius', exact: true })
  await radius.dblclick()
  await radius.fill('12')
  await radius.press('Enter')
  await expect.poll(async () => (await getSelectedNode(page))?.cornerRadius).toBe(12)
  await canvas.undo()
  const clipping = inspector
    .getByRole('region', { name: 'Appearance', exact: true })
    .getByRole('checkbox', { name: 'Clip content', exact: true })
  await expect(clipping).toBeChecked()
  await clipping.uncheck()
  await expect.poll(async () => (await getSelectedNode(page))?.clipsContent).toBe(false)
  await canvas.undo()
  await expect(clipping).toBeChecked()
  const zoom = await page.getByRole('button', { name: 'Zoom out', exact: true }).boundingBox()
  const panel = await inspector.boundingBox()
  expect(zoom && panel && zoom.x + zoom.width <= panel.x).toBe(true)
  await inspector.screenshot({ path: testInfo.outputPath('compact-frame-inspector.png') })
  canvas.assertNoErrors()
})

test('Fill and Hug sizing checkboxes update a real auto-layout child and Undo restores sizing', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const parent = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Parent',
      width: 400,
      height: 200,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    const child = store.graph.createNode('FRAME', parent.id, {
      name: 'Child',
      width: 100,
      height: 80,
      layoutMode: 'VERTICAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    store.select([child.id])
    store.requestRender()
  })
  const fill = page.getByRole('checkbox', { name: 'Fill Width', exact: true })
  await fill.check()
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.layoutGrow))
    .toBe(1)
  await canvas.undo()
  await expect(fill).not.toBeChecked()
  const hug = page.getByRole('checkbox', { name: 'Hug Height', exact: true })
  await hug.check()
  await expect
    .poll(() =>
      page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.primaryAxisSizing)
    )
    .toBe('HUG')
  await canvas.undo()
  await expect(hug).not.toBeChecked()
  canvas.assertNoErrors()
})

test('inspector collapse retains Context and selection state without creating document history', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  const first = await getSelectedNode(page)
  if (!first) throw new Error('Expected the owned rectangle')
  const inspector = page.getByTestId('properties-panel')
  await inspector.getByRole('button', { name: 'Context', exact: true }).click()
  const context = inspector.getByRole('textbox', { name: 'Context information', exact: true })
  await context.fill('Retained inspector context')
  await context.press('Tab')
  const before = await page.evaluate(() => window.openPencil?.getStore?.().state.sceneVersion)
  await inspector.getByRole('button', { name: 'Collapse inspector', exact: true }).click()
  await expect(context).toBeHidden()
  await expect(inspector.getByRole('textbox', { name: 'Layer name', exact: true })).toBeVisible()
  await expect(
    inspector.getByRole('button', { name: 'Create Component', exact: true })
  ).toBeHidden()
  await expect(inspector.getByRole('region', { name: 'Position', exact: true })).toBeHidden()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(inspector).toBeHidden()
  await page.getByTestId('layers-item').filter({ hasText: first.name }).click()
  await expect(
    inspector.getByRole('button', { name: 'Expand inspector', exact: true })
  ).toBeVisible()
  await expect(context).toBeHidden()
  await inspector.getByRole('button', { name: 'Expand inspector', exact: true }).press('Enter')
  await expect(context).toHaveValue('Retained inspector context')
  await expect(inspector.getByRole('region', { name: 'Position', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.openPencil?.getStore?.().state.sceneVersion)).toBe(before)
  await canvas.undo()
  await expect(context).toHaveValue('')
  canvas.assertNoErrors()
})

test('collapsed inspector keeps a multi-selection summary and restores its controls', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  await canvas.drawRect(320, 150, 100, 60)
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+a')
  const inspector = page.getByTestId('properties-panel')
  await expect(inspector.getByRole('heading', { name: '2 selected', exact: true })).toBeVisible()
  await inspector.getByRole('button', { name: 'Collapse inspector', exact: true }).click()
  await expect(inspector.getByRole('heading', { name: '2 selected', exact: true })).toBeVisible()
  await expect(inspector.getByRole('region', { name: 'Position', exact: true })).toBeHidden()
  await inspector.getByRole('button', { name: 'Expand inspector', exact: true }).click()
  await expect(inspector.getByRole('region', { name: 'Position', exact: true })).toBeVisible()
  canvas.assertNoErrors()
})
