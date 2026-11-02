import { readFile, writeFile } from 'node:fs/promises'

import { parseColor } from '@open-pencil/scene-graph/color'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-rulers')

test('fractional rectangle export matches the independently authored Pen reference', async ({
  browserName
}, testInfo) => {
  const bytes = await editor.page.evaluate(async (colors) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const fills = (color: (typeof colors)[number]) => [
      { type: 'SOLID' as const, color, opacity: 1, visible: true }
    ]
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Fractional raster fixture',
      width: 300,
      height: 100,
      fills: fills(colors[0])
    })
    for (const [index, x] of [33.25, 70.5].entries()) {
      store.graph.createNode('RECTANGLE', frame.id, {
        name: `Rectangle ${index + 1}`,
        x,
        y: 5.5,
        width: 30,
        height: 30,
        fills: fills(colors[index + 1])
      })
    }
    const result = await store.renderExportImage([frame.id], 1, 'PNG')
    if (!result) throw new Error('Raster export unavailable')
    return Array.from(result)
  }, ['#17171A', '#4E96F2', '#45AD87'].map(parseColor))

  await testInfo.attach('fractional-export', { body: Buffer.from(bytes), contentType: 'image/png' })
  await writeFile(testInfo.outputPath('fractional-export.png'), Buffer.from(bytes))
  // Snapshot comparison ignores antialiased edges, which are the regression here.
  const differences = await editor.page.evaluate(
    async ({ actual, expected }) => {
      async function decode(encoded: number[]) {
        const image = await createImageBitmap(
          new Blob([new Uint8Array(encoded)], { type: 'image/png' })
        )
        try {
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('PNG decoder unavailable')
          context.drawImage(image, 0, 0)
          return context.getImageData(0, 0, canvas.width, canvas.height).data
        } finally {
          image.close()
        }
      }
      const a = await decode(actual)
      const b = await decode(expected)
      if (a.length !== b.length) throw new Error('Export dimensions changed')
      let different = 0
      let maximum = 0
      for (let offset = 0; offset < a.length; offset += 4) {
        if (a.subarray(offset, offset + 4).some((value, channel) => value !== b[offset + channel]))
          different++
        for (let channel = 0; channel < 4; channel++)
          maximum = Math.max(maximum, Math.abs(a[offset + channel] - b[offset + channel]))
      }
      return { different, maximum }
    },
    {
      actual: bytes,
      expected: Array.from(await readFile(testInfo.snapshotPath('fractional-rectangles.png')))
    }
  )
  // SwiftShader rounds fractional coverage by one channel; native WebKit is exact.
  expect(differences.maximum).toBeLessThanOrEqual(browserName === 'webkit' ? 0 : 1)
  if (browserName === 'webkit') expect(differences.different).toBe(0)
  expect(Buffer.from(bytes)).toMatchSnapshot('fractional-rectangles.png', {
    threshold: browserName === 'webkit' ? 0 : 0.01,
    maxDiffPixels: 0,
    maxDiffPixelRatio: 0
  })
  editor.canvas.assertNoErrors()
})

test('thin exports beyond the active GPU texture limit retain a raster fallback', async () => {
  const exported = await editor.page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="scene-canvas-element"]'
    )
    const gl = canvas?.getContext('webgl2')
    if (!store || !gl) throw new Error('GPU editor unavailable')
    const width = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) + 1
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Thin oversized export',
      width,
      height: 10
    })
    const bytes = await store.renderExportImage([node.id], 1, 'PNG')
    if (!bytes) throw new Error('Large raster export unavailable')
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    try {
      const small = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        name: 'Export after GPU allocation failure',
        width: 32,
        height: 32
      })
      const subsequent = await store.renderExportImage([small.id], 1, 'PNG')
      return {
        width,
        actualWidth: image.width,
        height: image.height,
        subsequent: Boolean(subsequent?.length),
        glError: gl.getError()
      }
    } finally {
      image.close()
    }
  })
  expect(exported.actualWidth).toBe(exported.width)
  expect(exported.height).toBe(10)
  expect(exported.subsequent).toBe(true)
  expect(exported.glError).toBe(0)
  editor.canvas.assertNoErrors()
})
