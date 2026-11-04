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
  withIconTint,
  type IconOptions
} from '@open-pencil/scene-graph/icons'
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path'
import { scaleVectorNetworkForResize } from '@open-pencil/scene-graph/resize'

function setup(width = 24, name = 'lucide:heart', options?: IconOptions, height = width) {
  const size = Math.min(width, height)
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Icon',
    x: 12.5,
    y: 33.25,
    width,
    height,
    fills: []
  })
  // A provider fixture: native acceptance separately loads and inspects the real heart.
  const network = parseSVGPath('M2 8L12 20L22 8Z')
  const path = graph.createNode('VECTOR', frame.id, {
    name: 'path',
    x: (width - size) / 2,
    y: (height - size) / 2,
    width: size,
    height: size,
    vectorNetwork: scaleVectorNetworkForResize(network, 24, 24, size, size) ?? network,
    horizontalConstraint: 'SCALE',
    verticalConstraint: 'SCALE',
    fills: [],
    strokeCap: 'ROUND',
    strokeJoin: 'ROUND',
    strokes: [
      {
        type: 'SOLID',
        color: WHITE,
        weight: size / 12,
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
      name,
      ...(options && { options }),
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
  ['lucide', 'lucide'],
  ['feather', 'feather'],
  ['ph', 'phosphor'],
  ['material-symbols-outlined', 'Material Symbols Outlined'],
  ['material-symbols-rounded', 'Material Symbols Rounded'],
  ['material-symbols-sharp', 'Material Symbols Sharp']
])('writes supported %s icons at their square and rectangular source sizes', (prefix, library) => {
  for (const size of [16, 24, 64, 96.5]) {
    const options = prefix.startsWith('material-')
      ? { wght: 700, opsz: 24, FILL: 0, GRAD: 0 }
      : undefined
    const { graph } = setup(size, `${prefix}:home`, options)
    const before = structuredClone([...graph.nodes.values()])
    const saved = writePenDocument(graph).children[0]
    expect(saved).toMatchObject({ type: 'icon', library, icon: 'home', width: size, height: size })
    expect(saved.weight).toBe(options?.wght)
    expect([...graph.nodes.values()]).toEqual(before)
  }
  for (const [width, height] of [
    [96, 40],
    [40, 96],
    [96.5, 40.25]
  ]) {
    const options = prefix.startsWith('material-') ? { wght: 700 } : undefined
    const { graph } = setup(width, `${prefix}:home`, options, height)
    const before = structuredClone([...graph.nodes.values()])
    const saved = writePenDocument(graph).children[0]
    expect(saved).toMatchObject({
      type: 'icon',
      library,
      icon: 'home',
      width,
      height
    })
    expect(saved.weight).toBe(options?.wght)
    expect([...graph.nodes.values()]).toEqual(before)
  }
})

const unsupportedMaterialOptions: (IconOptions | undefined)[] = [
  undefined,
  { wght: '700' },
  { wght: 99 },
  { wght: 701 },
  { wght: Number.NaN },
  { wght: 200, opsz: 32 },
  { wght: 200, FILL: 1 },
  { wght: 200, GRAD: 100 },
  { wght: 200, unknown: 1 }
]

test.each(unsupportedMaterialOptions)(
  'refuses Material options that named .pen icons cannot reproduce: %j',
  (options) => {
    const { graph } = setup(64, 'material-symbols-rounded:home', options)
    const before = structuredClone([...graph.nodes.values()])
    expect(() => writePenDocument(graph)).toThrow(PenExportError)
    expect([...graph.nodes.values()]).toEqual(before)
  }
)

test.each([
  [0, 0],
  [24, 0],
  [0, 24],
  [-24, -24],
  [24, 48],
  [Number.POSITIVE_INFINITY, 24],
  [24, Number.POSITIVE_INFINITY],
  [Number.NaN, 24],
  [24, Number.NaN]
])('refuses unsupported source dimensions %j without mutating the icon', (width, height) => {
  const { graph, frame } = setup()
  graph.updateNode(frame.id, { width, height })
  const before = structuredClone([...graph.nodes.values()])
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
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
  'legacy tint alpha',
  'child content',
  'path binding',
  'path plugin',
  'frame plugin',
  'missing drawing',
  'options',
  'unsupported family'
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
    case 'legacy tint alpha':
      graph.updateNode(path.id, {
        strokes: path.strokes.map((stroke) => ({ ...stroke, color: { ...stroke.color, a: 0.5 } }))
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
    case 'unsupported family':
      graph.updateNode(frame.id, {
        pluginData: withIcon(frame, { ...icon, name: 'unknown:heart' })
      })
      break
  }
  const before = structuredClone([...graph.nodes.values()])
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
  expect([...graph.nodes.values()]).toEqual(before)
})
