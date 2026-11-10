import { expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@open-pencil/core/io'
import { writePenDocument, type PenDocument, type PenNode } from '@open-pencil/pen'
import { noteBody, noteOfNode } from '@open-pencil/scene-graph/generated'

import { computeAllLayouts } from '#core/layout'

const io = new IORegistry([penFormat])

async function open(document: PenDocument) {
  return (
    await io.readDocument({
      name: 'note-sizing.pen',
      data: new TextEncoder().encode(JSON.stringify(document))
    })
  ).graph
}

function frame(layout: 'horizontal' | 'vertical', notes: PenNode[]): PenDocument {
  return {
    version: '2.22',
    children: [
      { id: 'frame', type: 'frame', layout, width: 600, height: 500, padding: 20, children: notes }
    ]
  }
}

const note: PenNode = { id: 'note', type: 'note', content: 'Fill sizing', width: 300, height: 400 }

for (const layout of ['horizontal', 'vertical'] as const) {
  for (const axis of ['width', 'height', 'both'] as const) {
    test(`Pen ${layout} Note ${axis} Fill retains authored sizing through three reopens`, async () => {
      let document = frame(layout, [
        {
          ...note,
          width: axis === 'height' ? 300 : 'fill_container',
          height: axis === 'width' ? 400 : 'fill_container'
        }
      ])
      for (let round = 0; round < 3; round++) {
        const graph = await open(document)
        const actual = graph.getNode('note')
        expect(actual).toMatchObject({
          x: 20,
          y: 20,
          width: axis === 'height' ? 300 : 560,
          height: 219
        })
        if (!actual) throw new Error('Missing imported Note')
        expect(noteBody(graph, actual)).toMatchObject({
          x: 24,
          y: 24,
          width: actual.width - 48,
          height: 171,
          text: note.content
        })
        const output = writePenDocument(graph)
        expect(output.children[0].children?.[0]).toMatchObject(
          document.children[0].children?.[0] ?? {}
        )
        document = output
      }
    })
  }
}

test('root Fill fallback stays authored while the Note minimum and content determine its body', async () => {
  const document: PenDocument = {
    version: '2.22',
    children: [{ ...note, width: 'fill_container(200)', height: 'fill_container(550)' }]
  }
  const graph = await open(document)
  const actual = graph.getNode('note')
  expect(actual).toMatchObject({ width: 250, height: 219 })
  if (!actual) throw new Error('Missing root Note')
  expect(noteOfNode(actual)).toEqual({
    width: 'fill_container(200)',
    height: 'fill_container(550)'
  })
  expect(writePenDocument(graph).children[0]).toMatchObject(document.children[0])
})

test('Fill width follows parent resize while Fill height keeps vertical sibling allocation intrinsic', async () => {
  const lines =
    'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight\nNine\nTen\nEleven\nTwelve\nThirteen\nFourteen'
  const graph = await open(
    frame('vertical', [
      { ...note, content: lines, width: 'fill_container', height: 'fill_container' },
      { ...note, id: 'second', width: 'fill_container', height: 'fill_container' }
    ])
  )
  expect(graph.getNode('note')).toMatchObject({ x: 20, y: 20, width: 560, height: 356 })
  expect(graph.getNode('second')).toMatchObject({ x: 20, y: 376, width: 560, height: 219 })
  graph.updateNode('frame', { width: 800, height: 800 })
  computeAllLayouts(graph)
  expect(graph.getNode('note')).toMatchObject({ width: 760, height: 356 })
  expect(graph.getNode('second')).toMatchObject({ y: 376, width: 760, height: 219 })
})

test('horizontal Fill Notes share width and retain their native minimum when they overflow', async () => {
  const graph = await open(
    frame('horizontal', [
      { ...note, width: 'fill_container' },
      { ...note, id: 'second', width: 'fill_container', height: 'fill_container' }
    ])
  )
  expect(graph.getNode('note')).toMatchObject({ x: 20, y: 20, width: 280, height: 219 })
  expect(graph.getNode('second')).toMatchObject({ x: 300, y: 20, width: 280, height: 219 })
  graph.updateNode('frame', { width: 400 })
  computeAllLayouts(graph)
  expect(graph.getNode('note')).toMatchObject({ x: 20, width: 250, height: 219 })
  expect(graph.getNode('second')).toMatchObject({ x: 270, width: 250, height: 219 })
})

for (const layout of ['horizontal', 'vertical'] as const) {
  test(`Note Fill height preserves ${layout} parent centering`, async () => {
    const document = frame(layout, [{ ...note, height: 'fill_container' }])
    document.children[0] = {
      ...document.children[0],
      ...(layout === 'horizontal' ? { alignItems: 'center' } : { justifyContent: 'center' })
    }
    const graph = await open(document)
    expect(graph.getNode('note')).toMatchObject({ x: 20, y: 140.5, width: 300, height: 219 })
  })
}
