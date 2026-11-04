import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { openAppMenu } from '#tests/helpers/menu'

test('multi-frame flex controls edit every applicable frame in one history step', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const frames = [0, 1].map((index) => {
      const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
        name: `Flex ${index}`,
        x: index * 200,
        width: 160,
        height: 100,
        layoutMode: 'VERTICAL',
        itemSpacing: index ? 10 : 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 12,
        paddingRight: 12
      })
      for (let i = 0; i < 2; i++)
        editor.graph.createNode('RECTANGLE', frame.id, { width: 40, height: 20 })
      return frame.id
    })
    const shape = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      name: 'Unrelated shape',
      x: 400,
      width: 80,
      height: 60
    })
    editor.select([...frames, shape.id])
    editor.requestRender()
    return { frames, shape: shape.id }
  })
  const layout = page
    .getByTestId('properties-panel')
    .getByRole('region', { name: 'Flex Layout', exact: true })
  const state = () =>
    page.evaluate(({ frames, shape }) => {
      const graph = window.openPencil?.getStore?.().graph
      return [...frames, shape].map((id) => {
        const n = graph?.getNode(id)
        if (!n) throw new Error('Flex fixture unavailable')
        return {
          gap: n.itemSpacing,
          primary: n.primaryAxisAlign,
          counter: n.counterAxisAlign,
          padding: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft],
          pluginData: n.pluginData,
          children: graph?.getChildren(id).map((c) => [c.x, c.y])
        }
      })
    }, ids)
  const original = await state()
  const gap = layout.getByRole('spinbutton', { name: 'Fixed gap amount', exact: true })
  await expect(gap).toContainText('Mixed')
  await gap.dblclick()
  await gap.fill('12.5')
  await gap.press('Enter')
  const spaced = await state()
  expect(spaced.slice(0, 2).map((n) => n.gap)).toEqual([12.5, 12.5])
  expect(spaced[2]).toEqual(original[2])
  await canvas.undo()
  expect(await state()).toEqual(original)
  await canvas.redo()
  expect(await state()).toEqual(spaced)
  await layout.getByRole('radio', { name: 'Space Around', exact: true }).click()
  await expect(gap).toHaveAttribute('aria-disabled', 'true')
  const distributed = await state()
  expect(distributed[0].children).toEqual([
    [12, 21],
    [12, 59]
  ])
  expect(distributed[2]).toEqual(original[2])
  await layout
    .getByRole('group', { name: 'Alignment', exact: true })
    .getByRole('button')
    .nth(5)
    .click()
  const aligned = await state()
  expect(aligned.slice(0, 2).map((n) => n.counter)).toEqual(['MAX', 'MAX'])
  expect(aligned.slice(0, 2).map((n) => n.children)).toEqual([
    [
      [108, 21],
      [108, 59]
    ],
    [
      [108, 21],
      [108, 59]
    ]
  ])
  await canvas.undo()
  expect(await state()).toEqual(distributed)
  const vertical = layout.getByRole('spinbutton', { name: 'Vertical padding', exact: true })
  await vertical.dblclick()
  await vertical.fill('20.5')
  await vertical.press('Enter')
  expect((await state()).slice(0, 2).map((n) => n.padding)).toEqual([
    [20.5, 12, 20.5, 12],
    [20.5, 12, 20.5, 12]
  ])
  await canvas.undo()
  expect(await state()).toEqual(distributed)
  await vertical.dblclick()
  await vertical.fill('33.25')
  await vertical.press('Escape')
  expect(await state()).toEqual(distributed)
  await vertical.dblclick()
  await vertical.fill('20.5')
  await vertical.press('Enter')
  await layout.getByRole('button', { name: 'Individual padding', exact: true }).click()
  const left = layout.getByRole('spinbutton', { name: 'Left padding', exact: true })
  await left.dblclick()
  await left.fill('33.25')
  await left.press('Enter')
  const individual = await state()
  expect(individual.slice(0, 2).map((n) => n.padding)).toEqual([
    [20.5, 12, 20.5, 33.25],
    [20.5, 12, 20.5, 33.25]
  ])
  await canvas.undo()
  expect((await state()).slice(0, 2).map((n) => n.padding)).toEqual([
    [20.5, 12, 20.5, 12],
    [20.5, 12, 20.5, 12]
  ])
  await canvas.redo()
  expect(await state()).toEqual(individual)
  page.once('dialog', (dialog) => dialog.accept('multi-flex.pen'))
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(
    parsePenDocument(bytes.toString())
      .children.filter((n) => ids.frames.includes(n.id))
      .map((n) => ({
        gap: n.type === 'frame' ? n.gap : undefined,
        justify: n.type === 'frame' ? n.justifyContent : undefined,
        padding: n.type === 'frame' ? n.padding : undefined
      }))
  ).toEqual([
    { gap: 12.5, justify: 'space_around', padding: [20.5, 12, 20.5, 33.25] },
    { gap: 12.5, justify: 'space_around', padding: [20.5, 12, 20.5, 33.25] }
  ])
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({ name: 'multi-flex-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await layerDriver(() => page).select([...ids.frames, ids.shape])
  await expect(layout.getByRole('radio', { name: 'Space Around', exact: true })).toBeChecked()
  await expect(left).toHaveAttribute('aria-valuenow', '33.25')
  expect((await state()).slice(0, 2).map((n) => n.padding)).toEqual([
    [20.5, 12, 20.5, 33.25],
    [20.5, 12, 20.5, 33.25]
  ])
  canvas.assertNoErrors()
})

test('equalizing imported individual padding keeps the active field until commit', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const ids = [0, 1].map(
      (index) =>
        editor.graph.createNode('FRAME', editor.state.currentPageId, {
          x: index * 200,
          width: 160,
          height: 100,
          layoutMode: 'VERTICAL',
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 13
        }).id
    )
    editor.select(ids)
    editor.requestRender()
    return ids
  })
  const right = page
    .getByTestId('properties-panel')
    .getByRole('spinbutton', { name: 'Right padding', exact: true })
  await right.dblclick()
  await right.fill('12')
  await expect(right).toBeFocused()
  await right.press('Enter')
  const values = () =>
    page.evaluate(
      (ids) =>
        ids.map((id) => {
          const node = window.openPencil?.getStore?.().graph.getNode(id)
          return node ? [node.paddingLeft, node.paddingRight] : []
        }),
      ids
    )
  expect(await values()).toEqual([
    [12, 12],
    [12, 12]
  ])
  await canvas.undo()
  expect(await values()).toEqual([
    [12, 13],
    [12, 13]
  ])
  canvas.assertNoErrors()
})

test('multi-frame Hug retains geometry and authored freeform intent through history and pen reopen', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const open = async (bytes: Buffer) => {
    const chooser = page.waitForEvent('filechooser')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await chooser
    ).setFiles({ name: 'multi-hug.pen', mimeType: 'application/json', buffer: bytes })
    await canvas.waitForInit()
  }
  await open(
    Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'free',
            type: 'frame',
            name: 'Free',
            x: 0,
            y: 200,
            width: 160,
            height: 80,
            layout: 'none',
            fill: '#667788'
          },
          ...[0, 1].map((index) => ({
            id: `hug-${index}`,
            type: 'frame',
            name: `Hug ${index}`,
            x: index * 200,
            y: 0,
            width: 160,
            height: index ? 120 : 100,
            layout: 'vertical',
            padding: index ? 10 : 12,
            fill: '#557799',
            children: [
              {
                id: `child-${index}`,
                type: 'rectangle',
                name: 'Content',
                width: index ? 50 : 40,
                height: index ? 20 : 30,
                fill: '#CC8866'
              }
            ]
          }))
        ]
      })
    )
  )
  const layers = layerDriver(() => page)
  await layers.select(['hug-0', 'hug-1'])
  const inspector = page.getByTestId('properties-panel')
  const widthHug = inspector.getByRole('checkbox', { name: 'Hug Width', exact: true })
  const heightHug = inspector.getByRole('checkbox', { name: 'Hug Height', exact: true })
  const sizes = () =>
    page.evaluate(() =>
      ['hug-0', 'hug-1'].map((id) => {
        const node = window.openPencil?.getStore?.().graph.getNode(id)
        if (!node) throw new Error('Hug frame unavailable')
        return [node.width, node.height]
      })
    )
  await heightHug.check()
  await expect.poll(sizes).toEqual([
    [160, 54],
    [160, 40]
  ])
  await widthHug.check()
  await expect.poll(sizes).toEqual([
    [64, 54],
    [70, 40]
  ])
  await canvas.undo()
  expect(await sizes()).toEqual([
    [160, 54],
    [160, 40]
  ])
  await canvas.undo()
  expect(await sizes()).toEqual([
    [160, 100],
    [160, 120]
  ])
  await canvas.redo()
  await canvas.redo()
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(
    parsePenDocument(bytes.toString())
      .children.filter((node) => node.id.startsWith('hug-'))
      .map((node) => [node.width, node.height])
  ).toEqual([
    ['fit_content(64)', 'fit_content(54)'],
    ['fit_content(70)', 'fit_content(40)']
  ])
  await open(bytes)
  await layers.select(['hug-0', 'hug-1'])
  await expect(widthHug).toBeChecked()
  await expect(heightHug).toBeChecked()
  expect(await sizes()).toEqual([
    [64, 54],
    [70, 40]
  ])
  await layers.select(['free'])
  await inspector.getByRole('checkbox', { name: 'Fill Width', exact: true }).check()
  const freeState = () =>
    page.evaluate(() => {
      const node = window.openPencil?.getStore?.().graph.getNode('free')
      if (!node) throw new Error('Free frame unavailable')
      return { width: node.width, height: node.height, pluginData: node.pluginData }
    })
  const free = await freeState()
  await layers.select(['free', 'hug-0'])
  await expect(heightHug).toBeChecked({ indeterminate: true })
  await expect(widthHug).toBeChecked({ indeterminate: true })
  await widthHug.click()
  await expect(widthHug).toBeChecked()
  expect(await freeState()).toMatchObject({ width: free.width, height: free.height })
  expect((await freeState()).pluginData).not.toEqual(free.pluginData)
  await canvas.undo()
  expect(await freeState()).toEqual(free)
  await expect(widthHug).toBeChecked({ indeterminate: true })
  await heightHug.click()
  await expect(heightHug).toBeChecked()
  expect(await freeState()).toMatchObject({ width: free.width, height: free.height })
  await canvas.undo()
  expect(await freeState()).toEqual(free)
  await expect(heightHug).toBeChecked({ indeterminate: true })
  await heightHug.click()
  const deferredDownload = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const deferredBytes = await readFile(await (await deferredDownload).path())
  expect(
    parsePenDocument(deferredBytes.toString()).children.find((node) => node.id === 'free')
  ).toMatchObject({
    width: 'fill_container(160)',
    height: 'fit_content(80)',
    layout: 'none'
  })
  await open(deferredBytes)
  await layers.select(['free', 'hug-0'])
  await expect(heightHug).toBeChecked()
  expect(await freeState()).toMatchObject({ width: free.width, height: free.height })
  await layers.select(['hug-0'])
  await heightHug.uncheck()
  await layers.select(['hug-0', 'hug-1'])
  await expect(heightHug).toBeChecked({ indeterminate: true })
  await heightHug.click()
  await expect(heightHug).toBeChecked()
  await canvas.undo()
  await expect(heightHug).toBeChecked({ indeterminate: true })
  canvas.assertNoErrors()
})

test('mixed flow targets frames while Hug preserves authored shape intent and geometry', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      name: 'Mixed frame',
      width: 160,
      height: 100,
      layoutMode: 'HORIZONTAL'
    })
    editor.graph.createNode('RECTANGLE', frame.id, { width: 40, height: 30 })
    const shape = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      name: 'Unrelated shape',
      x: 200,
      y: 100,
      width: 80,
      height: 60
    })
    editor.select([frame.id, shape.id])
    editor.requestRender()
    return { frame: frame.id, shape: shape.id }
  })
  const inspector = page.getByTestId('properties-panel')
  const layout = inspector.getByRole('region', { name: 'Flex Layout', exact: true })
  const state = () =>
    page.evaluate((ids) => {
      const graph = window.openPencil?.getStore?.().graph
      const frame = graph?.getNode(ids.frame),
        shape = graph?.getNode(ids.shape)
      if (!frame || !shape) throw new Error('Mixed fixture unavailable')
      return {
        mode: frame.layoutMode,
        size: [frame.width, frame.height],
        shape: [shape.x, shape.y, shape.width, shape.height, shape.layoutMode]
      }
    }, ids)
  const original = await state()
  await expect(
    layout.getByRole('button', { name: 'Horizontal layout', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await layout.getByRole('button', { name: 'Vertical layout', exact: true }).click()
  expect(await state()).toEqual({ ...original, mode: 'VERTICAL' })
  await canvas.undo()
  expect(await state()).toEqual(original)
  await layout.getByRole('checkbox', { name: 'Hug Height', exact: true }).check()
  await expect(layout.getByRole('checkbox', { name: 'Hug Height', exact: true })).toBeChecked()
  await expect.poll(state).toEqual({ ...original, size: [160, 30] })
  await canvas.undo()
  expect(await state()).toEqual(original)
  canvas.assertNoErrors()
})
