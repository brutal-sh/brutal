import { readFile } from 'node:fs/promises'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { meshDriver } from '#tests/helpers/canvas/mesh/driver'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers')
const mesh = meshDriver(() => editor.page)
const layers = layerDriver(() => editor.page)

test('compact image exports download actual Mesh pixels at the selected scale without editing the document', async () => {
  const info = test.info()
  const id = await mesh.show()
  const before = await mesh.paint(id)
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const panel = propertySection(editor.page, 'Export')
  await expect(panel.getByRole('button', { name: 'Add export' })).toHaveCount(0)
  await panel.getByRole('combobox', { name: 'Export scale' }).click()
  await editor.page.getByRole('option', { name: '2x', exact: true }).click()
  for (const [label, extension] of [
    ['PNG', 'png'],
    ['JPEG', 'jpg'],
    ['WEBP', 'webp']
  ]) {
    await panel.getByRole('combobox', { name: 'Export format' }).click()
    await editor.page.getByRole('option', { name: label, exact: true }).click()
    const event = editor.page.waitForEvent('download')
    await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
    const download = await event
    expect(download.suggestedFilename()).toBe(`Mesh editing acceptance@2x.${extension}`)
    const path = info.outputPath(`mesh.${extension}`)
    await download.saveAs(path)
    const pixels = await editor.page.evaluate(
      async (bytes) => {
        const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
        const canvas = new OffscreenCanvas(image.width, image.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Image decoder unavailable')
        context.drawImage(image, 0, 0)
        const first = [...context.getImageData(10, 10, 1, 1).data]
        const last = [...context.getImageData(image.width - 10, image.height - 10, 1, 1).data]
        const result = { width: image.width, height: image.height, first, last }
        image.close()
        return result
      },
      [...(await readFile(path))]
    )
    expect([pixels.width, pixels.height]).toEqual([400, 280])
    expect(pixels.first[3]).toBe(255)
    expect(pixels.last[3]).toBe(255)
    expect(pixels.first).not.toEqual(pixels.last)
  }
  expect(await mesh.paint(id)).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('compact PDF exports Mesh layers in selection order as one file and disables image scale', async () => {
  const info = test.info()
  const first = await mesh.show()
  const second = await mesh.show('strokes')
  await mesh.resize(second, 160, 100)
  await layers.select([second, first])
  await editor.page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export format' }).click()
  await editor.page.getByRole('option', { name: 'PDF', exact: true }).click()
  await expect(panel.getByRole('combobox', { name: 'Export scale' })).toBeDisabled()
  await expect(panel.getByRole('combobox', { name: 'Export scale' })).toHaveText('1x')
  const event = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layers (2)', exact: true }).click()
  const download = await event
  expect(download.suggestedFilename()).toBe('Export.pdf')
  const path = info.outputPath('mesh-selection.pdf')
  await download.saveAs(path)
  const pdf = (await readFile(path)).toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(2)
  const boxes = [...pdf.matchAll(/\/MediaBox \[([^\]]+)\]/g)].map((match) =>
    match[1].trim().split(/\s+/).map(Number)
  )
  expect(boxes).toEqual([
    [0, 0, 160, 100],
    [0, 0, 200, 140]
  ])
  expect(pdf).toContain('/Subtype /Image')
  await panel.getByRole('combobox', { name: 'Export format' }).click()
  await editor.page.getByRole('option', { name: 'PNG', exact: true }).click()
  await expect(panel.getByRole('combobox', { name: 'Export scale' })).toBeEnabled()
  await expect(panel.getByRole('combobox', { name: 'Export scale' })).toHaveText('1x')
  editor.canvas.assertNoErrors()
})
