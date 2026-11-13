import { readFile } from 'node:fs/promises'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function showTexture(): Promise<string> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    window.showSaveFilePicker = undefined
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Owned JPEG quality fixture',
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

async function downloadJPEG(id: string, quality: number): Promise<Buffer> {
  const downloading = editor.page.waitForEvent('download')
  await editor.page.evaluate(
    async ({ id, quality }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      await store.exportTarget({ scope: 'node', nodeId: id }, 'jpg', { scale: 1, quality })
    },
    { id, quality }
  )
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Owned JPEG quality fixture@1x.jpg')
  const path = test.info().outputPath(`quality-${quality}.jpg`)
  await download.saveAs(path)
  return readFile(path)
}

test('JPEG downloads preserve minimum quality and dimensions without editing the design', async () => {
  const id = await showTexture()
  const before = await sceneSnapshot()
  const sizes: number[] = []
  for (const quality of [0, 90, 100]) {
    const bytes = await downloadJPEG(id, quality)
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
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
  }
  expect(sizes[0]).toBeLessThan(sizes[1])
  expect(sizes[1]).toBeLessThan(sizes[2])
  expect(await sceneSnapshot()).toBe(before)
  editor.canvas.assertNoErrors()
})

async function sceneSnapshot(): Promise<string> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return JSON.stringify([...store.graph.getAllNodes()])
  })
}
