import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { FigmaAPI } from '#core/figma-api'
import { selectNodes } from '#core/tools/read/selection'

function fixture() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const first = figma.createRectangle()
  const previous = figma.createRectangle()
  figma.currentPage.selection = [previous]
  return { graph, figma, first, previous }
}

test('selection validates all IDs before replacing the current API selection', () => {
  const { graph, figma, first, previous } = fixture()
  const before = structuredClone([...graph.getAllNodes()])
  expect(() => selectNodes.execute(figma, { ids: [first.id, 'missing-owned-node'] })).toThrow()
  expect(figma.currentPage.selection).toEqual([previous])
  expect([...graph.getAllNodes()]).toEqual(before)
})

test('selection refuses nodes on another page without partial selection', () => {
  const { graph, figma, first, previous } = fixture()
  const other = graph.addPage('Other owned page')
  const foreign = graph.createNode('RECTANGLE', other.id)
  const before = structuredClone([...graph.getAllNodes()])
  expect(() => selectNodes.execute(figma, { ids: [first.id, foreign.id] })).toThrow()
  expect(figma.currentPage.selection).toEqual([previous])
  expect([...graph.getAllNodes()]).toEqual(before)
})

test('selection rejects document/page roots and leaves its page and selection unchanged', () => {
  const { graph, figma, previous } = fixture()
  const page = figma.currentPageId
  for (const id of [graph.rootId, page]) {
    expect(() => selectNodes.execute(figma, { ids: [id] })).toThrow()
    expect(figma.currentPage.selection).toEqual([previous])
    expect(figma.currentPageId).toBe(page)
  }
})

test('successful selection reports the unique actual API selection without editing the graph', () => {
  const { graph, figma, first } = fixture()
  const before = structuredClone([...graph.getAllNodes()])
  expect(selectNodes.execute(figma, { ids: [first.id, first.id] })).toEqual({
    selected: [first.id]
  })
  expect(figma.currentPage.selection.map((node) => node.id)).toEqual([first.id])
  expect([...graph.getAllNodes()]).toEqual(before)
})
