import { readFile } from 'node:fs/promises'

import type { Route } from '@playwright/test'

import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { meshDriver } from '#tests/helpers/canvas/mesh/driver'
import { readScenePixels } from '#tests/helpers/canvas/pixels'
import { shaderDriver } from '#tests/helpers/canvas/shader-driver'
import { testPath } from '#tests/helpers/paths'
import { propertyField, propertyItems, propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear('/?test&no-rulers')
const shader = shaderDriver(() => editor.page)
const blue = [51, 102, 153, 255]
const white = [255, 255, 255, 255]

async function chooseSource(name = 'checks.glsl') {
  const choosing = editor.page.waitForEvent('filechooser')
  await editor.page.getByRole('button', { name: 'Choose shader file', exact: true }).click()
  await (await choosing).setFiles(testPath('fixtures/shaders', name))
}

async function openShader() {
  await shader.resetViewport()
  await editor.canvas.drawRect(300, 300, 320, 240)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  await editor.page.getByRole('button', { name: 'Shader', exact: true }).click()
}

test('shader file controls render logical pixels, edit uniforms and retain the source through Undo', async () => {
  await openShader()
  await chooseSource()
  const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
  await expect(size).toHaveAttribute('aria-valuenow', '32')
  await expect(
    editor.page.getByRole('spinbutton', { name: 'Offset X', exact: true })
  ).toHaveAttribute('aria-valuenow', '0.25')
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  const frame = await shader.read()
  expect(frame).toMatchObject({ width: 640, height: 480 })
  await size.focus()
  await size.fill('24')
  await size.press('Tab')
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, blue, blue])
  expect((await shader.read())?.fragment?.uniforms).toEqual({ u_size: 24 })
  await editor.page.keyboard.press('Escape')
  expect(
    await readScenePixels(editor.page, [
      { x: 304, y: 304 },
      { x: 328, y: 304 }
    ])
  ).toEqual([white, blue])
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  expect(await editor.canvas.screenshotCanvasRegion(650, 600)).toMatchSnapshot(
    'shader-source-checks.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
  editor.canvas.assertNoErrors()
})

test('a ranged uniform follows absolute clicks and live dragging, with one Undo and Escape cancellation', async () => {
  await openShader()
  await chooseSource()
  const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
  await shader.settle()
  const bounds = expectDefined(await size.boundingBox(), 'shader range bounds')
  const source = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await source.focus()
  await editor.page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(32.5)
  await expect(source).not.toBeFocused()
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  await shader.settle()
  await editor.page.mouse.move(bounds.x + bounds.width / 4, bounds.y + bounds.height / 2)
  await editor.page.mouse.down()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(16.8)
  await expect
    .poll(() =>
      readScenePixels(editor.page, [
        { x: 304, y: 304 },
        { x: 328, y: 304 }
      ])
    )
    .toEqual([blue, white])
  await editor.page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(32.5)
  await expect
    .poll(() =>
      readScenePixels(editor.page, [
        { x: 304, y: 304 },
        { x: 328, y: 304 }
      ])
    )
    .toEqual([white, white])
  await editor.page.mouse.up()
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  await editor.page.mouse.move(bounds.x + bounds.width / 4, bounds.y + bounds.height / 2)
  await editor.page.mouse.down()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(16.8)
  await editor.page.keyboard.press('Escape')
  await editor.page.mouse.up()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  await expect(size).toHaveAttribute('aria-valuenow', '32')
  await size.locator('[data-slot="value"]').click()
  await size.fill('24')
  await size.press('Enter')
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(24)
  await editor.page.screenshot({ path: test.info().outputPath('shader-range-controls.png') })
  editor.canvas.assertNoErrors()
})

test('invalid source renders an undoable diagnostic paint while retaining the previous source snapshot', async () => {
  await openShader()
  await chooseSource()
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  const before = (await shader.read())?.fragment
  const path = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await editor.page.route('https://shader.test/broken.glsl', (route) =>
    route.fulfill({ body: 'void main(){ gl_FragColor = invalid; }', contentType: 'text/plain' })
  )
  await path.fill('https://shader.test/broken.glsl')
  await path.press('Enter')
  await expect(editor.page.getByRole('alert')).toBeVisible()
  await expect.poll(async () => (await shader.read())?.fragment?.error).toBeTruthy()
  expect((await shader.read())?.fragment).toMatchObject({
    url: 'https://shader.test/broken.glsl',
    source: before?.source
  })
  await expect(editor.page.getByRole('spinbutton', { name: 'Size', exact: true })).toHaveCount(0)
  await expect.poll(async () => (await shader.read())?.pixels?.[0]).toEqual([0, 0, 0, 0])
  await editor.page.keyboard.press('Escape')
  expect(await editor.canvas.screenshotCanvasRegion(650, 600)).toMatchSnapshot(
    'shader-error-canvas.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export scale' }).click()
  await editor.page.getByRole('option', { name: '2x', exact: true }).click()
  const downloading = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
  const download = await downloading
  const saved = test.info().outputPath('shader-error.png')
  await download.saveAs(saved)
  const image = expectDefined(
    createCanvasKitRasterCodec(await initCanvasKit()).decode(await readFile(saved)),
    'downloaded diagnostic PNG'
  )
  expect([image.width, image.height]).toEqual([640, 480])
  expect(Array.from(image.data.slice(0, 4))).toEqual([255, 0, 0, 255])
  expect(Array.from(image.data.slice((4 * 640 + 4) * 4, (4 * 640 + 4) * 4 + 4))).toEqual([
    0, 0, 0, 0
  ])
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  expect((await shader.read())?.fragment).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('the used-source picker follows document references and resets defaults only on a different source', async () => {
  await openShader()
  await chooseSource()
  const original = expectDefined(await getSelectedNode(editor.page), 'original shader')
  const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
  await size.focus()
  await size.fill('24')
  await size.press('Tab')
  await editor.page.keyboard.press('Escape')
  await openShader()
  await chooseSource('alpha.glsl')
  const used = editor.page.locator('[data-slot="shader-used-sources"]')
  await expect(used.getByRole('button', { name: 'alpha.glsl', exact: true })).toBeVisible()
  await used.getByRole('button', { name: 'checks.glsl', exact: true }).click()
  await expect(size).toHaveAttribute('aria-valuenow', '32')
  await expect(used.getByRole('button', { name: 'alpha.glsl', exact: true })).toHaveCount(0)
  expect((await shader.read('fills', original.id))?.fragment?.uniforms).toEqual({ u_size: 24 })
  await editor.page.locator('[data-picker-content]').screenshot({
    path: test.info().outputPath('shader-used-source-picker.png')
  })
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.url).toBe('alpha.glsl')
  expect((await shader.read('fills', original.id))?.fragment?.uniforms).toEqual({ u_size: 24 })
  editor.canvas.assertNoErrors()
})

test('clearing a shader source draws its placeholder and Undo restores its controls and pixels', async () => {
  await openShader()
  await chooseSource()
  const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
  await size.focus()
  await size.fill('24')
  await size.press('Tab')
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, blue, blue])
  const before = (await shader.read())?.fragment
  const path = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await path.fill('')
  await path.press('Enter')
  await expect(size).toHaveCount(0)
  await expect(editor.page.getByRole('alert')).toHaveCount(0)
  await expect(editor.page.locator('[data-slot="shader-used-sources"]')).toHaveCount(0)
  await expect
    .poll(async () => (await shader.read())?.fragment)
    .toEqual({
      url: '',
      source: '',
      uniforms: {}
    })
  await expect
    .poll(async () => (await shader.read())?.pixels)
    .toEqual([
      [255, 255, 255, 26],
      [0, 0, 0, 26],
      [0, 0, 0, 26]
    ])
  await editor.page.keyboard.press('Escape')
  expect(await editor.canvas.screenshotCanvasRegion(650, 600)).toMatchSnapshot(
    'shader-empty-canvas.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export scale' }).click()
  await editor.page.getByRole('option', { name: '2x', exact: true }).click()
  const downloading = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
  const saved = test.info().outputPath('shader-empty.png')
  await (await downloading).saveAs(saved)
  const image = expectDefined(
    createCanvasKitRasterCodec(await initCanvasKit()).decode(await readFile(saved)),
    'downloaded empty shader PNG'
  )
  expect([image.width, image.height]).toEqual([640, 480])
  expect(Array.from(image.data.slice(0, 4))).toEqual([128, 128, 128, 255])
  const at = (x: number, y: number) =>
    Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4))
  expect(at(4, 4)).toEqual([255, 255, 255, 26])
  expect(at(16, 4)).toEqual([0, 0, 0, 26])
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment).toEqual(before)
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, blue, blue])
  editor.canvas.assertNoErrors()
})

test('an unresolved imported shader URI displays a diagnostic instead of an empty-source placeholder', async () => {
  await openShader()
  await chooseSource()
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  const selected = expectDefined(await getSelectedNode(editor.page), 'shader layer')
  await shader.replaceSource(selected.id, 'unavailable-companion.glsl', '')
  await expect(editor.page.getByRole('alert')).toBeVisible()
  await expect(editor.page.getByRole('spinbutton', { name: 'Size', exact: true })).toHaveCount(0)
  await expect.poll(async () => (await shader.read())?.pixels?.[0]).toEqual([0, 0, 0, 0])
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
  editor.canvas.assertNoErrors()
})

test('same-URI reloads retain uniform history and recover from diagnostics', async () => {
  await openShader()
  let source = await readFile(testPath('fixtures/shaders', 'checks.glsl'), 'utf8')
  const url = 'https://shader.test/reload.glsl'
  await editor.page.route(url, (route) =>
    route.fulfill({ body: source, contentType: 'text/plain' })
  )
  const path = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await path.fill(url)
  await path.press('Enter')
  const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
  await size.focus()
  await size.fill('24')
  await size.press('Tab')
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({ u_size: 24 })
  source = source.replace('#336699', '#669933')
  await path.press('Enter')
  await expect
    .poll(async () => (await shader.read())?.pixels)
    .toEqual([white, [102, 153, 51, 255], [102, 153, 51, 255]])
  expect((await shader.read())?.fragment?.uniforms).toEqual({ u_size: 24 })
  const valid = (await shader.read())?.fragment
  source = 'void main(){ gl_FragColor = invalid; }'
  await path.press('Enter')
  await expect(editor.page.getByRole('alert')).toBeVisible()
  await expect.poll(async () => (await shader.read())?.fragment?.error).toBeTruthy()
  expect((await shader.read())?.fragment?.source).toBe(valid?.source)
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  expect((await shader.read())?.fragment?.error).toBeTruthy()
  source = expectDefined(valid?.source, 'last valid shader')
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  await path.press('Enter')
  await expect.poll(async () => (await shader.read())?.fragment?.error).toBeUndefined()
  await expect
    .poll(async () => (await shader.read())?.pixels)
    .toEqual([white, white, [102, 153, 51, 255]])
  await expect(size).toHaveAttribute('aria-valuenow', '32')
  editor.canvas.assertNoErrors()
})

test('changing selection aborts a pending shader load before it can paint another layer', async () => {
  await editor.canvas.drawRect(700, 300, 64, 64)
  const other = expectDefined(await getSelectedNode(editor.page), 'other layer')
  await openShader()
  const url = 'https://shader.test/pending.glsl'
  const pending = new Promise<Route>((resolve) => {
    void editor.page.route(url, (route) => resolve(route))
  })
  const path = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await path.fill(url)
  await path.press('Enter')
  const route = await pending
  const cancelled = editor.page.waitForEvent('requestfailed', {
    predicate: (request) => request.url() === url
  })
  await layerDriver(() => editor.page).select([other.id])
  await cancelled
  await route.fulfill({ body: 'void main(){gl_FragColor=vec4(1.);}', contentType: 'text/plain' })
  expect((await getSelectedNode(editor.page))?.fills).toEqual(other.fills)
  await expect(path).toHaveCount(0)
  editor.canvas.assertNoErrors()
})

test('a pending load cannot replace a newer source on the same paint', async () => {
  await openShader()
  await chooseSource()
  const node = expectDefined(await getSelectedNode(editor.page), 'source layer')
  const url = 'https://shader.test/old-pending.glsl'
  const pending = new Promise<Route>((resolve) => {
    void editor.page.route(url, (route) => resolve(route))
  })
  const path = editor.page.getByRole('textbox', { name: 'Shader path or URL', exact: true })
  await path.fill(url)
  await path.press('Enter')
  const route = await pending
  const canceled = editor.page.waitForEvent('requestfailed', {
    predicate: (request) => request.url() === url
  })
  await shader.replaceSource(
    node.id,
    'replacement.glsl',
    'precision mediump float; void main(){gl_FragColor=vec4(1.,0.,0.,1.);}'
  )
  await canceled
  await route.fulfill({ body: 'void main(){gl_FragColor=vec4(1.);}', contentType: 'text/plain' })
  await expect
    .poll(async () => (await shader.read())?.pixels)
    .toEqual([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255]
    ])
  expect((await shader.read())?.fragment?.url).toBe('replacement.glsl')
  await expect(path).toHaveValue('replacement.glsl')
  editor.canvas.assertNoErrors()
})

test('live shader resolution follows small width and height-only document changes', async () => {
  await openShader()
  await chooseSource('resolution.glsl')
  await expect.poll(async () => (await shader.read())?.fragment?.url).toBe('resolution.glsl')
  const node = expectDefined(await getSelectedNode(editor.page), 'shader layer')
  await editor.page.keyboard.press('Escape')
  await editor.page.keyboard.press('ControlOrMeta+Alt+Enter')
  await expect(editor.page.getByRole('button', { name: /Leave preview/ })).toBeVisible()
  await expect.poll(() => shader.livePixel(node.id)).toEqual([82, 61, 0, 255])
  await shader.resize(node.id, 400, 240)
  await expect.poll(() => shader.livePixel(node.id)).toEqual([102, 61, 0, 255])
  await shader.resize(node.id, 400, 320)
  await expect.poll(() => shader.livePixel(node.id)).toEqual([102, 82, 0, 255])
  await editor.page.getByRole('button', { name: /Leave preview/ }).click()
  editor.canvas.assertNoErrors()
})

test('translucent GLSL retains Pen’s measured premultiplied color and alpha', async () => {
  await openShader()
  await chooseSource('alpha.glsl')
  await expect
    .poll(async () => (await shader.read())?.pixels)
    .toEqual(Array.from({ length: 3 }, () => [102, 203, 255, 128]))
  const node = expectDefined(await getSelectedNode(editor.page), 'alpha shader layer')
  await editor.page.keyboard.press('Escape')
  await editor.page.keyboard.press('ControlOrMeta+Alt+Enter')
  await expect.poll(() => shader.livePixel(node.id)).toEqual([102, 203, 255, 128])
  await editor.page.getByRole('button', { name: /Leave preview/ }).click()
  editor.canvas.assertNoErrors()
})

test('time uniforms animate in the editor while the saved export frame stays at time zero', async () => {
  await openShader()
  await chooseSource('time.glsl')
  await expect.poll(async () => (await shader.read())?.pixels?.[0]).toEqual([0, 64, 128, 255])
  const node = expectDefined(await getSelectedNode(editor.page), 'animated shader layer')
  await editor.page.keyboard.press('Escape')
  await expect.poll(async () => (await shader.livePixel(node.id))?.[0] ?? 0).toBeGreaterThan(0)
  expect((await shader.read())?.pixels?.[0]).toEqual([0, 64, 128, 255])
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export scale' }).click()
  await editor.page.getByRole('option', { name: '2x', exact: true }).click()
  const downloading = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
  const downloaded = await downloading
  const path = test.info().outputPath('shader-time-zero.png')
  await downloaded.saveAs(path)
  const image = expectDefined(
    createCanvasKitRasterCodec(await initCanvasKit()).decode(await readFile(path)),
    'downloaded shader PNG'
  )
  expect([image.width, image.height]).toEqual([640, 480])
  expect(Array.from(image.data.slice(0, 4))).toEqual([0, 64, 128, 255])
  editor.canvas.assertNoErrors()
})

test('the stroke picker edits a shader while preserving stroke geometry through Undo', async () => {
  await meshDriver(() => editor.page).show('strokes')
  const before = (await getSelectedNode(editor.page))?.strokes[0]
  await propertyItems(editor.page, 'strokes')
    .first()
    .getByRole('button', { name: 'Stroke', exact: true })
    .click()
  await editor.page.getByRole('button', { name: 'Shader', exact: true }).click()
  await chooseSource()
  await expect.poll(async () => (await shader.read('strokes'))?.fragment?.url).toBe('checks.glsl')
  await expect.poll(async () => (await shader.read('strokes'))?.pixels).not.toBeNull()
  expect((await getSelectedNode(editor.page))?.strokes[0]).toMatchObject({
    type: 'IMAGE',
    weight: 24,
    align: 'INSIDE'
  })
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.strokes[0]).toEqual(before)
  editor.canvas.assertNoErrors()
})

for (const edit of ['uniform', 'resize'] as const)
  test(`a duplicated shader keeps its original pixels when the copy changes ${edit}`, async () => {
    await openShader()
    await chooseSource()
    await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
    const original = expectDefined(await getSelectedNode(editor.page), 'original shader')
    await editor.page.keyboard.press('Escape')
    await editor.page.keyboard.press('ControlOrMeta+d')
    const copy = expectDefined(await getSelectedNode(editor.page), 'duplicated shader')
    expect(copy.id).not.toBe(original.id)
    for (const [property, label, value] of [
      ['x', 'X Axis', '700'],
      ['y', 'Y Axis', '300']
    ]) {
      const field = propertyField(editor.page, property)
      await field.click()
      const input = field.getByRole('spinbutton', { name: label, exact: true })
      await input.fill(value)
      await input.press('Enter')
    }
    expect(await getSelectedNode(editor.page)).toMatchObject({
      x: 700,
      y: 300,
      width: 320,
      height: 240
    })
    if (edit === 'uniform') {
      await propertyItems(editor.page, 'fills')
        .first()
        .getByRole('button', { name: 'Fill', exact: true })
        .click()
      const size = editor.page.getByRole('spinbutton', { name: 'Size', exact: true })
      await size.focus()
      await size.fill('24')
      await size.press('Tab')
      await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(24)
      await expect
        .poll(() => shader.read())
        .toMatchObject({
          width: 640,
          height: 480,
          logicalSize: { width: 320, height: 240 },
          pixels: [white, blue, blue]
        })
      await editor.page.keyboard.press('Escape')
      expect(
        await readScenePixels(editor.page, [
          { x: 328, y: 304 },
          { x: 728, y: 304 }
        ])
      ).toEqual([white, blue])
      await editor.canvas.undo()
      await expect.poll(async () => (await shader.read())?.pixels).toEqual([white, white, blue])
    } else {
      await shader.resize(copy.id, 400, 240)
      await expect.poll(async () => (await shader.read())?.width).toBe(800)
    }
    expect(await shader.read('fills', original.id)).toMatchObject({
      width: 640,
      height: 480,
      pixels: [white, white, blue]
    })
    expect(await readScenePixels(editor.page, [{ x: 328, y: 304 }])).toEqual([white])
    editor.canvas.assertNoErrors()
  })
