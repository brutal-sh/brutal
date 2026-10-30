import { describe, expect, test } from 'bun:test'

import {
  parsePenFile,
  parsePenDocument,
  writePenFile,
  writePenDocument,
  PenExportError
} from '@open-pencil/pen'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import { getNodeLocalMatrix } from '@open-pencil/scene-graph/coordinate'

import { parseDocument } from '../helpers/document'

function ordinary(type: SceneNode['type'] = 'RECTANGLE') {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode(type, page.id)
  return { graph, node }
}

describe('bounded .pen writer', () => {
  test.each(['FRAME', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'TEXT', 'GROUP', 'COMPONENT'] as const)(
    'accepts ordinary default %s nodes',
    (type) => {
      const { graph } = ordinary(type)
      expect(writePenDocument(graph).children[0].type).toBeDefined()
    }
  )

  test.each([
    ['INSIDE', 'inner'],
    ['CENTER', 'center'],
    ['OUTSIDE', 'outer']
  ] as const)('serializes %s stroke alignment using canonical .pen value %s', (align, expected) => {
    const { graph, node } = ordinary()
    graph.updateNode(node.id, {
      strokes: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          weight: 2,
          align
        }
      ]
    })
    const serialized = writePenFile(graph)
    expect(parsePenDocument(serialized).children[0].strokeAlignment).toBe(expected)
    expect(parsePenFile(serialized).getNode(node.id)?.strokes[0].align).toBe(align)
  })

  test('edited frame, shape and text roundtrip through 2.21 JSON', () => {
    const graph = parseDocument([
      {
        id: 'frame',
        type: 'frame',
        layout: 'none',
        x: 20,
        y: 30,
        width: 300,
        height: 200,
        fill: '#FFFFFF',
        children: [
          {
            id: 'box',
            type: 'rectangle',
            x: 14,
            y: 18,
            width: 90,
            height: 50,
            fill: '#FF000080',
            cornerRadius: [2, 3, 4, 5],
            stroke: '#000000',
            strokeWidth: 2,
            strokeAlignment: 'inside',
            effect: { type: 'shadow', blur: 4, offset: { x: 2, y: 3 }, color: '#00000040' }
          },
          {
            id: 'text',
            type: 'text',
            content: 'Before',
            width: 150,
            height: 30,
            textGrowth: 'fixed-width-height',
            fill: '#223344',
            fontSize: 20
          }
        ]
      }
    ])
    graph.updateNode('box', { width: 120, x: 25 })
    graph.updateNode('text', { text: 'Edited text', fontWeight: 700 })
    const source = writePenFile(graph)
    const read = parsePenFile(source)
    expect(writePenDocument(read).version).toBe('2.21')
    expect(read.getNode('frame')?.childIds).toEqual(['box', 'text'])
    expect(read.getNode('frame')?.layoutMode).toBe('NONE')
    expect(read.getNode('box')).toMatchObject({
      width: 120,
      x: 25,
      independentCorners: true,
      topLeftRadius: 2
    })
    expect(read.getNode('box')?.fills[0].opacity).toBeCloseTo(128 / 255, 6)
    expect(read.getNode('box')?.strokes[0]).toMatchObject({ weight: 2, align: 'INSIDE' })
    expect(read.getNode('box')?.effects[0]).toMatchObject({
      type: 'DROP_SHADOW',
      radius: 4,
      offset: { x: 2, y: 3 }
    })
    expect(read.getNode('text')).toMatchObject({
      text: 'Edited text',
      fontWeight: 700,
      fontSize: 20
    })
  })

  test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true]
  ])('preserves transformed corners with flips %s/%s', (flipX, flipY) => {
    const { graph, node } = ordinary()
    graph.updateNode(node.id, { x: 24, y: 31, width: 80, height: 47, rotation: 33, flipX, flipY })
    const before = getNodeLocalMatrix(node)
    const read = parsePenFile(writePenFile(graph)).getNode(node.id)
    expect(read).toBeDefined()
    if (read)
      getNodeLocalMatrix(read).forEach((value, index) =>
        expect(value).toBeCloseTo(before[index], 7)
      )
  })

  test('preserves paths, arcs, polygon count and reusable frame definitions', () => {
    const graph = parseDocument([
      {
        id: 'path',
        type: 'path',
        width: 60,
        height: 40,
        geometry: 'M 2 3 C 8 9 40 5 55 35 Z',
        viewBox: [0, 0, 60, 40],
        fill: '#123456'
      },
      { id: 'arc', type: 'ellipse', startAngle: 10, sweepAngle: 120, innerRadius: 0.4 },
      { id: 'polygon', type: 'polygon', polygonCount: 7 },
      { id: 'component', type: 'frame', reusable: true, layout: 'none' }
    ])
    const read = parsePenFile(writePenFile(graph))
    expect(read.getNode('path')?.vectorNetwork).toEqual(graph.getNode('path')?.vectorNetwork)
    expect(read.getNode('arc')?.arcData).toEqual(graph.getNode('arc')?.arcData)
    expect(read.getNode('polygon')?.pointCount).toBe(7)
    expect(read.getNode('component')?.type).toBe('COMPONENT')
  })

  test('refuses non-finite geometry and page paints before JSON can erase them', () => {
    const { graph, node } = ordinary()
    graph.updateNode(node.id, { width: Infinity })
    expect(() => writePenFile(graph)).toThrow('Non-finite numbers')
    graph.updateNode(node.id, { width: 100 })
    const page = graph.getPages()[0]
    graph.updateNode(page.id, {
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }]
    })
    expect(() => writePenFile(graph)).toThrow('Move the content into a frame')
  })

  test.each([
    { type: 'INSTANCE' },
    { layoutMode: 'GRID' },
    { locked: true },
    { cornerSmoothing: 0.5 },
    { boundVariables: { opacity: 'variable' } },
    { textDecoration: 'UNDERLINE' },
    {
      fills: [
        { type: 'GRADIENT_DIAMOND', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }
      ]
    }
  ] satisfies Partial<SceneNode>[])(
    'rejects unsupported content with node paths and does not mutate the graph: %j',
    (changes) => {
      const { graph, node } = ordinary()
      graph.updateNode(node.id, changes)
      const before = structuredClone(node)
      try {
        writePenFile(graph)
        throw new Error('Expected export rejection')
      } catch (error) {
        expect(error).toBeInstanceOf(PenExportError)
        if (error instanceof PenExportError) {
          expect(error.diagnostics[0].nodeId).toBe(node.id)
          expect(error.diagnostics[0].path).toStartWith('/children/0/')
          expect(error.message).toContain('Keep the .fig original')
        }
      }
      expect(node).toEqual(before)
    }
  )
})
