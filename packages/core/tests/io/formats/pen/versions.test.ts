import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry, type ExportTarget } from '@open-pencil/core/io'
import { parsePenDocument, writePenDocument, writePenFile, PenExportError } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { withScript } from '@open-pencil/scene-graph/scripts'

const io = new IORegistry(BUILTIN_IO_FORMATS)

test('Core emits the current schema across document and export scopes without changing bounded interchange', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const shape = graph.createNode('RECTANGLE', page.id, {
    name: 'Current schema',
    width: 64,
    height: 64
  })
  expect(writePenDocument(graph).version).toBe('2.21')
  const document = await io.writeDocument('pen', graph)
  if (typeof document.data !== 'string') throw new Error('Expected UTF-8 .pen output')
  expect(parsePenDocument(document.data).version).toBe('2.22')
  expect(document.data.endsWith('\n')).toBe(true)
  const targets: ExportTarget[] = [
    { scope: 'document' },
    { scope: 'page', pageId: page.id },
    { scope: 'node', nodeId: shape.id },
    { scope: 'selection', nodeIds: [shape.id] }
  ]
  for (const target of targets) {
    const result = await io.exportContent('pen', { graph, target })
    if (typeof result.data !== 'string') throw new Error('Expected UTF-8 .pen output')
    const saved = parsePenDocument(result.data)
    expect(saved.version).toBe('2.22')
    expect(saved.children[0]).toMatchObject({
      id: shape.id,
      type: 'rectangle',
      width: 64,
      height: 64
    })
  }
})

test('Core preserves prior legacy line output until current-schema line conversion is qualified', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, { width: 200, height: 100 })
  graph.createNode('LINE', frame.id, { width: 80, height: 0 })
  const result = await io.writeDocument('pen', graph)
  expect(result.data).toBe(writePenFile(graph))
  if (typeof result.data !== 'string') throw new Error('Expected UTF-8 .pen output')
  expect(parsePenDocument(result.data).version).toBe('2.21')
})

test('current-schema policy does not bypass structured export refusals', async () => {
  const graph = new SceneGraph()
  graph.addPage('Unsupported extra page')
  await expect(io.writeDocument('pen', graph)).rejects.toThrow(PenExportError)
})

test('ordinary Script inputs do not trigger the legacy line exception', async () => {
  const graph = new SceneGraph()
  const script = graph.createNode('FRAME', graph.getPages()[0].id)
  graph.updateNode(script.id, {
    pluginData: withScript(script, { uri: 'probe.js', inputs: { type: 'line' } })
  })
  const result = await io.writeDocument('pen', graph)
  if (typeof result.data !== 'string') throw new Error('Expected UTF-8 .pen output')
  const saved = parsePenDocument(result.data)
  expect(saved.version).toBe('2.22')
  expect(saved.children[0]).toMatchObject({ type: 'script', inputs: { type: 'line' } })
})
