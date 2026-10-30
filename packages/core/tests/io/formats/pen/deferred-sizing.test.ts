import { expect, test } from 'bun:test'

import { computeLayout } from '@open-pencil/core/layout'
import { parsePenFile, writePenDocument, PenExportError } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import {
  authoredLayoutSizing,
  authoredLayoutSizingUpdates,
  layoutSizing,
  layoutSizingUpdates
} from '@open-pencil/scene-graph/layout'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

function document(width: number | string = 'fill_container(80)', height: number | string = 40) {
  return parsePenFile(
    JSON.stringify({
      version: '2.21',
      children: [{ type: 'frame', id: 'item', width, height, layout: 'none' }]
    })
  )
}

function item(graph: SceneGraph) {
  const node = graph.getNode('item')
  if (!node) throw new Error('Missing sizing fixture')
  return node
}

test('root Fill keeps its fallback, independent axes and Pen round trip without relaxing the Figma setter', () => {
  const graph = document()
  const node = item(graph)
  expect(node).toMatchObject({ width: 80, height: 40 })
  expect(authoredLayoutSizing(graph, node, 'HORIZONTAL')).toBe('FILL')
  expect(layoutSizing(graph, node, 'HORIZONTAL')).toBe('FIXED')
  expect(layoutSizingUpdates(graph, node, 'HORIZONTAL', 'FILL')).toEqual({})
  expect(writePenDocument(graph).children[0]).toMatchObject({
    width: 'fill_container(80)',
    height: 40
  })
  graph.updateNode(node.id, authoredLayoutSizingUpdates(graph, node, 'VERTICAL', 'FILL'))
  expect(writePenDocument(graph).children[0]).toMatchObject({
    width: 'fill_container(80)',
    height: 'fill_container(40)'
  })
  graph.updateNode(node.id, authoredLayoutSizingUpdates(graph, node, 'HORIZONTAL', 'FIXED'))
  const saved = writePenDocument(graph)
  expect(saved.children[0]).toMatchObject({ width: 80, height: 'fill_container(40)' })
  const reopened = parsePenFile(JSON.stringify(saved))
  expect(authoredLayoutSizing(reopened, item(reopened), 'VERTICAL')).toBe('FILL')
})

test.each(['HORIZONTAL', 'VERTICAL'] as const)(
  'deferred width fills a %s parent, follows direction changes and can be fixed',
  (layoutMode) => {
    const graph = document()
    const node = item(graph)
    const parent = graph.createNode('FRAME', graph.getPages()[0].id, {
      layoutMode,
      width: 300,
      height: 200
    })
    graph.reparentNode(node.id, parent.id)
    computeLayout(graph, parent.id)
    expect(node).toMatchObject({ width: 300, height: 40 })
    expect(layoutSizing(graph, node, 'HORIZONTAL')).toBe('FILL')
    expect(layoutSizing(graph, node, 'VERTICAL')).toBe('FIXED')
    graph.updateNode(parent.id, {
      layoutMode: layoutMode === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'
    })
    computeLayout(graph, parent.id)
    expect(node).toMatchObject({ width: 300, height: 40 })
    graph.updateNode(node.id, {
      ...authoredLayoutSizingUpdates(graph, node, 'HORIZONTAL', 'FIXED'),
      width: 100
    })
    computeLayout(graph, parent.id)
    expect(node.width).toBe(100)
    expect(authoredLayoutSizing(graph, node, 'HORIZONTAL')).toBe('FIXED')
  }
)

test('invalid deferred sizing metadata is rejected at Pen export', () => {
  const graph = document(80)
  const node = item(graph)
  graph.updateNode(node.id, {
    pluginData: [
      {
        pluginId: 'open-pencil',
        key: OPEN_PENCIL_PLUGIN_DATA.deferredFill.key,
        value: '{"HORIZONTAL":"yes"}'
      }
    ]
  })
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
  graph.updateNode(node.id, {
    pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.deferredFill, {
      HORIZONTAL: true,
      VERTICAL: false
    })
  })
  expect(writePenDocument(graph).children[0].width).toBe('fill_container(80)')
})

test('an empty Hug frame retains its fallback, lets content determine size and roundtrips', () => {
  const graph = document('fit_content(350)', 225)
  const node = item(graph)
  graph.updateNode(node.id, { layoutMode: 'VERTICAL', counterAxisSizing: 'HUG' })
  computeLayout(graph, node.id)
  expect(node).toMatchObject({ width: 350, minWidth: null })
  expect(writePenDocument(graph).children[0].width).toBe('fit_content(350)')
  const child = graph.createNode('RECTANGLE', node.id, { width: 80, height: 40 })
  computeLayout(graph, node.id)
  expect(node.width).toBe(80)
  graph.deleteNode(child.id)
  computeLayout(graph, node.id)
  expect(node.width).toBe(350)
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  computeLayout(reopened, node.id)
  expect(item(reopened).width).toBe(350)
  graph.updateNode(node.id, {
    pluginData: [
      {
        pluginId: 'open-pencil',
        key: OPEN_PENCIL_PLUGIN_DATA.hugFallback.key,
        value: '{"HORIZONTAL":-1}'
      }
    ]
  })
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
})
