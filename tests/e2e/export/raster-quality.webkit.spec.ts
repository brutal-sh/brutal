import { readFile } from 'node:fs/promises'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function showTexture(): Promise<string> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    window.showSaveFilePicker = undefined
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Owned raster quality fixture',
      width: 128,
      height: 96,
      fills: []
    })
    for (let index = 0; index < 64; index++) {
      store.graph.createNode('RECTANGLE', frame.id, {
        x: (index % 8) * 16,
        y: Math.floor(index / 8) * 12,
        width: 16,
        height: 12,
        fills: [
          {
            type: 'SOLID',
            visible: true,
            opacity: 1,
            color: { r: (index % 3) / 2, g: (index % 5) / 4, b: (index % 7) / 6, a: 1 }
          }
        ]
      })
    }
    store.requestRender()
    return frame.id
  })
}

async function downloadRaster(
  id: string,
  format: 'jpg' | 'webp' | 'png',
  quality: number
): Promise<Buffer> {
  const downloading = editor.page.waitForEvent('download')
  await editor.page.evaluate(
    async ({ id, format, quality }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      await store.exportTarget({ scope: 'node', nodeId: id }, format, { scale: 1, quality })
    },
    { id, format, quality }
  )
  const download = await downloading
  expect(download.suggestedFilename()).toBe(`Owned raster quality fixture@1x.${format}`)
  const path = test.info().outputPath(`quality-${quality}.${format}`)
  await download.saveAs(path)
  return readFile(path)
}

for (const format of ['jpg', 'webp'] as const) {
  test(`${format} downloads preserve minimum quality and dimensions without editing the design`, async () => {
    const id = await showTexture()
    const before = await sceneSnapshot()
    const sizes: number[] = []
    const errors: number[] = []
    const png = format === 'webp' ? await downloadRaster(id, 'png', 100) : undefined
    for (const quality of [0, 90, 100]) {
      const bytes = await downloadRaster(id, format, quality)
      if (format === 'jpg') expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      else {
        expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
        expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
      }
      const dimensions = await editor.page.evaluate(
        async (bytes) => {
          const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
          const dimensions = [image.width, image.height]
          image.close()
          return dimensions
        },
        [...bytes]
      )
      expect(dimensions).toEqual([128, 96])
      sizes.push(bytes.length)
      if (png) errors.push(await pixelError(bytes, png))
    }
    if (format === 'jpg') {
      expect(sizes[0]).toBeLessThan(sizes[1])
      expect(sizes[1]).toBeLessThan(sizes[2])
    } else {
      // WebP maximum quality can switch to lossless and become smaller; compare decoded fidelity.
      expect(errors[0]).toBeGreaterThan(errors[1])
      expect(errors[1]).toBeGreaterThanOrEqual(errors[2])
    }
    expect(await sceneSnapshot()).toBe(before)
    editor.canvas.assertNoErrors()
  })
}

async function sceneSnapshot(): Promise<string> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return JSON.stringify([...store.graph.getAllNodes()])
  })
}

async function pixelError(actual: Buffer, expected: Buffer): Promise<number> {
  return editor.page.evaluate(
    async ({ actual, expected }) => {
      async function decode(bytes: number[]) {
        const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
        try {
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Raster decoder unavailable')
          context.drawImage(image, 0, 0)
          return context.getImageData(0, 0, image.width, image.height).data
        } finally {
          image.close()
        }
      }
      const a = await decode(actual)
      const b = await decode(expected)
      if (a.length !== b.length) throw new Error('Raster dimensions changed')
      let error = 0
      for (let i = 0; i < a.length; i++) error += Math.abs(a[i] - b[i])
      return error
    },
    { actual: [...actual], expected: [...expected] }
  )
}

test('default WebP UI export downloads from the inspector without changing the artwork', async () => {
  const id = await showTexture()
  await editor.page.evaluate((id) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.select([id])
  }, id)
  await editor.canvas.waitForRender()
  const panel = propertySection(editor.page, 'Export')
  await panel.getByRole('combobox', { name: 'Export format' }).click()
  await editor.page.getByRole('option', { name: 'WEBP', exact: true }).click()
  const before = await sceneSnapshot()
  const downloading = editor.page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export layer', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Owned raster quality fixture@1x.webp')
  const path = test.info().outputPath('inspector-default.webp')
  await download.saveAs(path)
  const bytes = await readFile(path)
  expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
  const dimensions = await editor.page.evaluate(
    async (bytes) => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
      const dimensions = [image.width, image.height]
      image.close()
      return dimensions
    },
    [...bytes]
  )
  expect(dimensions).toEqual([128, 96])
  expect(await sceneSnapshot()).toBe(before)
  editor.canvas.assertNoErrors()
})
