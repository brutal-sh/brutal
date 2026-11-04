import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { createIconifyProvider } from '@open-pencil/core/icons'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'
import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
} from '@open-pencil/core/io/formats/raster'
import { prepareSVGImport, renderNodesToSVG } from '@open-pencil/core/io/formats/svg'
import { writePenDocument } from '@open-pencil/pen'
import { SceneGraph, type Fill } from '@open-pencil/scene-graph'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import { hasIconFills, isIconModified, readIconPaintSource } from '@open-pencil/scene-graph/icons'

import { detachIcon, placeIcon } from '#core/icons/render'
import { buildIconData } from '#core/icons/svg'

const BODY = '<path fill="none" stroke="currentColor" stroke-width="2" d="M4 4h16v16H4z"/>'
const white: Fill = { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }
const red: Fill = { ...white, color: { r: 1, g: 0, b: 0, a: 1 } }
const gradient: Fill = {
  ...white,
  type: 'GRADIENT_LINEAR',
  gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ]
}

function placed() {
  const graph = new SceneGraph()
  const icon = buildIconData({ body: BODY }, 'lucide', 'heart', 24, 24, 24)
  const frame = placeIcon(graph, graph.getPages()[0].id, icon, { size: 24, color: white.color })
  return { graph, frame }
}

async function pixels(graph: SceneGraph, id: string) {
  const encoded = await headlessRenderNodes(graph, graph.getPages()[0].id, [id])
  if (!encoded) throw new Error('Rendered icon missing')
  const image = createCanvasKitRasterCodec(await initCanvasKit()).decode(encoded)
  if (!image) throw new Error('Rendered pixels unavailable')
  return image
}

const provider = createIconifyProvider({
  fetchCollection: async () => ({
    prefix: 'lucide',
    width: 24,
    height: 24,
    icons: { heart: { body: BODY } }
  }),
  search: async () => ({ icons: [], total: 0, collections: {} }),
  collections: async () => [],
  collectionIcons: async () => []
})
const io = new IORegistry([penFormat])

describe('icon Fill editing and interchange', () => {
  test('bound colors resolve on the glyph after edits and retain their binding through PEN and FIG', async () => {
    const { graph, frame } = placed()
    const colors = graph.createCollection('Colors')
    const brand = graph.createVariable('Brand', 'COLOR', colors.id, {
      r: 1,
      g: 0,
      b: 0,
      a: 128 / 255
    })
    graph.bindVariable(frame.id, 'fills/0/color', brand.id)
    const first = await pixels(graph, frame.id)
    expect(Math.max(...first.data.filter((_, index) => index % 4 === 3))).toBe(128)
    brand.valuesByMode[colors.defaultModeId] = { r: 0, g: 0, b: 1, a: 128 / 255 }
    const after = await pixels(graph, frame.id)
    expect(after.data).not.toEqual(first.data)
    const reopenedPen = await io.readDocument(
      {
        name: 'bound-icon.pen',
        data: new TextEncoder().encode(JSON.stringify(writePenDocument(graph)))
      },
      { icons: provider }
    )
    expect(await pixels(reopenedPen.graph, frame.id)).toEqual(after)
    expect(Object.keys(reopenedPen.graph.getNode(frame.id)?.boundVariables ?? {})).toEqual([
      'fills/0/color'
    ])
    const reopenedFig = await parseFigFile((await exportFigFile(graph)).slice().buffer)
    expect(await pixels(reopenedFig, frame.id)).toEqual(after)
    expect(Object.keys(reopenedFig.getNode(frame.id)?.boundVariables ?? {})).toEqual([
      'fills/0/color'
    ])
  })

  test('a translucent variable paint casts the same opaque silhouette as an opaque paint', async () => {
    const { graph, frame } = placed()
    const colors = graph.createCollection('Colors')
    const brand = graph.createVariable('Brand', 'COLOR', colors.id, { r: 1, g: 0, b: 0, a: 0.25 })
    graph.bindVariable(frame.id, 'fills/0/color', brand.id)
    graph.updateNode(frame.id, {
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 20, y: 0 },
          radius: 0,
          spread: 0,
          visible: true
        }
      ]
    })
    const image = await pixels(graph, frame.id)
    let maximumShadowAlpha = 0
    for (let index = 0; index < image.data.length; index += 4) {
      if (image.data[index] === 0 && image.data[index + 1] === 0 && image.data[index + 2] === 0)
        maximumShadowAlpha = Math.max(maximumShadowAlpha, image.data[index + 3])
    }
    expect(maximumShadowAlpha).toBe(128)
  })

  test('SVG export keeps just the glyph geometry, without a container background', () => {
    const { graph, frame } = placed()
    graph.updateNode(frame.id, { fills: [{ ...red, opacity: 0.5 }] })
    const svg = renderNodesToSVG(graph, graph.getPages()[0].id, [frame.id])
    if (!svg) throw new Error('Visible icon SVG missing')
    const artwork = prepareSVGImport(svg)
    if (!artwork) throw new Error('Exported SVG cannot be parsed')
    expect(artwork.paths).toHaveLength(1)
  })

  test.each([
    { name: 'solid alpha', fills: [{ ...red, opacity: 0.5 }] },
    { name: 'gradient', fills: [gradient] },
    {
      name: 'mesh',
      fills: [{ ...white, type: 'GRADIENT_MESH', meshGradient: createMeshGradient(2, 2) }]
    },
    { name: 'stack', fills: [red, { ...white, opacity: 0.5 }] },
    { name: 'disabled', fills: [{ ...red, visible: false }] },
    { name: 'empty', fills: [] }
  ] satisfies { name: string; fills: Fill[] }[])(
    'keeps $name paint intent and pixels through PEN and FIG',
    async ({ fills }) => {
      const { graph, frame } = placed()
      const editor = createEditor({ graph })
      try {
        editor.updateNodeWithUndo(frame.id, { fills }, 'Change icon Fill')
        expect(isIconModified(graph, frame)).toBe(false)
        const before = await pixels(graph, frame.id)
        // An outline icon's center stays transparent, rather than acquiring a frame background.
        expect(before.data[(12 * before.width + 12) * 4 + 3]).toBe(0)
        const reopenedPen = await io.readDocument(
          {
            name: 'painted.pen',
            data: new TextEncoder().encode(JSON.stringify(writePenDocument(graph)))
          },
          { icons: provider }
        )
        const penFrame = reopenedPen.graph.getNode(frame.id)
        if (!penFrame) throw new Error('PEN icon missing')
        expect(hasIconFills(penFrame)).toBe(true)
        expect(isIconModified(reopenedPen.graph, penFrame)).toBe(false)
        expect(await pixels(reopenedPen.graph, frame.id)).toEqual(before)
        const reopenedFig = await parseFigFile((await exportFigFile(graph)).slice().buffer)
        const figFrame = reopenedFig.getNode(frame.id)
        if (!figFrame) throw new Error('FIG icon missing')
        expect(hasIconFills(figFrame)).toBe(true)
        expect(figFrame.fills).toHaveLength(fills.length)
        expect(isIconModified(reopenedFig, figFrame)).toBe(false)
        expect(await pixels(reopenedFig, frame.id)).toEqual(before)
        editor.undo.undo()
        expect(frame.fills).toEqual([white])
        editor.undo.redo()
        expect(frame.fills).toEqual(fills)
      } finally {
        editor.dispose()
      }
    }
  )

  test('detach retains the drawing and clears generated-paint provenance', async () => {
    const { graph, frame } = placed()
    graph.updateNode(frame.id, { fills: [{ ...red, opacity: 0.5 }] })
    const before = await pixels(graph, frame.id)
    detachIcon(graph, frame.id)
    expect(frame.fills).toEqual([])
    expect(hasIconFills(frame)).toBe(false)
    expect(graph.getChildren(frame.id).map(readIconPaintSource)).toEqual([null])
    expect(await pixels(graph, frame.id)).toEqual(before)
    // Detach preserves the existing resize constraints; lossy interchange stays refused.
    expect(() => writePenDocument(graph)).toThrow('horizontalConstraint')
  })
})
