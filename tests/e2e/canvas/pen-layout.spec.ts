import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup('/?test&no-chrome&no-rulers')

test('Pen distributed gaps retain their numeric value without adding it to canvas spacing', async () => {
  await editor.page.evaluate(() =>
    window.openPencil?.openFile?.('/tests/fixtures/pen-distributed-gap.pen')
  )
  await editor.canvas.waitForInit()
  const positions = await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.setZoomAroundPoint(1, 0, 0)
    store.pan(-store.state.panX, -store.state.panY)
    return [0, 1].map((i) =>
      [0, 1].map((j) => {
        const node = store.graph.getNode(`gap-child-${i}-${j}`)
        return node ? [node.x, node.y] : []
      })
    )
  })
  expect(positions).toEqual([
    [
      [12, 21],
      [12, 59]
    ],
    [
      [21, 12],
      [59, 12]
    ]
  ])
  await editor.canvas.waitForRender()
  expect(await editor.canvas.screenshotCanvasRegion(700, 400)).toMatchSnapshot(
    'pen-distributed-gap.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
})

test('lays out Pen frames whose default horizontal layout is omitted', async () => {
  await editor.page.evaluate(() =>
    window.openPencil?.openFile?.('/tests/fixtures/pen-layout-defaults.pen')
  )
  await editor.canvas.waitForInit()

  const geometry = await editor.page.evaluate(() => {
    const graph = window.openPencil?.getStore?.().graph
    if (!graph) throw new Error('OpenPencil graph not initialized')
    const section = graph.getNode('section')
    const fixed = graph.getNode('fixed-child')
    const fill = graph.getNode('fill-child')
    if (!section || !fixed || !fill) throw new Error('Imported layout nodes are missing')
    return {
      section: {
        layoutMode: section.layoutMode,
        width: section.width,
        height: section.height
      },
      fixed: { x: fixed.x, y: fixed.y, width: fixed.width, height: fixed.height },
      fill: { x: fill.x, y: fill.y, width: fill.width, height: fill.height }
    }
  })

  expect(geometry).toEqual({
    section: { layoutMode: 'HORIZONTAL', width: 1440, height: 564 },
    fixed: { x: 80, y: 72, width: 620, height: 420 },
    fill: { x: 756, y: 72, width: 604, height: 420 }
  })
})
