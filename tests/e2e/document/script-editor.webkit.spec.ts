import { readFile, writeFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { waitForSettledScene } from '#tests/helpers/canvas/color-space'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { create, chooseSource, generated, exportScript } from '#tests/helpers/document/scripts'
import { openAppMenu } from '#tests/helpers/menu'

test('empty Script exports its translucent placeholder and full-opacity border', async ({
  page
}, testInfo) => {
  await create(page)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  const image = Buffer.from(await exportScript(page))
  await writeFile(testInfo.outputPath('empty-script.png'), image)
  expect(image).toMatchSnapshot('empty-script.png', {
    threshold: 0,
    maxDiffPixels: 0
  })
})

test('Script shows a bounded runtime diagnostic and code excerpt, refuses stale conversion, and recovers', async ({
  page
}) => {
  const canvas = await create(page)
  await chooseSource(
    page,
    '/** @schema 2.21 */\nconst value = 1;\nthrow new Error("Independent failure");'
  )
  const section = page.getByRole('region', { name: 'Script', exact: true })
  await expect(section.getByRole('alert')).toContainText('Independent failure')
  await expect(
    section.getByRole('button', { name: 'Convert to layers', exact: true })
  ).toBeDisabled()
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  await waitForSettledScene(page)
  const beforeExport = await canvas.screenshotCanvasRegion(650, 500)
  expect(Buffer.from(await exportScript(page))).toMatchSnapshot('script-runtime-error-export.png', {
    threshold: 0,
    maxDiffPixels: 0
  })
  await waitForSettledScene(page)
  expect(await canvas.screenshotCanvasRegion(650, 500)).toEqual(beforeExport)
  expect(await canvas.screenshotCanvasRegion(650, 500)).toMatchSnapshot(
    'script-runtime-error.png',
    { threshold: 0, maxDiffPixels: 0 }
  )
  await chooseSource(
    page,
    '/** @schema 2.21 */\nreturn [{type:"rectangle",name:"Recovered output",width:80,height:40,fill:"#34A878"}];'
  )
  await expect(section.getByRole('alert')).toHaveCount(0)
  await expect.poll(async () => (await generated(page))?.children[0]?.name).toBe('Recovered output')
  await expect(
    section.getByRole('button', { name: 'Convert to layers', exact: true })
  ).toBeEnabled()
  canvas.assertNoErrors()
})

test('Script shows the missing-file diagnostic and replaces it after a source is chosen', async ({
  page
}) => {
  const canvas = await create(page)
  const path = page.getByRole('textbox', { name: 'Script file', exact: true })
  await path.fill('independent-missing-source.js')
  await path.press('Enter')
  const section = page.getByRole('region', { name: 'Script', exact: true })
  await expect(section.getByRole('alert')).toBeVisible()
  await expect.poll(async () => (await generated(page))?.children.length).toBe(2)
  expect(Buffer.from(await exportScript(page))).toMatchSnapshot('script-missing-file-export.png', {
    threshold: 0,
    maxDiffPixels: 0
  })
  await waitForSettledScene(page)
  expect(await canvas.screenshotCanvasRegion(650, 500)).toMatchSnapshot('script-missing-file.png', {
    threshold: 0,
    maxDiffPixels: 0
  })
  await chooseSource(page)
  await expect(section.getByRole('alert')).toHaveCount(0)
  await expect.poll(async () => (await generated(page))?.children.length).toBe(3)
  canvas.assertNoErrors()
})

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
  await mockOfficialCloudDiscovery(page)
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

test('Script reference input chooses component thumbnails, supports keys and restores through Undo', async ({
  page
}, testInfo) => {
  const canvas = await create(page)
  const targets = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editor')
    return ['Reference blue', 'Reference green'].map(
      (name, index) =>
        store.graph.createNode('COMPONENT', store.state.currentPageId, {
          name,
          x: 20 + index * 70,
          y: 20,
          width: 60,
          height: 40,
          fills: [
            { type: 'SOLID', color: { r: 0, g: index, b: 1, a: 1 }, opacity: 1, visible: true }
          ]
        }).id
    )
  })
  await chooseSource(
    page,
    `/** @schema 2.21\n * @input target: ref\n */\nreturn [{type:'rectangle',name:pencil.input.target || 'No reference',width:120,height:80,fill:'#2E6FF2'}];`
  )
  await expect.poll(async () => (await generated(page))?.children[0]?.name).toBe('No reference')
  const field = page
    .getByRole('region', { name: 'Script', exact: true })
    .getByRole('combobox', { name: 'target', exact: true })
  await expect(field).toHaveText('None')
  await field.click()
  const blue = page.getByRole('option', { name: 'Reference blue', exact: true })
  await expect(blue).toBeVisible()
  await expect(blue).toBeFocused()
  await expect(blue.locator('img')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'target', exact: true })).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('script-reference-picker.png') })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(field).toHaveText('Reference green')
  await expect.poll(async () => (await generated(page))?.children[0]?.name).toBe(targets[1])
  await canvas.undo()
  await expect(field).toHaveText('None')
  await expect.poll(async () => (await generated(page))?.children[0]?.name).toBe('No reference')
  await canvas.redo()
  await expect(field).toHaveText('Reference green')
  await field.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('option', { name: 'Reference green', exact: true })).toHaveCount(0)
  await expect(field).toBeFocused()
})

test('returned Script reference renders its component, follows source edits and converts with its link', async ({
  page
}) => {
  const canvas = await create(page)
  const script = (await generated(page))?.id
  if (!script) throw new Error('Missing Script')
  const target = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editor')
    return store.graph.createNode('COMPONENT', store.state.currentPageId, {
      name: 'Reference render target',
      x: 20,
      y: 20,
      width: 60,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 46 / 255, g: 111 / 255, b: 242 / 255, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    }).id
  })
  await chooseSource(
    page,
    `/** @schema 2.21\n * @input target: ref\n */\nreturn pencil.input.target ? [{type:'ref',name:'Generated reference',ref:pencil.input.target,x:12,y:20,width:120,height:80}] : [];`
  )
  const field = page
    .getByRole('region', { name: 'Script', exact: true })
    .getByRole('combobox', { name: 'target', exact: true })
  await field.click()
  await page.getByRole('option', { name: 'Reference render target', exact: true }).click()
  await expect
    .poll(async () => (await generated(page))?.children[0])
    .toMatchObject({
      type: 'INSTANCE',
      width: 120,
      height: 80,
      x: 12,
      y: 20,
      color: { r: 46 / 255, g: 111 / 255, b: 242 / 255 }
    })
  expect(await canvas.screenshotCanvasRegion(650, 500)).toMatchSnapshot(
    'script-reference-render.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
  await page.evaluate((id) => {
    const store = window.openPencil?.getStore?.()
    store?.updateNodeWithUndo(id, {
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
  }, target)
  await expect
    .poll(async () => (await generated(page))?.children[0]?.color)
    .toMatchObject({ r: 1, g: 0, b: 0 })
  await expect(page.getByRole('region', { name: 'Script', exact: true })).toHaveAttribute(
    'aria-busy',
    'false'
  )
  const beforeExport = await page.evaluate(async (id) => {
    const store = window.openPencil?.getStore?.()
    const bytes = await store?.renderExportImage([id], 1, 'PNG', store.state.currentPageId)
    return bytes ? Array.from(bytes) : null
  }, script)
  await page.getByRole('button', { name: 'Convert to layers', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toHaveCount(0)
  const converted = await generated(page)
  expect(converted?.children[0]).toMatchObject({ type: 'INSTANCE', width: 120, height: 80 })
  if (!converted) throw new Error('Missing converted frame')
  const afterExport = await page.evaluate(async (id) => {
    const store = window.openPencil?.getStore?.()
    const bytes = await store?.renderExportImage([id], 1, 'PNG', store.state.currentPageId)
    return bytes ? Array.from(bytes) : null
  }, converted.id)
  expect(beforeExport).not.toBeNull()
  expect(afterExport).toEqual(beforeExport)
  const instance = converted?.children[0].id
  if (!instance) throw new Error('Missing converted reference')
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), instance)
  await page.getByTestId('instance-go-to-main').click()
  await expect.poll(async () => (await generated(page))?.id).toBe(target)
  await canvas.undo()
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), script)
  await expect(field).toHaveText('Reference render target')
  await expect
    .poll(async () => (await generated(page))?.children[0]?.color)
    .toMatchObject({ r: 1, g: 0, b: 0 })
  canvas.assertNoErrors()
})
