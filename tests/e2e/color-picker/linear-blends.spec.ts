import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { readScenePixels } from '#tests/helpers/canvas/pixels'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear()

for (const kind of ['fills', 'strokes', 'effects'] as const) {
  test(`${kind} linear blend choices render Pen reference pixels and Undo`, async () => {
    await editor.page.evaluate((kind) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      const background = store.graph.createNode('FRAME', store.state.currentPageId, {
        x: 80,
        y: 80,
        width: 240,
        height: 300,
        fills: [
          { type: 'SOLID', color: { r: 0.6, g: 0.2, b: 0.8, a: 1 }, opacity: 1, visible: true }
        ]
      })
      const foreground = {
        type: 'SOLID' as const,
        color: { r: 0.8, g: 0.6, b: 0.2, a: 1 },
        opacity: 1,
        visible: true
      }
      const node = store.graph.createNode('RECTANGLE', background.id, {
        x: kind === 'strokes' ? 80 : 0,
        y: kind === 'effects' ? 100 : 0,
        width: 64,
        height: 64,
        fills: {
          fills: [foreground],
          strokes: [],
          effects: [{ ...foreground, color: { r: 1, g: 1, b: 1, a: 1 } }]
        }[kind],
        strokes: kind === 'strokes' ? [{ ...foreground, weight: 12, align: 'INSIDE' }] : [],
        effects:
          kind === 'effects'
            ? [
                {
                  type: 'DROP_SHADOW',
                  color: foreground.color,
                  offset: { x: 100, y: 0 },
                  radius: 0,
                  spread: 0,
                  visible: true
                }
              ]
            : []
      })
      store.select([node.id])
      store.requestRender()
    }, kind)
    const sample = {
      fills: { section: 'Fill', point: { x: 100, y: 100 } },
      strokes: { section: 'Stroke', point: { x: 164, y: 110 } },
      effects: { section: 'Effects', point: { x: 200, y: 200 } }
    }[kind]
    const section = propertySection(editor.page, sample.section)
    for (const name of ['Linear Burn', 'Linear Dodge']) {
      if (kind === 'effects')
        await section.getByRole('button', { name: 'Drop Shadow', exact: true }).click()
      else await section.getByTestId('fill-picker-swatch').click()
      const popup = editor.page.locator(
        kind === 'effects' ? '[data-effect-popup]' : '[data-picker-content]'
      )
      await popup.getByRole('combobox', { name: 'Blend mode', exact: true }).click()
      await expect(editor.page.getByRole('option')).toHaveCount(18)
      await editor.page.getByRole('option', { name, exact: true }).click()
      await editor.page.keyboard.press('Escape')
      await expect(popup).toHaveCount(0)
      await expect
        .poll(() => readScenePixels(editor.page, [sample.point]))
        .toEqual([name === 'Linear Burn' ? [122, 31, 41, 255] : [255, 204, 255, 255]])
      expect(await editor.canvas.screenshotCanvasRegion(360, 420)).toMatchSnapshot(
        `${kind}-${name.toLowerCase().replace(' ', '-')}.png`
      )
    }
    await editor.canvas.undo()
    const state = await editor.page.evaluate((kind) => {
      const store = window.openPencil?.getStore?.()
      const id = store && [...store.state.selectedIds][0]
      const node = id ? store?.graph.getNode(id) : undefined
      if (!node) throw new Error('No selected blend layer')
      return { x: node.x, y: node.y, mode: node[kind][0].blendMode }
    }, kind)
    expect(state).toEqual({
      x: kind === 'strokes' ? 80 : 0,
      y: kind === 'effects' ? 100 : 0,
      mode: 'LINEAR_BURN'
    })
    editor.canvas.assertNoErrors()
  })
}

test('SVG layer blends preserve the measured opaque and half-alpha colors', async () => {
  const pixels = await editor.page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const path = '/packages/core/src/io/formats/svg/index.ts'
    const { renderNodesToSVG } = await import(path)
    const results: number[][] = []
    for (const mode of ['LINEAR_BURN', 'LINEAR_DODGE'] as const) {
      for (const alpha of [1, 128 / 255]) {
        const root = store.graph.createNode('FRAME', store.state.currentPageId, {
          width: 64,
          height: 64,
          fills: [
            {
              type: 'SOLID',
              color: { r: 0.6, g: 0.2, b: 0.8, a: alpha },
              opacity: alpha,
              visible: true
            }
          ]
        })
        store.graph.createNode('RECTANGLE', root.id, {
          width: 64,
          height: 64,
          blendMode: mode,
          fills: [
            {
              type: 'SOLID',
              color: { r: 0.8, g: 0.6, b: 0.2, a: alpha },
              opacity: alpha,
              visible: true
            }
          ]
        })
        const source = renderNodesToSVG(store.graph, store.state.currentPageId, [root.id])
        if (!source) throw new Error('Missing SVG')
        const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))
        try {
          const image = new Image()
          image.src = url
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = 64
          canvas.height = 64
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Missing SVG pixel context')
          context.drawImage(image, 0, 0)
          results.push([...context.getImageData(20, 20, 1, 1).data])
        } finally {
          URL.revokeObjectURL(url)
        }
      }
    }
    return results
  })
  const reference = [
    [122, 31, 41, 255],
    [159, 78, 98, 192],
    [255, 204, 255, 255],
    [179, 103, 128, 255]
  ]
  expect(pixels).toEqual(reference)
  editor.canvas.assertNoErrors()
})
