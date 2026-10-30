import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { buildOpenPencilClipboardHTML, parseOpenPencilClipboard } from '@open-pencil/core/clipboard'
import { SceneGraph, type Fill } from '@open-pencil/scene-graph'

import { extractExportGraph } from '#core/io/subgraph'

test('selection exports and clipboard retain stroke, path and styled-text image resources', () => {
  const graph = new SceneGraph()
  const image = (hash: string): Fill => ({
    type: 'IMAGE',
    imageHash: hash,
    color: { r: 0, g: 0, b: 0, a: 0 },
    opacity: 1,
    visible: true
  })
  const node = graph.createNode('VECTOR', graph.getPages()[0].id, {
    fills: [],
    strokes: [{ ...image('stroke'), weight: 4, align: 'INSIDE' }],
    fillGeometry: [
      { windingRule: 'NONZERO', commandsBlob: new Uint8Array(), fills: [image('path')] }
    ],
    styleRuns: [
      {
        start: 0,
        length: 1,
        style: { fills: [image('text')], textDecorationFills: [image('run-decoration')] }
      }
    ],
    textDecorationFills: [image('decoration')]
  })
  const hashes = ['stroke', 'path', 'text', 'run-decoration', 'decoration']
  for (const [index, hash] of hashes.entries()) graph.images.set(hash, new Uint8Array([index + 1]))
  const exported = extractExportGraph(graph, { scope: 'node', nodeId: node.id }).graph
  const pasted = expectDefined(
    parseOpenPencilClipboard(buildOpenPencilClipboardHTML([node], graph))
  )
  for (const [index, hash] of hashes.entries()) {
    expect(exported.images.get(hash)).toEqual(new Uint8Array([index + 1]))
    expect(pasted.images.get(hash)).toEqual(new Uint8Array([index + 1]))
  }
  expect(pasted.nodes[0].fillGeometry[0].fills).toEqual(node.fillGeometry[0].fills)
})
