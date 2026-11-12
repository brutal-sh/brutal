import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { getWorldMatrix } from '@open-pencil/scene-graph/coordinate'
import Matrix from '@open-pencil/scene-graph/matrix'

const SCENARIOS = [
  { name: 'rotated', outer: 0, inner: 31, flipX: false, flipY: false },
  { name: 'reflected', outer: 0, inner: 0, flipX: true, flipY: false },
  { name: 'nested transforms', outer: 37, inner: -21, flipX: true, flipY: true }
] as const

function setup(scenario: (typeof SCENARIOS)[number]) {
  const editor = createEditor()
  const { graph } = editor
  const outer = graph.createNode('FRAME', editor.state.currentPageId, {
    x: 320,
    y: 180,
    width: 600,
    height: 400,
    rotation: scenario.outer,
    flipY: scenario.flipY
  })
  const parent = graph.createNode('FRAME', outer.id, {
    x: 60,
    y: 40,
    width: 300,
    height: 240,
    rotation: scenario.inner,
    flipX: scenario.flipX
  })
  const before = graph.createNode('RECTANGLE', parent.id, { x: 2, y: 3, width: 10, height: 12 })
  const first = graph.createNode('FRAME', parent.id, {
    x: 20,
    y: 30,
    width: 64,
    height: 44,
    rotation: 45,
    flipX: true
  })
  const child = graph.createNode('RECTANGLE', first.id, { x: 8, y: 9, width: 20, height: 10 })
  const middle = graph.createNode('RECTANGLE', parent.id, { x: 90, y: 8, width: 14, height: 11 })
  const second = graph.createNode('RECTANGLE', parent.id, {
    x: 130,
    y: 100,
    width: 36,
    height: 52,
    rotation: -29,
    flipY: true
  })
  const after = graph.createNode('RECTANGLE', parent.id, { x: 200, y: 190, width: 18, height: 16 })
  const nodes = [outer, parent, before, first, child, middle, second, after]
  const positions = new Map(nodes.map((node) => [node.id, corners(graph, node.id)]))
  editor.select([second.id, first.id])
  return { editor, parent, first, second, before, middle, after, positions }
}

function corners(graph: SceneGraph, id: string) {
  const node = expectDefined(graph.getNode(id), id)
  return Matrix.mapPoints(getWorldMatrix(node, graph), [
    0,
    0,
    node.width,
    0,
    node.width,
    node.height,
    0,
    node.height
  ])
}

function expectPositions(graph: SceneGraph, positions: Map<string, number[]>) {
  for (const [id, expected] of positions) {
    const actual = corners(graph, id)
    expect(actual).toHaveLength(expected.length)
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 6))
  }
}

async function reopen(graph: SceneGraph) {
  const io = new IORegistry([penFormat])
  const saved = await io.writeDocument('pen', graph)
  if (typeof saved.data !== 'string') throw new Error('Expected a text Pen document')
  return (
    await io.readDocument({ name: 'wrapped.pen', data: new TextEncoder().encode(saved.data) })
  ).graph
}

for (const scenario of SCENARIOS) {
  for (const kind of ['group', 'frame'] as const) {
    test(`${kind} wrapping preserves corners, history and reopening under ${scenario.name}`, async () => {
      const { editor, parent, first, second, positions } = setup(scenario)
      try {
        const originalOrder = [...parent.childIds]
        if (kind === 'group') editor.groupSelected()
        else editor.frameSelection()
        const wrapperId = expectDefined([...editor.state.selectedIds][0], 'wrapper')
        const wrappedOrder = [...parent.childIds]
        expectPositions(editor.graph, positions)
        expect(editor.graph.getNode(wrapperId)?.childIds).toEqual([first.id, second.id])
        for (const _ of [0, 1]) {
          editor.undoAction()
          expectPositions(editor.graph, positions)
          expect(parent.childIds).toEqual(originalOrder)
          expect(editor.graph.getNode(wrapperId)).toBeUndefined()
          editor.redoAction()
          expectPositions(editor.graph, positions)
          expect(editor.graph.getNode(wrapperId)?.childIds).toEqual([first.id, second.id])
        }
        const reopened = await reopen(editor.graph)
        expectPositions(reopened, positions)
        expect(reopened.getNode(parent.id)?.childIds).toEqual(wrappedOrder)
        expect(reopened.getNode(wrapperId)?.childIds).toEqual([first.id, second.id])
      } finally {
        editor.dispose()
      }
    })
  }

  test(`ungroup preserves corners, stack and history under ${scenario.name}`, () => {
    const { editor, parent, first, second, before, middle, after, positions } = setup(scenario)
    try {
      editor.groupSelected()
      const wrapperId = expectDefined([...editor.state.selectedIds][0], 'wrapper')
      const groupedOrder = [...parent.childIds]
      editor.ungroupSelected()
      expectPositions(editor.graph, positions)
      expect(parent.childIds).toEqual([before.id, middle.id, first.id, second.id, after.id])
      editor.undoAction()
      expectPositions(editor.graph, positions)
      expect(parent.childIds).toEqual(groupedOrder)
      expect(editor.graph.getNode(wrapperId)?.childIds).toEqual([first.id, second.id])
      editor.redoAction()
      expectPositions(editor.graph, positions)
      expect(parent.childIds).toEqual([before.id, middle.id, first.id, second.id, after.id])
      expect(editor.graph.getNode(wrapperId)).toBeUndefined()
    } finally {
      editor.dispose()
    }
  })
}
