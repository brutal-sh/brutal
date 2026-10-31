import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { markScriptOutputCurrent } from '@open-pencil/scene-graph/scripts'

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
