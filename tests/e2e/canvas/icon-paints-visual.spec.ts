import type { PenNode } from '@open-pencil/pen'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { readScenePixels } from '#tests/helpers/canvas/pixels'
import { openAppMenu } from '#tests/helpers/menu'
import { getNodeById } from '#tests/helpers/store'

const ctx = useEditorSetupWithClear()
const gradient = {
  type: 'gradient',
  gradientType: 'linear',
  rotation: 270,
  colors: [
    { color: '#FF0000', position: 0 },
    { color: '#0000FF', position: 1 }
  ]
} satisfies PenNode['fill']

async function openPaintedIcons(children: PenNode[], width: number, height: number) {
  const { page, canvas } = ctx
  await page.route('https://api.iconify.design/lucide.json*', (route) =>
    route.fulfill({
      json: {
        prefix: 'lucide',
        width: 24,
        height: 24,
        icons: {
          heart: {
            body: '<path fill="currentColor" d="M2 2h20v20H2z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M2 12h20"/>'
          }
        }
      }
    })
  )
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
  })
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({
    name: 'icon-paints.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          { id: 'sheet', type: 'frame', layout: 'none', width, height, fill: '#18181B', children }
        ]
      })
    )
  })
  await canvas.waitForInit()
}

test('File Open keeps icon paint stacks, visibility, alpha and parent gradient bounds', async () => {
  const { page, canvas } = ctx
  const fills: PenNode['fill'][] = [
    '#FFFFFF',
    gradient,
    '#FFFFFF80',
    { type: 'color', color: '#FFFFFF', enabled: false },
    undefined,
    [],
    gradient,
    ['#FF0000', '#0000FF80']
  ]
  const children: PenNode[] = fills.map((fill, index) => ({
    id: `paint-${index}`,
    name: `Paint ${index}`,
    type: 'icon',
    library: 'lucide',
    icon: 'heart',
    x: 24 + (index % 4) * 144,
    y: 24 + Math.floor(index / 4) * 100,
    width: index === 6 ? 128 : 64,
    height: 64,
    fill
  }))
  await openPaintedIcons(children, 620, 220)
  await expect.poll(() => getNodeById(page, 'paint-7')).not.toBeNull()
  const points = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.clearSelection()
    store.centerOn(310, 110, 1)
    return [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
      x: store.state.panX + 24 + (index % 4) * 144 + (index === 6 ? 48 : 16),
      y: store.state.panY + 24 + Math.floor(index / 4) * 100 + 16
    }))
  })
  await canvas.waitForRender()
  const pixels = await readScenePixels(page, points)
  expect(pixels[0]).toEqual([255, 255, 255, 255])
  expect(pixels[2]).toEqual([140, 140, 141, 255])
  for (const index of [3, 4, 5]) expect(pixels[index]).toEqual([24, 24, 27, 255])
  // The wide icon samples its parent's gradient, rather than restarting at the glyph edge.
  expect(pixels[6][0]).toBeGreaterThan(pixels[1][0] - 60)
  expect(pixels[6][2]).toBeGreaterThan(pixels[1][2])
  canvas.assertNoErrors()
  expect(await canvas.screenshotCanvasRegion()).toMatchSnapshot('imported-icon-paints.png')
})

test('a centered icon samples mesh colors in the same space as the full paint swatch', async () => {
  const { page, canvas } = ctx
  const mesh: PenNode['fill'] = {
    type: 'mesh_gradient',
    columns: 2,
    rows: 2,
    colors: ['#FF0000', '#0000FF', '#00FF00', '#FFFFFF'],
    points: [
      { position: [0, 0], rightHandle: [0.2, 0.1] },
      { position: [1, 0] },
      { position: [0, 1] },
      { position: [1, 1] }
    ]
  }
  await openPaintedIcons(
    [
      {
        id: 'mesh-icon',
        type: 'icon',
        library: 'lucide',
        icon: 'heart',
        x: 24,
        y: 24,
        width: 160,
        height: 80,
        fill: mesh
      },
      { id: 'mesh-swatch', type: 'rectangle', x: 224, y: 24, width: 160, height: 80, fill: mesh }
    ],
    408,
    128
  )
  await expect.poll(() => getNodeById(page, 'mesh-icon')).not.toBeNull()
  const points = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.clearSelection()
    store.centerOn(204, 64, 1)
    return [24, 224].flatMap((x) =>
      [60, 80, 100].map((offset) => ({
        x: store.state.panX + x + offset,
        y: store.state.panY + 64
      }))
    )
  })
  await canvas.waitForRender()
  const pixels = await readScenePixels(page, points)
  for (let index = 0; index < 3; index++) {
    for (let channel = 0; channel < 4; channel++)
      expect(Math.abs(pixels[index][channel] - pixels[index + 3][channel])).toBeLessThanOrEqual(1)
  }
  canvas.assertNoErrors()
  expect(await canvas.screenshotCanvasRegion()).toMatchSnapshot('centered-icon-mesh.png')
})
