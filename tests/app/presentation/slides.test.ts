import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { collectPresentationSlides, presentationIndex } from '@/app/presentation/slides'

test('slides follow the Layers panel order, omitting hidden, nested and non-frame layers', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const first = graph.createNode('FRAME', page.id, {
    name: 'First created',
    width: 800,
    height: 600
  })
  graph.createNode('FRAME', first.id, { name: 'Nested' })
  graph.createNode('RECTANGLE', page.id, { name: 'Decoration' })
  graph.createNode('FRAME', page.id, { name: 'Hidden', visible: false })
  graph.createNode('FRAME', page.id, { name: 'Internal', internalOnly: true })
  const last = graph.createNode('FRAME', page.id, { name: 'Top layer', width: 3840, height: 2160 })
  const childIds = [...page.childIds]

  expect(collectPresentationSlides(graph, page.id)).toEqual([
    { id: last.id, name: 'Top layer', scale: 0.5 },
    { id: first.id, name: 'First created', scale: 2 }
  ])
  expect(page.childIds).toEqual(childIds)
  expect(collectPresentationSlides(graph, graph.addPage('Empty').id)).toEqual([])
})

test('navigation remains at the first and final slide', () => {
  expect(presentationIndex(-1, 3)).toBe(0)
  expect(presentationIndex(3, 3)).toBe(2)
  expect(presentationIndex(1, 3)).toBe(1)
  expect(presentationIndex(1, 0)).toBe(0)
})
