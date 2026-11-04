import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { authoredLayoutSizing } from '@open-pencil/scene-graph/layout'

for (const [type, width, height, positions, mode, gap, size] of [
  [
    'RECTANGLE',
    80,
    60,
    [
      [0, 0],
      [0, 100]
    ],
    'VERTICAL',
    40,
    [80, 160]
  ],
  [
    'FRAME',
    160,
    80,
    [
      [0, 0],
      [0, 100]
    ],
    'VERTICAL',
    20,
    [160, 180]
  ],
  [
    'RECTANGLE',
    80,
    60,
    [
      [0, 0],
      [120, 0]
    ],
    'HORIZONTAL',
    40,
    [200, 60]
  ],
  [
    'RECTANGLE',
    80,
    300,
    [
      [0, 0],
      [120, 0]
    ],
    'HORIZONTAL',
    40,
    [200, 300]
  ],
  [
    'RECTANGLE',
    80,
    60,
    [
      [0, 0],
      [0, 100],
      [0, 300]
    ],
    'VERTICAL',
    90,
    [80, 360]
  ]
] as const) {
  test(`spacing-aware wrap of ${positions.length} ${width}x${height} ${type}s in ${mode}`, () => {
    const editor = createEditor()
    try {
      const pageId = editor.state.currentPageId
      const nodes = positions.map(([x, y]) =>
        editor.graph.createNode(type, pageId, { x, y, width, height })
      )
      const before = nodes.map((node) => ({ ...node, childIds: [...node.childIds] }))
      const order = [...expectDefined(editor.graph.getNode(pageId), 'page').childIds]
      editor.select(nodes.toReversed().map((node) => node.id))
      const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
      const wrapper = expectDefined(editor.graph.getNode(id), 'wrapper')
      expect(wrapper).toMatchObject({
        name: 'Frame 1',
        width: size[0],
        height: size[1],
        layoutMode: mode,
        itemSpacing: gap,
        primaryAxisSizing: 'HUG',
        counterAxisSizing: 'FIXED',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        fills: []
      })
      expect(wrapper.childIds).toEqual(nodes.map((node) => node.id))
      expect(
        nodes.map((node) =>
          authoredLayoutSizing(editor.graph, node, mode === 'VERTICAL' ? 'HORIZONTAL' : 'VERTICAL')
        )
      ).toEqual(nodes.map(() => 'FILL'))
      const wrapped = nodes.map((node) => ({
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      }))
      for (let cycle = 0; cycle < 2; cycle++) {
        editor.undoAction()
        expect(editor.state.selectedIds.size).toBe(0)
        expect(editor.graph.getNode(id)).toBeUndefined()
        expect(editor.graph.getNode(pageId)?.childIds).toEqual(order)
        expect(nodes).toEqual(before)
        expect(editor.undo.canUndo).toBe(false)
        editor.redoAction()
        expect(editor.state.selectedIds).toEqual(new Set([id]))
        expect(editor.graph.getNode(id)).toMatchObject({ name: 'Frame 1', itemSpacing: gap })
        expect(
          nodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height }))
        ).toEqual(wrapped)
      }
    } finally {
      editor.dispose()
    }
  })
}

test('offset or unequal cross-axis bounds keep fixed children in a wrapper that hugs both axes', () => {
  for (const fields of [
    [
      { x: 0, y: 0, width: 40, height: 60 },
      { x: 0, y: 100, width: 80, height: 60 }
    ],
    [
      { x: 0, y: 20, width: 80, height: 60 },
      { x: 120, y: 0, width: 80, height: 60 }
    ]
  ]) {
    const editor = createEditor()
    try {
      const nodes = fields.map((f) =>
        editor.graph.createNode('RECTANGLE', editor.state.currentPageId, f)
      )
      editor.select(nodes.map((node) => node.id))
      const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
      const wrapper = expectDefined(editor.graph.getNode(id), 'wrapper')
      expect(wrapper).toMatchObject({
        primaryAxisSizing: 'HUG',
        counterAxisSizing: 'HUG',
        itemSpacing: 40
      })
      expect(nodes.map((n) => [n.width, n.height])).toEqual(fields.map((f) => [f.width, f.height]))
      expect(
        nodes.every(
          (n) =>
            authoredLayoutSizing(
              editor.graph,
              n,
              wrapper.layoutMode === 'VERTICAL' ? 'HORIZONTAL' : 'VERTICAL'
            ) === 'FIXED'
        )
      ).toBe(true)
      expect([wrapper.width, wrapper.height]).toEqual(
        wrapper.layoutMode === 'VERTICAL' ? [80, 160] : [200, 60]
      )
    } finally {
      editor.dispose()
    }
  }
})

test('wrapping unequal Hug frames retains their own content sizing', () => {
  const editor = createEditor()
  try {
    const nodes = [40, 80].map((width, i) => {
      const node = editor.graph.createNode('FRAME', editor.state.currentPageId, {
        y: i * 100,
        width,
        height: 60,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizing: 'HUG'
      })
      editor.graph.createNode('RECTANGLE', node.id, { width, height: 60 })
      return node
    })
    editor.select(nodes.map((n) => n.id))
    const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
    expect(editor.graph.getNode(id)).toMatchObject({
      width: 80,
      height: 160,
      itemSpacing: 40,
      counterAxisSizing: 'HUG'
    })
    expect(
      nodes.map((n) => [n.width, n.height, authoredLayoutSizing(editor.graph, n, 'HORIZONTAL')])
    ).toEqual([
      [40, 60, 'HUG'],
      [80, 60, 'HUG']
    ])
    editor.undoAction()
    editor.redoAction()
    expect(
      nodes.map((n) => [n.width, n.height, authoredLayoutSizing(editor.graph, n, 'HORIZONTAL')])
    ).toEqual([
      [40, 60, 'HUG'],
      [80, 60, 'HUG']
    ])
  } finally {
    editor.dispose()
  }
})
