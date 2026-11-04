import { expect, test } from 'bun:test'

import { PenExportError, writePenDocument } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { parseColor } from '@open-pencil/scene-graph/color'
import { WHITE } from '@open-pencil/scene-graph/constants'
import {
  iconDrawing,
  iconGlyph,
  readIcon,
  withIcon,
  withIconTint
} from '@open-pencil/scene-graph/icons'
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path'

function setup() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Icon',
    x: 12.5,
    y: 33.25,
    width: 24,
    height: 24,
    fills: []
  })
  // A provider fixture: native acceptance separately loads and inspects the real heart.
  const path = graph.createNode('VECTOR', frame.id, {
    name: 'path',
    width: 24,
    height: 24,
    vectorNetwork: parseSVGPath('M2 8L12 20L22 8Z'),
    horizontalConstraint: 'SCALE',
    verticalConstraint: 'SCALE',
    fills: [],
    strokeCap: 'ROUND',
    strokeJoin: 'ROUND',
    strokes: [
      {
        type: 'SOLID',
        color: WHITE,
        weight: 2,
        opacity: 1,
        visible: true,
        align: 'CENTER',
        cap: 'ROUND',
        join: 'ROUND'
      }
    ]
  })
  graph.updateNode(path.id, { pluginData: withIconTint(path, ['stroke']) })
  graph.updateNode(frame.id, {
    pluginData: withIcon(frame, {
      name: 'lucide:heart',
      glyph: iconGlyph(graph, frame),
      drawing: iconDrawing(graph, frame)
    })
  })
  return { graph, frame, path }
}

test('writes a named unedited icon as an editable icon instead of flattening or refusing it', () => {
  const { graph } = setup()
  const before = structuredClone([...graph.nodes.values()])
  const saved = writePenDocument(graph).children[0]
  expect(saved).toMatchObject({
    type: 'icon',
    name: 'Icon',
    x: 12.5,
    y: 33.25,
    width: 24,
    height: 24,
    library: 'lucide',
    icon: 'heart'
  })
  if (typeof saved.fill !== 'string') throw new Error('Expected a solid icon tint')
  expect(parseColor(saved.fill)).toEqual(WHITE)
  expect(saved.children).toBeUndefined()
  expect([...graph.nodes.values()]).toEqual(before)
})

test.each([
  'path offset',
  'point scaling',
  'fractional point edit',
  'stroke weight',
  'fractional stroke weight',
  'child effect',
  'different tint',
  'child content',
  'path binding',
  'path plugin',
  'frame plugin',
  'missing drawing',
  'options',
  'other family'
] as const)('refuses %s without mutating or flattening the icon', (change) => {
  const { graph, frame, path } = setup()
  const icon = readIcon(frame)
  if (!icon) throw new Error('Fixture icon metadata missing')
  switch (change) {
    case 'path offset':
      graph.updateNode(path.id, { x: 1 })
      break
    case 'point scaling':
      graph.updateNode(path.id, { vectorNetwork: parseSVGPath('M4 16L24 40L44 16Z') })
      break
    case 'fractional point edit':
      graph.updateNode(path.id, { vectorNetwork: parseSVGPath('M2.0001 8L12 20L22 8Z') })
      break
    case 'stroke weight':
      graph.updateNode(path.id, {
        strokes: path.strokes.map((stroke) => ({ ...stroke, weight: 3 }))
      })
      break
    case 'fractional stroke weight':
      graph.updateNode(path.id, {
        strokes: path.strokes.map((stroke) => ({ ...stroke, weight: 2.0001 }))
      })
      break
    case 'child effect':
      graph.updateNode(path.id, {
        effects: [
          {
            type: 'LAYER_BLUR',
            radius: 2,
            visible: true,
            color: WHITE,
            offset: { x: 0, y: 0 },
            spread: 0
          }
        ]
      })
      break
    case 'different tint':
      graph.updateNode(path.id, {
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
        pluginData: withIconTint(path, ['fill', 'stroke'])
      })
      graph.updateNode(frame.id, {
        pluginData: withIcon(frame, { ...icon, glyph: iconGlyph(graph, frame) })
      })
      break
    case 'child content':
      graph.createNode('RECTANGLE', path.id)
      break
    case 'path binding':
      graph.updateNode(path.id, { boundVariables: { width: 'token' } })
      break
    case 'path plugin':
      graph.updateNode(path.id, {
        pluginData: [...path.pluginData, { pluginId: 'fixture', key: 'authored', value: 'value' }]
      })
      break
    case 'frame plugin':
      graph.updateNode(frame.id, {
        pluginData: [...frame.pluginData, { pluginId: 'fixture', key: 'authored', value: 'value' }]
      })
      break
    case 'missing drawing':
      graph.updateNode(frame.id, {
        pluginData: withIcon(frame, { name: icon.name, glyph: icon.glyph })
      })
      break
    case 'options':
      graph.updateNode(frame.id, {
        pluginData: withIcon(frame, { ...icon, options: { wght: 200 } })
      })
      break
    case 'other family':
      graph.updateNode(frame.id, {
        pluginData: withIcon(frame, { ...icon, name: 'feather:heart' })
      })
      break
  }
  const before = structuredClone([...graph.nodes.values()])
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
  expect([...graph.nodes.values()]).toEqual(before)
})
