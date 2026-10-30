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
import { propertyItems, propertySection } from '#tests/helpers/properties'
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

test('invalid source reports its compiler failure and retains the previous paint', async () => {
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
  expect((await shader.read())?.fragment).toEqual(before)
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
