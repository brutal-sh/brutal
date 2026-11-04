import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { iconDrawing, iconGlyph, withIconTint } from '@open-pencil/scene-graph/icons'
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path'

test('the exact drawing catches edits hidden by the resize-tolerant glyph indicator', () => {
  const graph = new SceneGraph()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, { width: 24, height: 24 })
  const path = graph.createNode('VECTOR', frame.id, {
    width: 24,
    height: 24,
    vectorNetwork: parseSVGPath('M2 2L22 2L22 22Z'),
    fills: [],
    strokes: [
      {
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1, a: 1 },
        opacity: 1,
        visible: true,
        weight: 2,
        align: 'CENTER'
      }
    ]
  })
  graph.updateNode(path.id, { pluginData: withIconTint(path, ['stroke']) })
  const glyph = iconGlyph(graph, frame)
  const drawing = iconDrawing(graph, frame)
  graph.updateNode(frame.id, { x: 123, y: 456 })
  graph.updateNode(path.id, {
    strokes: path.strokes.map((stroke) => ({ ...stroke, color: { r: 1, g: 0, b: 0, a: 1 } }))
  })
  expect(iconDrawing(graph, frame)).toBe(drawing)
  expect(iconGlyph(graph, frame)).toBe(glyph)
  graph.updateNode(path.id, { x: 2 })
  expect(iconGlyph(graph, frame)).toBe(glyph)
  expect(iconDrawing(graph, frame)).not.toBe(drawing)
  graph.updateNode(path.id, { x: 0, vectorNetwork: parseSVGPath('M4 4L44 4L44 44Z') })
  expect(iconGlyph(graph, frame)).toBe(glyph)
  expect(iconDrawing(graph, frame)).not.toBe(drawing)
  graph.updateNode(path.id, {
    vectorNetwork: parseSVGPath('M2 2L22 2L22 22Z'),
    strokes: path.strokes.map((stroke) => ({ ...stroke, weight: 3 }))
  })
  expect(iconGlyph(graph, frame)).toBe(glyph)
  expect(iconDrawing(graph, frame)).not.toBe(drawing)
})
