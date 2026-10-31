import { expect, test } from 'bun:test'

import { generatedFrameOwner, hasGeneratedContent } from '#scene-graph/generated'
import { SceneGraph } from '#scene-graph/graph'
import { scriptOfNode, withScript } from '#scene-graph/scripts'
import { slotScope } from '#scene-graph/slots/content'

test('Script frames own their derived layers while ordinary frames stay editable', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id)
  const child = graph.createNode('RECTANGLE', frame.id)
  expect(hasGeneratedContent(frame)).toBe(false)
  graph.updateNode(frame.id, {
    pluginData: withScript(frame, { uri: 'grid.js', inputs: { count: 9 } })
  })
  expect(hasGeneratedContent(frame)).toBe(true)
  expect(generatedFrameOwner(graph, child)?.id).toBe(frame.id)
  expect(slotScope(graph, frame.id)).toMatchObject({ kind: 'locked', owner: { id: frame.id } })
  expect(scriptOfNode(frame)).toEqual({ uri: 'grid.js', inputs: { count: 9 } })
  graph.updateNode(frame.id, { pluginData: withScript(frame, undefined) })
  expect(slotScope(graph, frame.id)).toEqual({ kind: 'free' })
  expect(generatedFrameOwner(graph, child)).toBeUndefined()
})
