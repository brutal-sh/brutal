import { readFile, writeFile } from 'node:fs/promises'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function imageFixture(): Promise<number[]> {
  return editor.page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 96
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image fixture canvas unavailable')
    context.fillStyle = '#336699'
    context.fillRect(0, 0, 128, 96)
    context.fillStyle = '#ff0000'
    context.fillRect(64, 0, 64, 96)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value)
        else reject(new Error('Image fixture encoding failed'))
      }, 'image/png')
    })
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
}

async function showResources(bytes: number[]): Promise<void> {
  await editor.page.evaluate((bytes) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    window.showSaveFilePicker = undefined
    const imageHash = store.storeImage(new Uint8Array(bytes))
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Owned PDF resources',
      width: 160,
      height: 120,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    store.graph.createNode('RECTANGLE', frame.id, {
      width: 128,
      height: 96,
      fills: [
        {
          type: 'IMAGE',
          imageHash,
          imageScaleMode: 'FILL',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    store.graph.createNode('TEXT', frame.id, {
      x: 8,
      y: 100,
      width: 144,
      height: 18,
      text: 'PDF UI acceptance',
      fontFamily: 'Inter',
      fontSize: 12,
      textAutoResize: 'NONE',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    store.select([frame.id])
    store.requestRender()
  }, bytes)
  await editor.canvas.waitForRender()
}

async function snapshot(): Promise<string> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return JSON.stringify({
      nodes: [...store.graph.getAllNodes()],
      images: [...store.graph.images].map(([key, value]) => [key, [...value]])
    })
  })
}

test('inspector PDF downloads retain image resources, text and artwork state', async () => {
  const bytes = await imageFixture()
  await writeFile(test.info().outputPath('owned-image.png'), Buffer.from(bytes))
  await showResources(bytes)
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export format' }).click()
  await editor.page.getByRole('option', { name: 'PDF', exact: true }).click()
  await expect(panel.getByRole('combobox', { name: 'Export scale' })).toBeDisabled()
  const before = await snapshot()
  const downloading = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Owned PDF resources.pdf')
  const path = test.info().outputPath('resources.pdf')
  await download.saveAs(path)
  const pdf = (await readFile(path)).toString('latin1')
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1)
  expect(pdf).toContain('/MediaBox [0 0 160. 120.]')
  expect(pdf).toContain('/Subtype /Image')
  expect(await snapshot()).toBe(before)
  editor.canvas.assertNoErrors()
})
