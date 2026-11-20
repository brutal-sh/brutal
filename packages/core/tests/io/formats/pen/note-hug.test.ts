import { expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@open-pencil/core/io'
import { writePenDocument, type PenDocument, type PenNode } from '@open-pencil/pen'

import { computeAllLayouts } from '#core/layout'

const io = new IORegistry([penFormat])
const short: PenNode = {
  id: 'first',
  type: 'note',
  width: 300,
  height: 'fill_container',
  content: 'Fill sizing'
}

test('Note Hug correction preserves wrapped Yoga rows', async () => {
  const { graph } = await io.readDocument({
    name: 'wrapped-notes.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'frame',
            type: 'frame',
            width: 300,
            height: 'fit_content(500)',
            padding: 20,
            children: [
              short,
              { ...rectangle, width: 200 },
              { ...rectangle, id: 'last', width: 200 }
            ]
          }
        ]
      })
    )
  })
  graph.updateNode('frame', { layoutWrap: 'WRAP' })
  computeAllLayouts(graph)
  expect(graph.getNode('frame')?.height).toBe(359)
  expect(graph.getNode('rectangle')?.y).toBe(239)
  expect(graph.getNode('last')?.y).toBe(289)
})

test('a Hug ancestor uses its nested Note container height', async () => {
  const { graph } = await io.readDocument({
    name: 'nested-notes.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'outer',
            type: 'frame',
            layout: 'vertical',
            width: 650,
            padding: 10,
            children: [
              {
                id: 'inner',
                type: 'frame',
                layout: 'vertical',
                width: 600,
                padding: 20,
                children: [long, { ...second, height: 219 }]
              }
            ]
          }
        ]
      })
    )
  })
  expect(graph.getNode('outer')?.height).toBe(279)
  expect(graph.getNode('inner')).toMatchObject({ x: 10, y: 10, height: 259 })
  expect(graph.getNode('second')).toMatchObject({ y: 376, height: 219 })
})
const long: PenNode = {
  ...short,
  width: 'fill_container',
  content:
    'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight\nNine\nTen\nEleven\nTwelve\nThirteen\nFourteen'
}
const second: PenNode = {
  ...short,
  id: 'second',
  width: 'fill_container',
  content: 'Vertical sibling'
}
const rectangle: PenNode = {
  id: 'rectangle',
  type: 'rectangle',
  width: 100,
  height: 50,
  fill: '#99CCEE'
}

const cases: Array<{
  name: string
  frame: Partial<PenNode>
  children: PenNode[]
  height: number
  firstY: number
  secondY?: number
}> = [
  { name: 'row all Fill', frame: {}, children: [short], height: 500, firstY: 20 },
  {
    name: 'row mixed fixed rectangle',
    frame: {},
    children: [short, rectangle],
    height: 90,
    firstY: 20
  },
  {
    name: 'column all Fill',
    frame: { layout: 'vertical' },
    children: [long, second],
    height: 500,
    firstY: 20,
    secondY: 376
  },
  {
    name: 'column zero fallback',
    frame: { layout: 'vertical', height: 'fit_content(0)' },
    children: [long, second],
    height: 0,
    firstY: 20,
    secondY: 376
  },
  {
    name: 'column small fallback centered',
    frame: { layout: 'vertical', height: 'fit_content(20)', justifyContent: 'center' },
    children: [long, second],
    height: 20,
    firstY: -277.5,
    secondY: 78.5
  },
  {
    name: 'column mixed fixed Note',
    frame: { layout: 'vertical' },
    children: [long, { ...second, height: 219 }],
    height: 259,
    firstY: 20,
    secondY: 376
  },
  {
    name: 'column all fixed Notes',
    frame: { layout: 'vertical' },
    children: [
      { ...long, height: 219 },
      { ...second, height: 219 }
    ],
    height: 615,
    firstY: 20,
    secondY: 376
  },
  {
    name: 'row fixed Note',
    frame: {},
    children: [{ ...short, height: 219 }],
    height: 259,
    firstY: 20
  },
  {
    name: 'row mixed centered',
    frame: { alignItems: 'center' },
    children: [short, rectangle],
    height: 90,
    firstY: -64.5
  },
  {
    name: 'column mixed centered gap',
    frame: { layout: 'vertical', gap: 12, justifyContent: 'center' },
    children: [long, { ...second, height: 219 }],
    height: 259,
    firstY: -164,
    secondY: 204
  }
]

for (const control of cases) {
  test(`Note Hug ${control.name} matches Pen 1.2.22 through Brutal reopens`, async () => {
    let document: PenDocument = {
      version: '2.22',
      children: [
        {
          id: 'frame',
          type: 'frame',
          layout: 'horizontal',
          width: 600,
          height: 'fit_content(500)',
          padding: 20,
          ...control.frame,
          children: control.children
        } satisfies PenNode
      ]
    }
    for (let round = 0; round < 3; round++) {
      const { graph } = await io.readDocument({
        name: 'note-hug.pen',
        data: new TextEncoder().encode(JSON.stringify(document))
      })
      expect(graph.getNode('frame')?.height).toBe(control.height)
      expect(graph.getNode('first')).toMatchObject({
        x: 20,
        y: control.firstY,
        height: control.children[0].content === long.content ? 356 : 219
      })
      if (control.secondY !== undefined)
        expect(graph.getNode('second')).toMatchObject({ x: 20, y: control.secondY, height: 219 })
      document = writePenDocument(graph)
    }
  })
}

test('minimum height keeps padding when distributing Fill Notes', async () => {
  const { graph } = await io.readDocument({
    name: 'minimum-note-hug.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'frame',
            type: 'frame',
            layout: 'vertical',
            width: 600,
            height: 'fit_content(20)',
            padding: 20,
            justifyContent: 'space_between',
            children: [{ ...short, width: 'fill_container' }, second]
          }
        ]
      })
    )
  })
  graph.updateNode('frame', { minHeight: 1000 })
  computeAllLayouts(graph)
  expect(graph.getNode('frame')?.height).toBe(1000)
  expect(graph.getNode('first')).toMatchObject({ y: 20, height: 219 })
  expect(graph.getNode('second')).toMatchObject({ y: 761, height: 219 })
})
