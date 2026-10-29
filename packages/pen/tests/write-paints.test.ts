import { describe, expect, test } from 'bun:test'

import { writePenDocument, parsePenFile, writePenFile } from '@open-pencil/pen'

import { parseDocument } from './helpers/document'

const stops = [
  { color: '#FF000080', position: 0.1 },
  { color: '#0011FF', position: 0.9 }
]

describe('.pen paint export', () => {
  test.each(['linear', 'radial', 'angular'])(
    'roundtrips %s gradient shape, stops and opacity',
    (gradientType) => {
      const graph = parseDocument([
        {
          id: 'r',
          type: 'rectangle',
          width: 190,
          height: 80,
          fill: {
            type: 'gradient',
            gradientType,
            rotation: 37,
            center: { x: 0.3, y: 0.6 },
            size: { width: 0.7, height: 0.4 },
            opacity: 0.6,
            colors: stops,
            blendMode: 'multiply'
          }
        }
      ])
      const before = graph.getNode('r')?.fills[0]
      const after = parsePenFile(writePenFile(graph)).getNode('r')?.fills[0]
      expect(after).toMatchObject({
        type: before?.type,
        gradientStops: before?.gradientStops,
        opacity: 0.6,
        blendMode: 'MULTIPLY'
      })
      if (!before?.gradientTransform || !after?.gradientTransform)
        throw new Error('Missing gradients')
      for (const key of ['m00', 'm01', 'm02', 'm10', 'm11', 'm12'] as const)
        expect(after.gradientTransform[key]).toBeCloseTo(before.gradientTransform[key], 8)
    }
  )

  test('rejects elliptical skew rather than rounding away its transform', () => {
    const graph = parseDocument([{ id: 'r', type: 'rectangle' }])
    graph.updateNode('r', {
      fills: [
        {
          type: 'GRADIENT_RADIAL',
          color: { r: 0, g: 0, b: 0, a: 0 },
          opacity: 1,
          visible: true,
          gradientTransform: { m00: 1, m01: 0.5, m02: 0, m10: 0, m11: 1, m12: 0 },
          gradientStops: []
        }
      ]
    })
    expect(() => writePenDocument(graph)).toThrow('Skewed or mirrored')
  })
})
