import { expect, test } from 'bun:test'

import {
  inspectPenCompatibility,
  PenExportError,
  PenImportError,
  parsePenDocument,
  parsePenFile,
  writePenFile
} from '@open-pencil/pen'

const source = {
  version: '2.21',
  children: [
    {
      id: 'mesh',
      name: 'Mesh round trip',
      type: 'rectangle',
      width: 256,
      height: 256,
      fill: {
        type: 'mesh_gradient',
        columns: 2,
        rows: 2,
        colors: ['#FF000080', '#00FF00', '#0000FF', '#FFFFFF'],
        points: [
          [0, 0],
          {
            position: [1, 0],
            leftHandle: [-0.3, 0.1],
            rightHandle: [0, 0],
            topHandle: [0.125, -0.25],
            bottomHandle: [-0.5, 0.75]
          },
          [0, 1],
          [1, 1]
        ],
        opacity: 0.8,
        blendMode: 'linearDodge'
      },
      stroke: { type: 'mesh_gradient', columns: 2, rows: 2 },
      strokeWidth: 8
    }
  ]
}

test('Pen mesh paints preserve vertices, colors, handles, opacity and blending', () => {
  const document = parsePenDocument(JSON.stringify(source))
  expect(inspectPenCompatibility(document)).toEqual([])
  const before = parsePenFile(JSON.stringify(source))
  const after = parsePenFile(writePenFile(before))
  expect(after.getNode('mesh')?.fills).toEqual(before.getNode('mesh')?.fills)
  expect(after.getNode('mesh')?.strokes).toEqual(before.getNode('mesh')?.strokes)
  expect(after.getNode('mesh')?.fills[0].meshGradient?.points[1]).toEqual({
    position: { x: 1, y: 0 },
    leftHandle: { x: -0.3, y: 0.1 },
    rightHandle: { x: 0, y: 0 },
    topHandle: { x: 0.125, y: -0.25 },
    bottomHandle: { x: -0.5, y: 0.75 }
  })
  const saved = parsePenDocument(writePenFile(before))
  expect(saved.children[0].fill).toMatchObject([
    {
      points: [
        { position: [0, 0] },
        source.children[0].fill.points[1],
        { position: [0, 1] },
        { position: [1, 1] }
      ]
    }
  ])
  expect(after.getNode('mesh')?.fills[0].meshGradient?.points[0]).toStrictEqual({
    position: { x: 0, y: 0 }
  })
})

test.each([
  { points: [[0, 0]] },
  { points: [{ position: [0, 0], leftHandle: [1] }, [1, 0], [0, 1], [1, 1]] },
  {
    points: [{ position: [0, 0], topHandle: [null, 0] }, [1, 0], [0, 1], [1, 1]]
  }
])('malformed mesh points are refused by the document reader: %j', ({ points }) => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        ...source,
        children: [{ ...source.children[0], fill: { ...source.children[0].fill, points } }]
      })
    )
  ).toThrow(PenImportError)
})

test('an overflowing JSON mesh coordinate is refused by the document reader', () => {
  const text = JSON.stringify({
    ...source,
    children: [
      {
        ...source.children[0],
        fill: {
          ...source.children[0].fill,
          points: [{ position: [0, 0], topHandle: [42, 0] }, [1, 0], [0, 1], [1, 1]]
        }
      }
    ]
  })
  const overflow = text.replace('"topHandle":[42,0]', '"topHandle":[1e400,0]')
  expect(overflow).not.toBe(text)
  expect(() => parsePenFile(overflow)).toThrow(PenImportError)
})

test('non-finite handles are refused by the document writer', () => {
  const graph = parsePenFile(JSON.stringify(source))
  const fill = graph.getNode('mesh')?.fills[0]
  if (!fill?.meshGradient) throw new Error('Missing mesh fixture')
  graph.updateNode('mesh', {
    fills: [
      {
        ...fill,
        meshGradient: {
          ...fill.meshGradient,
          points: fill.meshGradient.points.map((point, index) =>
            index === 0 ? { ...point, bottomHandle: { x: 0, y: Number.NaN } } : point
          )
        }
      }
    ]
  })
  expect(() => writePenFile(graph)).toThrow(PenExportError)
})

test('malformed or oversized meshes are reported before they can be omitted', () => {
  const document = parsePenDocument(
    JSON.stringify({
      ...source,
      children: [{ ...source.children[0], fill: { type: 'mesh_gradient', columns: 7, rows: 3 } }]
    })
  )
  expect(inspectPenCompatibility(document)).toContainEqual(
    expect.objectContaining({ code: 'unsupported-paint', nodeId: 'mesh' })
  )
})

test('mesh vertex variables preserve alpha, opacity and editable references', () => {
  const graph = parsePenFile(
    JSON.stringify({
      ...source,
      variables: { ink: { type: 'color', value: '#AA228880' } },
      children: [
        {
          ...source.children[0],
          fill: {
            ...source.children[0].fill,
            colors: ['$ink', '#00FF00', '#0000FF', '#FFFFFF']
          }
        }
      ]
    })
  )
  const node = graph.getNode('mesh')
  expect(node?.boundVariables['fills/0/meshGradient/colors/0']).toBeDefined()
  const saved = parsePenDocument(writePenFile(graph))
  expect(saved.children[0].fill).toMatchObject([
    { colors: ['$ink', '#00FF00', '#0000FF', '#FFFFFF'], opacity: 0.8 }
  ])
  const reopened = parsePenFile(writePenFile(graph)).getNode('mesh')
  expect(reopened?.fills).toEqual(node?.fills)
  expect(reopened?.boundVariables['fills/0/meshGradient/colors/0']).toBeDefined()
})

test('a stale mesh vertex binding cannot recolor a replacement solid on Save', () => {
  const graph = parsePenFile(
    JSON.stringify({
      ...source,
      variables: { ink: { type: 'color', value: '#FF0000' } },
      children: [
        {
          ...source.children[0],
          fill: { ...source.children[0].fill, colors: ['$ink', '#00FF00', '#0000FF', '#FFFFFF'] }
        }
      ]
    })
  )
  graph.updateNode('mesh', {
    fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }]
  })
  expect(() => writePenFile(graph)).toThrow('A mesh color binding no longer names a mesh vertex')
})
