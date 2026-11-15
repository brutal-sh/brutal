import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { FigmaAPI } from '#core/figma-api'
import { ALL_TOOLS } from '#core/tools/registry'

function stateTool() {
  const tool = ALL_TOOLS.find((entry) => entry.name === 'get_app_state')
  if (!tool) throw new Error('Missing get_app_state tool')
  return tool
}

test('app state identifies its graph, current page and selection without changing them', () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const node = figma.createRectangle()
  node.name = 'Owned selected layer'
  figma.currentPage.selection = [node]
  const before = structuredClone([...graph.getAllNodes()])
  const tool = stateTool()
  expect(tool.execute(figma, {})).toEqual({
    graph: { rootId: graph.rootId, name: figma.root.name },
    page: { id: figma.currentPage.id, name: figma.currentPage.name },
    selection: [{ id: node.id, name: node.name, type: 'RECTANGLE' }]
  })
  expect(tool.mutates).toBe(false)
  expect(tool.capabilities).toEqual(['document:read'])
  expect([...graph.getAllNodes()]).toEqual(before)
  expect(figma.currentPage.selection).toEqual([node])
})

test('app state excludes stale and other-page selections without rewriting the selection', () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const original = figma.createRectangle()
  const removed = figma.createRectangle()
  const other = graph.addPage('Other owned page')
  figma.currentPage = figma.wrapNode(other.id)
  const local = figma.createRectangle()
  figma.currentPage.selection = [original, removed, local]
  graph.deleteNode(removed.id)
  const before = structuredClone([...graph.getAllNodes()])
  expect(stateTool().execute(figma, {})).toMatchObject({
    page: { id: other.id },
    selection: [{ id: local.id, name: local.name, type: 'RECTANGLE' }]
  })
  expect([...graph.getAllNodes()]).toEqual(before)
  expect(figma.currentPage.selection).toEqual([original, removed, local])
})

test('app state refuses a disappeared page without falling back to another page', () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const other = graph.addPage('Surviving page')
  const missing = figma.currentPage.id
  graph.deleteNode(missing)
  const before = structuredClone([...graph.getAllNodes()])
  expect(() => stateTool().execute(figma, {})).toThrow('Page')
  expect(figma.currentPageId).toBe(missing)
  expect(graph.getNode(other.id)).toBeDefined()
  expect([...graph.getAllNodes()]).toEqual(before)
})

test('equal imported IDs cannot turn a foreign proxy into a local selection', () => {
  const graphWithOwnedIDs = () => {
    let next = 0
    return new SceneGraph(() => `owned-state-${next++}`)
  }
  const graph = graphWithOwnedIDs()
  const figma = new FigmaAPI(graph)
  const foreignGraph = graphWithOwnedIDs()
  const foreignAPI = new FigmaAPI(foreignGraph)
  const local = figma.createRectangle()
  const foreign = foreignAPI.createRectangle()
  expect(foreign.id).toBe(local.id)
  figma.currentPage.selection = [foreign]
  const before = structuredClone([...graph.getAllNodes()])
  const other = structuredClone([...foreignGraph.getAllNodes()])
  expect(stateTool().execute(figma, {})).toMatchObject({ selection: [] })
  expect(figma.currentPage.selection).toEqual([foreign])
  expect([...graph.getAllNodes()]).toEqual(before)
  expect([...foreignGraph.getAllNodes()]).toEqual(other)
})

test('selected slots retain the public layer type in state summaries', () => {
  const figma = new FigmaAPI(new SceneGraph())
  const slot = figma.createComponent().createSlot()
  const selected = figma.getNodeById(slot.id)
  if (!selected) throw new Error('Missing owned slot')
  figma.currentPage.selection = [selected]
  expect(stateTool().execute(figma, {})).toMatchObject({
    selection: [{ id: slot.id, name: 'Slot', type: 'SLOT' }]
  })
})

test.each([{ path: 'private' }, { depth: 1 }, { page_id: 'other' }])(
  'app state rejects unsupported semantic arguments %j',
  (args) => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(() => stateTool().execute(figma, args)).toThrow(/Invalid arguments/)
  }
)
