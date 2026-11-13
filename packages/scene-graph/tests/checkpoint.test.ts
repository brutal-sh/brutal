import { expect, test } from 'bun:test'

import { captureGraphCheckpoint } from '#scene-graph/checkpoint'
import { SceneGraph } from '#scene-graph/graph'

test('rollback restores the connector index with its surviving identity', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('Expected a page')
  const retained = graph.createNode('CONNECTOR', page.id, { name: 'Retained edge' })
  const index = graph.connectorIds
  const checkpoint = captureGraphCheckpoint(graph)
  graph.deleteNode(retained.id)
  const failed = graph.createNode('CONNECTOR', page.id, { name: 'Failed edge' })
  checkpoint.restore()
  expect(graph.getNode(retained.id)).toBe(retained)
  expect(graph.getNode(failed.id)).toBeUndefined()
  expect(graph.connectorIds).toBe(index)
  expect([...index]).toEqual([retained.id])
})
