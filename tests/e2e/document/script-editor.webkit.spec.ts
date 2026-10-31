import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

const source = `/**
 * @schema 2.21
 * @input columns: number(min=1, max=5) = 3
 * @input ink: color = #34A878
 * @input caption: string = "Probe"
 * @input filled: boolean = true
 * @input distribution: enum("even", "alternate") = "even"
 */
return Array.from({length: Math.floor(pencil.input.columns)}, (_, index) => ({
  type: 'rectangle', name: pencil.input.caption + ' ' + (index + 1),
  x: index * pencil.width / pencil.input.columns,
  y: pencil.input.distribution === 'alternate' ? index % 2 * 10 : 0,
  width: pencil.width / pencil.input.columns - 6, height: pencil.height - 30,
  fill: pencil.input.filled ? pencil.input.ink : '#FFFFFF00'
}));`

async function generated(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    return node && store
      ? {
          id: node.id,
          type: node.type,
          width: node.width,
          height: node.height,
          children: store.graph.getChildren(node.id).map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
            width: child.width,
            height: child.height,
            x: child.x,
            y: child.y,
            opacity: child.fills[0]?.opacity,
            color: child.fills[0]?.color
          }))
        }
      : null
  })
}

async function chooseSource(page: Page, code = source) {
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose script file', exact: true }).click()
  await (
    await choosing
  ).setFiles({ name: 'probe.js', mimeType: 'text/javascript', buffer: Buffer.from(code) })
}

async function create(page: Page) {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.getByRole('button', { name: 'Primitives', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Script', exact: true }).click()
  await canvas.click(300, 250)
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toBeVisible()
  await expect.poll(() => generated(page)).toMatchObject({ width: 200, height: 200 })
  await expect(page.getByRole('spinbutton', { name: 'Radius', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true'
  )
  return canvas
}

test('Script creates, links, edits inputs, converts to editable layers and undoes', async ({
  page
}, testInfo) => {
  const canvas = await create(page)
  await chooseSource(page)
  const section = page.getByRole('region', { name: 'Script', exact: true })
  const count = section.getByRole('spinbutton', { name: 'columns', exact: true })
  await expect(count).toHaveAttribute('aria-valuenow', '3')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await count.dblclick()
  await count.fill('9')
  await count.press('Enter')
  await expect(count).toHaveAttribute('aria-valuenow', '9')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(5)
  expect((await generated(page))?.children[0]).toMatchObject({ width: 34, height: 170 })
  await canvas.undo()
  await expect(count).toHaveAttribute('aria-valuenow', '3')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await canvas.redo()
  await expect.poll(async () => (await generated(page))?.children.length).toBe(5)
  await section.getByRole('checkbox', { name: 'filled', exact: true }).uncheck()
  await expect.poll(async () => (await generated(page))?.children[0].opacity).toBe(0)
  await canvas.undo()
  const caption = section.getByRole('textbox', { name: 'caption', exact: true })
  await caption.fill('Changed')
  await caption.press('Tab')
  await expect.poll(async () => (await generated(page))?.children[0].name).toBe('Changed 1')
  await section.getByRole('combobox', { name: 'distribution', exact: true }).click()
  await page.getByRole('option', { name: 'alternate', exact: true }).click()
  await expect.poll(async () => (await generated(page))?.children[1].y).toBe(10)
  await section.getByTestId('color-hex-input').fill('FF0000')
  await section.getByTestId('color-hex-input').press('Tab')
  await expect
    .poll(async () => (await generated(page))?.children[0].color)
    .toMatchObject({ r: 1, g: 0, b: 0 })
  await expect(section).toHaveAttribute('aria-busy', 'false')
  const alpha = section.getByRole('spinbutton', { name: 'ink opacity', exact: true })
  await alpha.dblclick()
  await alpha.fill('25')
  await alpha.press('Enter')
  await expect.poll(async () => (await generated(page))?.children[0].opacity).toBeCloseTo(0.25, 2)
  await canvas.undo()
  await expect.poll(async () => (await generated(page))?.children[0].opacity).toBe(1)
  expect(await canvas.screenshotCanvasRegion(650, 500)).toMatchSnapshot('script-generated.png', {
    maxDiffPixelRatio: 0,
    threshold: 0
  })
  await page.screenshot({ path: testInfo.outputPath('script-inputs-rendered.png') })
  const originalScript = await generated(page)
  await section.getByRole('button', { name: 'Convert to layers', exact: true }).click()
  const convertedFrame = await generated(page)
  expect(convertedFrame?.id).not.toBe(originalScript?.id)
  expect(convertedFrame?.children.map((child) => child.id)).not.toEqual(
    originalScript?.children.map((child) => child.id)
  )
  await expect(section).toHaveCount(0)
  await canvas.dblclick(310, 260)
  await expect.poll(async () => (await generated(page))?.type).toBe('RECTANGLE')
  const width = page
    .getByTestId('properties-panel')
    .getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('42')
  await width.press('Enter')
  await expect(width).toHaveAttribute('aria-valuenow', '42')
  await canvas.undo()
  await canvas.undo()
  await expect.poll(() => generated(page)).toBeNull()
  await canvas.click(310, 260)
  await expect(section).toBeVisible()
  await expect(count).toHaveAttribute('aria-valuenow', '9')
  canvas.assertNoErrors()
})

test('Script authored inputs save and reopen while generated layers remain derived', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const openingFixture = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await openingFixture
  ).setFiles({
    name: 'script-authored.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            type: 'script',
            id: 'persisted-script',
            name: 'Persisted Script',
            width: 200,
            height: 200,
            scriptUri: 'probe.js',
            inputs: {
              columns: 9,
              caption: 'Changed',
              distribution: 'alternate',
              ink: '#FF0000',
              filled: true
            }
          }
        ]
      })
    )
  })
  await canvas.waitForInit()
  await canvas.selectAll()
  await chooseSource(page)
  const count = page.getByRole('spinbutton', { name: 'columns', exact: true })
  await expect(count).toHaveAttribute('aria-valuenow', '9')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(5)
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await readFile(await (await downloading).path())
  const authored = parsePenDocument(saved.toString()).children[0]
  expect(authored).toMatchObject({
    type: 'script',
    scriptUri: 'probe.js',
    inputs: { columns: 9, caption: 'Changed', distribution: 'alternate' }
  })
  expect(authored.children).toBeUndefined()
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'script-roundtrip.pen', mimeType: 'application/json', buffer: saved })
  await canvas.waitForInit()
  await canvas.pressKey('ControlOrMeta+a')
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toHaveValue(
    'probe.js'
  )
  await chooseSource(page)
  await expect(count).toHaveAttribute('aria-valuenow', '9')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(5)
  canvas.assertNoErrors()
})

test('invalid and cancelled Script execution recover without replacing later output', async ({
  page
}) => {
  const canvas = await create(page)
  await chooseSource(page, '/** @schema 2.21 */\nthrow new Error("Independent failure");')
  await expect(page.getByRole('alert')).toBeVisible()
  await chooseSource(page, '/** @schema 2.21 */\nwhile (true) {}')
  await expect(page.locator('iframe[sandbox="allow-scripts"]')).toHaveCount(1)
  await chooseSource(page)
  await expect(page.getByRole('spinbutton', { name: 'columns', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '3'
  )
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await canvas.undo()
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toHaveValue('')
  canvas.assertNoErrors()
})

test('source-path Escape and graph replacement discard the original owner draft', async ({
  page
}) => {
  const canvas = await create(page)
  await chooseSource(page)
  const path = page.getByRole('textbox', { name: 'Script file', exact: true })
  await expect(path).toHaveValue('probe.js')
  await expect(page.getByRole('region', { name: 'Script', exact: true })).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await path.fill('discard-me.js')
  await path.press('Escape')
  await expect(path).toHaveValue('probe.js')
  await path.fill('wrong-owner.js')
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const previous = store?.getSelectedNodes()[0]
    if (!store || !previous) throw new Error('No Script fixture owner')
    const activeGraph = store.graph
    const Graph = activeGraph.constructor as new () => typeof activeGraph
    const graph = new Graph()
    graph.createNodeWithId(previous.id, 'FRAME', graph.getPages()[0].id, {
      name: 'Replacement Script',
      width: 200,
      height: 200,
      pluginData: structuredClone(previous.pluginData)
    })
    store.replaceGraph(graph)
    store.select([previous.id])
  })
  await expect(path).toHaveValue('probe.js')
  await path.press('Enter')
  await expect(path).toHaveValue('probe.js')
  canvas.assertNoErrors()
})

test('Script conversion is disabled for fixed component-instance content', async ({ page }) => {
  const canvas = await create(page)
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const script = store?.getSelectedNodes()[0]
    if (!store || !script) throw new Error('No Script fixture')
    const component = store.graph.createNode('COMPONENT', store.state.currentPageId, {
      name: 'Script component'
    })
    store.graph.insertChildAt(script.id, component.id, 0)
    const instance = store.graph.createInstance(component.id, store.state.currentPageId)
    const inherited = instance && store.graph.getChildren(instance.id)[0]
    if (!inherited) throw new Error('No inherited Script fixture')
    store.select([inherited.id])
    store.requestRender()
  })
  await expect(page.getByRole('region', { name: 'Script', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Convert to layers', exact: true })).toBeDisabled()
  canvas.assertNoErrors()
})

test('converted Script saves and reopens its Context and editable layers without a linked source', async ({
  page
}) => {
  const canvas = await create(page)
  await chooseSource(page)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await page.getByRole('button', { name: 'Context', exact: true }).click()
  const context = page.getByRole('textbox', { name: 'Context information', exact: true })
  await context.fill('Independent conversion context: "quoted" & editable.\nSecond line.')
  await context.press('Tab')
  await page.getByRole('button', { name: 'Convert to layers', exact: true }).click()
  const converted = await generated(page)
  page.once('dialog', (dialog) => dialog.accept('converted.pen'))
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await readFile(await (await downloading).path())
  const authored = parsePenDocument(saved.toString()).children[0]
  expect(authored).toMatchObject({
    type: 'frame',
    id: converted?.id,
    context: 'Independent conversion context: "quoted" & editable.\nSecond line.'
  })
  expect(authored.scriptUri).toBeUndefined()
  expect(authored.inputs).toBeUndefined()
  expect(authored.children).toHaveLength(3)
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'converted.pen', mimeType: 'application/json', buffer: saved })
  await canvas.waitForInit()
  await canvas.selectAll()
  await expect.poll(async () => (await generated(page))?.id).toBe(converted?.id)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  await expect(page.getByRole('region', { name: 'Script', exact: true })).toHaveCount(0)
  await expect(context).toHaveValue(
    'Independent conversion context: "quoted" & editable.\nSecond line.'
  )
  await expect(page.locator('iframe[sandbox="allow-scripts"]')).toHaveCount(0)
  canvas.assertNoErrors()
})

test('reusable Script inspector edits, detachment and conversion preserve linked inputs', async ({
  page
}) => {
  const canvas = await create(page)
  await chooseSource(page)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  const main = (await generated(page))?.id
  if (!main) throw new Error('Missing main Script.')
  await page.getByRole('button', { name: 'Create Component', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Detach Component', exact: true })).toBeVisible()
  await expect.poll(async () => (await generated(page))?.type).toBe('COMPONENT')
  const instanceId = await page.evaluate(
    (id) => window.openPencil?.getStore?.().createInstanceFromComponent(id),
    main
  )
  if (!instanceId) throw new Error('Missing Script instance.')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  const count = page
    .getByRole('region', { name: 'Script', exact: true })
    .getByRole('spinbutton', { name: 'columns', exact: true })
  await count.dblclick()
  await count.fill('2')
  await count.press('Enter')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), main)
  await count.dblclick()
  await count.fill('5')
  await count.press('Enter')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(5)
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), instanceId)
  await expect(count).toHaveAttribute('aria-valuenow', '2')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), main)
  await page.getByRole('button', { name: 'Detach Component', exact: true }).click()
  await expect.poll(async () => (await generated(page))?.type).toBe('FRAME')
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), instanceId)
  await expect.poll(async () => (await generated(page))?.type).toBe('FRAME')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await canvas.undo()
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), main)
  await expect(page.getByRole('button', { name: 'Detach Component', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Convert to layers', exact: true }).click()
  const converted = (await generated(page))?.id
  expect(converted).not.toBe(main)
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toHaveCount(0)
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), instanceId)
  await expect.poll(async () => (await generated(page))?.type).toBe('FRAME')
  await expect(count).toHaveAttribute('aria-valuenow', '2')
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await canvas.undo()
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), main)
  await expect(page.getByRole('button', { name: 'Detach Component', exact: true })).toBeVisible()
  await canvas.redo()
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), instanceId)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
})
