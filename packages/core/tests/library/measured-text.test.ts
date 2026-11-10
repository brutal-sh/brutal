import { expect, test } from 'bun:test'

import {
  createLibraryRevision,
  deserializeLibraryRevision,
  discoverPublishableLibraryChanges,
  serializeLibraryRevision,
  validateLibraryRevision
} from '@open-pencil/core/library'
import { SceneGraph } from '@open-pencil/scene-graph'

const MEASURED_TEXT_HEIGHT = 17.060546875

function fixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('Missing page')
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Button',
    componentKey: 'button',
    width: 80,
    height: 32
  })
  const text = graph.createNode('TEXT', component.id, {
    name: 'Label',
    text: 'Button',
    width: 60,
    height: 20
  })
  return { graph, page, component, text }
}

function publish(graph: SceneGraph) {
  return createLibraryRevision({ libraryId: 'controls', name: 'Controls', graph })
}

test('text measurement alone is not a publishable edit and stored hashes remain valid', async () => {
  const { graph, text } = fixture()
  const previous = await publish(graph)
  graph.updateNode(text.id, { derivedTextHeight: MEASURED_TEXT_HEIGHT })
  const discovery = await discoverPublishableLibraryChanges(previous, graph)

  expect(discovery.changes).toEqual([])
  expect(discovery.current.manifest.assets[0]?.contentHash).not.toBe(
    previous.manifest.assets[0]?.contentHash
  )
  for (const revision of [previous, discovery.current]) {
    await validateLibraryRevision(deserializeLibraryRevision(serializeLibraryRevision(revision)))
  }
  expect(graph.getNode(text.id)?.derivedTextHeight).toBe(MEASURED_TEXT_HEIGHT)
})

test('measurement changes in a component dependency are not publishable edits', async () => {
  const { graph, page, component } = fixture()
  const dependency = graph.createNode('COMPONENT', page.id, {
    name: 'Icon',
    componentKey: 'icon'
  })
  const text = graph.createNode('TEXT', dependency.id, { text: 'Icon' })
  graph.createNode('INSTANCE', component.id, { componentId: dependency.id })
  const previous = await publish(graph)
  graph.updateNode(text.id, { derivedTextHeight: MEASURED_TEXT_HEIGHT })

  expect((await discoverPublishableLibraryChanges(previous, graph)).changes).toEqual([])
})

test('renaming and measuring retains the actual revision descriptors', async () => {
  const { graph, component, text } = fixture()
  const previous = await publish(graph)
  graph.updateNode(text.id, { derivedTextHeight: MEASURED_TEXT_HEIGHT })
  graph.updateNode(component.id, { name: 'Renamed', symbolDescription: 'Updated description' })
  const discovery = await discoverPublishableLibraryChanges(previous, graph)

  expect(discovery.changes).toEqual([
    {
      kind: 'renamed',
      previous: previous.manifest.assets[0],
      asset: discovery.current.manifest.assets[0]
    }
  ])
})

test('authored records named derivedTextHeight still change the asset', async () => {
  const { graph, component, text } = fixture()
  const previous = await publish(graph)
  graph.updateNode(text.id, { derivedTextHeight: MEASURED_TEXT_HEIGHT })
  graph.updateNode(component.id, { componentPropertyValues: { derivedTextHeight: 'Authored' } })
  const discovery = await discoverPublishableLibraryChanges(previous, graph)

  expect(discovery.changes).toEqual([
    {
      kind: 'modified',
      previous: previous.manifest.assets[0],
      asset: discovery.current.manifest.assets[0]
    }
  ])
})

test('stored measurement tampering still fails the existing integrity check', async () => {
  const { graph } = fixture()
  const previous = await publish(graph)
  const copy = deserializeLibraryRevision(serializeLibraryRevision(previous))
  const text = [...copy.graph.getAllNodes()].find((node) => node.type === 'TEXT')
  if (!text) throw new Error('Missing stored text')
  copy.graph.updateNode(text.id, { derivedTextHeight: MEASURED_TEXT_HEIGHT })

  await expect(validateLibraryRevision(copy)).rejects.toThrow('content hash mismatch')
})
