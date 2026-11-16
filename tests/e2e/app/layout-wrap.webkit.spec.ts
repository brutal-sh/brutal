import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'

test.beforeEach(async ({ page }) => mockOfficialCloudDiscovery(page))

const WRAP_ROUTES = ['inspector', 'keyboard', 'menu'] as const

for (const route of WRAP_ROUTES) {
  test(`spacing-aware wrapping through ${route} survives history and pen reopen`, async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.showOpenFilePicker = undefined
      window.showSaveFilePicker = undefined
    })
    await page.goto('/')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    const ids = await createWrappingPair(page)
    await applyWrappingRoute(page, route)
    const resized = await verifyWrappingHistory(canvas, ids)
    await saveAndReopenWrappingPair(canvas, ids, resized)
  })
}

async function createWrappingPair(page: Page) {
  return page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const nodes = [0, 1].map((i) =>
      editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        name: `Wrap ${i + 1}`,
        x: 0,
        y: i * 100,
        width: 80,
        height: 60,
        fills: [
          {
            type: 'SOLID',
            color: { r: 0.4667, g: 0.6, b: 0.7333, a: 1 },
            visible: true,
            opacity: 1
          }
        ]
      })
    )
    editor.select(nodes.toReversed().map((n) => n.id))
    editor.requestRender()
    return nodes.map((n) => n.id)
  })
}

async function applyWrappingRoute(page: Page, route: (typeof WRAP_ROUTES)[number]) {
  if (route === 'inspector') {
    await page
      .getByTestId('properties-panel')
      .getByRole('button', { name: 'Add flex layout', exact: true })
      .click()
  } else if (route === 'keyboard') {
    await page.keyboard.press('Shift+A')
  } else {
    await (
      await openAppMenu(page, 'Arrange')
    )
      .getByRole('menuitem', { name: /Wrap in Auto Layout|Add auto layout/i })
      .click()
  }
}

function wrappingPairState(page: Page, ids: string[]) {
  return page.evaluate((ids) => {
    const editor = window.openPencil?.getStore?.()
    const first = editor?.graph.getNode(ids[0])
    const frame = first?.parentId ? editor?.graph.getNode(first.parentId) : undefined
    if (!editor || !frame || frame.type !== 'FRAME') return null
    return {
      id: frame.id,
      name: frame.name,
      size: [frame.width, frame.height],
      gap: frame.itemSpacing,
      primary: frame.primaryAxisSizing,
      counter: frame.counterAxisSizing,
      children: editor.graph.getChildren(frame.id).map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        align: n.layoutAlignSelf
      }))
    }
  }, ids)
}

async function verifyWrappingHistory(canvas: CanvasHelper, ids: string[]) {
  const page = canvas.page
  const state = () => wrappingPairState(page, ids)
  await expect.poll(state).toMatchObject({
    name: 'Frame 1',
    size: [80, 160],
    gap: 40,
    primary: 'HUG',
    counter: 'FIXED'
  })
  const wrapped = await state()
  expect(wrapped?.children).toEqual(
    ids.map((id, i) => ({ id, x: 0, y: i * 100, width: 80, height: 60, align: 'STRETCH' }))
  )
  await canvas.undo()
  expect(await state()).toBeNull()
  expect(await page.evaluate(() => window.openPencil?.getStore?.().state.selectedIds.size)).toBe(0)
  await canvas.redo()
  expect(await state()).toEqual(wrapped)
  const width = page
    .getByTestId('properties-panel')
    .getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('120')
  await width.press('Enter')
  expect((await state())?.children.map((n) => n.width)).toEqual([120, 120])
  await canvas.undo()
  expect(await state()).toEqual(wrapped)
  await canvas.redo()
  return state()
}

async function saveAndReopenWrappingPair(
  canvas: CanvasHelper,
  ids: string[],
  resized: Awaited<ReturnType<typeof wrappingPairState>>
) {
  const page = canvas.page
  page.once('dialog', (dialog) => dialog.accept('wrapped.pen'))
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  const saved = parsePenDocument(bytes.toString()).children[0]
  expect(saved).toMatchObject({
    type: 'frame',
    name: 'Frame 1',
    layout: 'vertical',
    width: 120,
    gap: 40
  })
  if (saved.type !== 'frame') throw new Error('Saved wrapper is not a frame')
  expect(saved.children?.map((n) => n.width)).toEqual([
    expect.stringMatching(/^fill_container(?:\(120\))?$/),
    expect.stringMatching(/^fill_container(?:\(120\))?$/)
  ])
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({ name: 'wrapped-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await layerDriver(() => page).select(resized ? [resized.id] : [])
  expect(await wrappingPairState(page, ids)).toEqual(resized)
  canvas.assertNoErrors()
}
