import { expect, test } from 'bun:test'

import {
  inspectPenCompatibility,
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
        points: [[0, 0], { position: [1, 0], leftHandle: [-0.3, 0.1] }, [0, 1], [1, 1]],
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
  expect(after.getNode('mesh')?.fills[0].meshGradient?.points[1].leftHandle).toEqual({
    x: -0.3,
    y: 0.1
  })
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
