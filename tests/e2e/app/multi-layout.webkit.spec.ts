import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { openAppMenu } from '#tests/helpers/menu'

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
