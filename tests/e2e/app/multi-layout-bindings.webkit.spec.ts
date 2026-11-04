import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('paired multi-frame padding retains bindings through cancellation, selection changes and history', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const collection = editor.graph.createCollection('Padding cancellation')
    const spacing = editor.graph.createVariable('Spacing', 'FLOAT', collection.id, 2.5)
    const opacity = editor.graph.createVariable('Opacity', 'FLOAT', collection.id, 0.5)
    const frames = [0, 1].map(
      (index) =>
        editor.graph.createNode('FRAME', editor.state.currentPageId, {
          name: `Bound padding ${index}`,
          x: index * 200,
          width: 160,
          height: 100,
          layoutMode: 'VERTICAL',
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 12,
          paddingRight: 12,
          opacity: 0.5,
          boundVariables: {
            paddingTop: spacing.id,
            paddingBottom: spacing.id,
            opacity: opacity.id
          },
          variableBindingScales: { paddingTop: 2, paddingBottom: 2 }
        }).id
    )
    const shape = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      name: 'Other selection',
      x: 400,
      width: 80,
      height: 60
    }).id
    editor.select(frames)
    editor.requestRender()
    return { frames, shape }
  })
  const values = () =>
    page.evaluate(
      (ids) =>
        ids.frames.map((id) => {
          const node = window.openPencil?.getStore?.().graph.getNode(id)
          if (!node) throw new Error('Bound frame unavailable')
          return {
            padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft],
            bindings: node.boundVariables,
            scales: node.variableBindingScales
          }
        }),
      ids
    )
  const field = page
    .getByTestId('properties-panel')
    .getByRole('region', { name: 'Flex Layout', exact: true })
    .getByRole('spinbutton', { name: 'Vertical padding', exact: true })
  const original = await values()
  for (const terminal of ['Escape', 'invalid', 'deactivate', 'selection'] as const) {
    await field.dblclick()
    await field.fill('7.25')
    await expect
      .poll(async () => (await values()).map((n) => [n.padding[0], n.padding[2]]))
      .toEqual([
        [7.25, 7.25],
        [7.25, 7.25]
      ])
    if (terminal === 'Escape') await field.press('Escape')
    else if (terminal === 'invalid') {
      await field.fill('invalid')
      await field.press('Enter')
    } else if (terminal === 'deactivate') {
      await page.evaluate(() => window.openPencil?.getStore?.().setTool('FRAME'))
      await expect(field).toHaveCount(0)
      expect(await values()).toEqual(original)
      await page.evaluate(() => window.openPencil?.getStore?.().setTool('SELECT'))
    } else {
      await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), ids.shape)
      await expect(field).toHaveCount(0)
      expect(await values()).toEqual(original)
      await page.evaluate((ids) => window.openPencil?.getStore?.().select(ids), ids.frames)
    }
    expect(await values()).toEqual(original)
    expect(
      await page.evaluate(() => {
        const editor = window.openPencil?.getStore?.()
        return { undo: editor?.undo.canUndo, interactive: editor?.isInteractiveEditing() }
      })
    ).toEqual({ undo: false, interactive: false })
  }
  await field.dblclick()
  await field.fill('7.25')
  await field.press('Enter')
  const edited = await values()
  expect(edited.map((n) => n.padding)).toEqual([
    [7.25, 12, 7.25, 12],
    [7.25, 12, 7.25, 12]
  ])
  expect(edited.map((n) => n.bindings)).toEqual(
    original.map((n) => ({ opacity: n.bindings.opacity }))
  )
  expect(edited.map((n) => n.scales)).toEqual([{}, {}])
  await canvas.undo()
  expect(await values()).toEqual(original)
  await canvas.redo()
  expect(await values()).toEqual(edited)
  canvas.assertNoErrors()
})
