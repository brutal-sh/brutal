import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'

import { exportPDFDocument } from '#core/io/formats/pdf'

test('exports nested Mesh fills and strokes as correctly sized PDF pages without changing paints', async () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const specs = (['fills', 'strokes'] as const).map((field, index) => {
    const frame = graph.createNode('FRAME', pageId, {
      name: field,
      x: index * 200,
      width: 128,
      height: 96,
      fills: []
    })
    graph.createNode('RECTANGLE', frame.id, {
      width: 128,
      height: 96,
      fills: [],
      [field]: [
        {
          type: 'GRADIENT_MESH',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 0.8,
          visible: true,
          weight: 8,
          align: 'INSIDE',
          meshGradient: createMeshGradient(3, 3)
        }
      ]
    })
    return { pageId, nodeIds: [frame.id], label: field }
  })
  const before = specs.map((spec) => structuredClone(graph.getChildren(spec.nodeIds[0])[0]))
  const result = await exportPDFDocument(graph, specs, { embedFonts: false })
  expect(result?.pages).toEqual([
    { label: 'fills', width: 128, height: 96 },
    { label: 'strokes', width: 128, height: 96 }
  ])
  const pdf = new TextDecoder().decode(result?.data)
  expect(pdf.startsWith('%PDF-')).toBe(true)
  expect(pdf).toContain('/Subtype /Image')
  expect(pdf).toContain('/Width 256')
  expect(pdf).toContain('/Height 192')
  expect(specs.map((spec) => graph.getChildren(spec.nodeIds[0])[0])).toEqual(before)
})

for (const hidden of ['node', 'paint'] as const) {
  test(`a hidden Mesh ${hidden} leaves visible PDF content as vectors`, async () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 128,
      height: 96,
      fills: [colorToFill('#336699')]
    })
    graph.createNode('RECTANGLE', frame.id, {
      width: 128,
      height: 96,
      visible: hidden !== 'node',
      fills: [
        {
          type: 'GRADIENT_MESH',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: hidden !== 'paint',
          meshGradient: createMeshGradient()
        }
      ]
    })
    const result = await exportPDFDocument(graph, [{ pageId, nodeIds: [frame.id] }], {
      embedFonts: false
    })
    expect(result?.pages).toEqual([{ width: 128, height: 96 }])
    expect(new TextDecoder().decode(result?.data)).not.toContain('/Subtype /Image')
  })
}
