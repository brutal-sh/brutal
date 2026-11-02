import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { markScriptOutputCurrent, hasCurrentScriptOutput } from '@open-pencil/scene-graph/scripts'

import { createEditor } from '#core/editor/create'
import { exportPenSnapshot } from '#core/io/formats/pen/snapshot'
import { renderNodesToSVG } from '#core/io/formats/svg'
import { extractExportGraph } from '#core/io/subgraph'

const document = JSON.stringify({
  version: '2.21',
  children: [{ type: 'script', id: 'probe', scriptUri: 'grid.js', width: 200, height: 200 }]
})

test('headless rendering refuses unresolved Scripts while authored saves remain lossless', () => {
  const graph = parsePenFile(document)
  const page = graph.getPages()[0]
  expect(() => renderNodesToSVG(graph, page.id, ['probe'])).toThrow(/current generated output/)
  expect(() => exportPenSnapshot(graph)).toThrow(/linked Script sources/)
  expect(writePenDocument(graph).children[0]).toMatchObject({
    type: 'script',
    scriptUri: 'grid.js'
  })
})

test('successful empty output can export and exact export copies retain readiness without persisting it', () => {
  const graph = parsePenFile(document)
  markScriptOutputCurrent(graph, 'probe', true)
  const page = graph.getPages()[0]
  expect(() => renderNodesToSVG(graph, page.id, ['probe'])).not.toThrow()
  const copy = extractExportGraph(graph, { scope: 'node', nodeId: 'probe' })
  expect(() => renderNodesToSVG(copy.graph, copy.pageId ?? page.id, ['probe'])).not.toThrow()
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  expect(() => renderNodesToSVG(reopened, reopened.getPages()[0].id, ['probe'])).toThrow()
  graph.updateNode('probe', { width: 220 })
  expect(() => renderNodesToSVG(graph, page.id, ['probe'])).toThrow()
})

test('a current diagnostic exports its error artwork without becoming convertible or surviving a reopen', () => {
  const graph = parsePenFile(document)
  const node = graph.getNode('probe')
  if (!node) throw new Error('Missing Script fixture')
  graph.createNode('RECTANGLE', 'probe', {
    width: 200,
    height: 200,
    fills: [
      {
        type: 'SOLID',
        color: { r: 1, g: 0.4, b: 0.4, a: 1 },
        opacity: 1,
        visible: true
      }
    ]
  })
  markScriptOutputCurrent(graph, 'probe', 'diagnostic')
  expect(hasCurrentScriptOutput(graph, node)).toBe(false)
  const copy = extractExportGraph(graph, { scope: 'node', nodeId: 'probe' })
  expect(renderNodesToSVG(copy.graph, copy.pageId ?? graph.getPages()[0].id, ['probe'])).toContain(
    '#FF6666'
  )
  const editor = createEditor({ graph })
  try {
    expect(() => editor.convertScriptToLayers('probe')).toThrow(/current|finished|successful/)
  } finally {
    editor.dispose()
  }
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  expect(() => renderNodesToSVG(reopened, reopened.getPages()[0].id, ['probe'])).toThrow(
    /current generated output/
  )
  graph.updateNode('probe', { width: 220 })
  expect(() => renderNodesToSVG(graph, graph.getPages()[0].id, ['probe'])).toThrow(
    /current generated output/
  )
})

test.each([true, 'diagnostic'] as const)(
  'a same-metadata component swap invalidates %s Script presentation, including a swap back',
  (kind) => {
    const graph = parsePenFile(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            type: 'script',
            id: 'first',
            reusable: true,
            scriptUri: 'grid.js',
            width: 200,
            height: 200
          },
          {
            type: 'script',
            id: 'second',
            reusable: true,
            scriptUri: 'grid.js',
            width: 200,
            height: 200
          },
          { type: 'ref', id: 'instance', ref: 'first' }
        ]
      })
    )
    graph.createNode('RECTANGLE', 'instance', { width: 20, height: 20 })
    markScriptOutputCurrent(graph, 'instance', kind)
    const page = graph.getPages()[0]
    expect(() => renderNodesToSVG(graph, page.id, ['instance'])).not.toThrow()
    graph.swapInstanceComponent('instance', 'second')
    expect(() => renderNodesToSVG(graph, page.id, ['instance'])).toThrow(/current generated output/)
    graph.swapInstanceComponent('instance', 'first')
    expect(() => renderNodesToSVG(graph, page.id, ['instance'])).toThrow(/current generated output/)
  }
)
