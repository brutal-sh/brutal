import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { omit } from 'es-toolkit'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import type { SceneNode } from '@open-pencil/scene-graph'

function designState(node: SceneNode) {
  // Imported-file provenance remembers touched fields after Undo; the design still returns exactly.
  return structuredClone({ ...node, source: omit(node.source, ['editedFields']) })
}

async function rotatedInput() {
  const input = {
    version: '2.21',
    children: [0, 120].map((x, index) => ({
      id: `wrap-${index}`,
      type: 'rectangle',
      name: `Rotated ${index}`,
      x,
      y: 0,
      width: 80,
      height: 60,
      rotation: 90
    }))
  }
  const { graph } = await new IORegistry([penFormat]).readDocument({
    name: 'rotated-wrap.pen',
    data: new TextEncoder().encode(JSON.stringify(input))
  })
  const editor = createEditor({ graph })
  const page = expectDefined(graph.getPages()[0], 'page')
  const nodes = graph.getChildren(page.id)
  editor.select(nodes.map((node) => node.id))
  return { editor, nodes, page }
}

test('spacing-aware rotated wrap retains its initial measured extent through Undo and Redo', async () => {
  const { editor, nodes, page } = await rotatedInput()
  try {
    const unrelated = editor.graph.createNode('RECTANGLE', page.id, {
      x: 500,
      y: 300,
      width: 31,
      height: 47
    })
    const original = nodes.map(designState)
    const sibling = structuredClone(unrelated)
    const order = [...page.childIds]
    const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
    const expected = { width: 180, height: 80, itemSpacing: 60 }
    // Actual Pen 1.2.23 measures 180 x 80 at creation, before subsequent live layout edits.
    expect(editor.graph.getNode(id)).toMatchObject(expected)
    expect(editor.graph.getNode(id)?.x).toBeCloseTo(0, 8)
    expect(editor.graph.getNode(id)?.y).toBe(-80)
    for (let cycle = 0; cycle < 2; cycle++) {
      editor.undoAction()
      expect(nodes.map(designState)).toEqual(original)
      expect(page.childIds).toEqual(order)
      expect(unrelated).toEqual(sibling)
      editor.redoAction()
      expect(editor.graph.getNode(id)).toMatchObject(expected)
      expect(unrelated).toEqual(sibling)
    }
  } finally {
    editor.dispose()
  }
})

test('overlapping layers still occupy their full flow extent with a zero inferred gap', () => {
  const editor = createEditor()
  try {
    const nodes = [0, 40].map((y) =>
      editor.graph.createNode('RECTANGLE', editor.state.currentPageId, { y, width: 80, height: 60 })
    )
    editor.select(nodes.map((node) => node.id))
    const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
    expect(editor.graph.getNode(id)).toMatchObject({
      width: 80,
      height: 120,
      itemSpacing: 0,
      layoutMode: 'VERTICAL'
    })
  } finally {
    editor.dispose()
  }
})

test('a rotated wrapper and its flow ancestors share the measured extent', () => {
  const editor = createEditor()
  try {
    const parent = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'FIXED',
      height: 100,
      itemSpacing: 40
    })
    const nodes = [0, 120].map((x) =>
      editor.graph.createNode('RECTANGLE', parent.id, { x, width: 80, height: 60, rotation: 90 })
    )
    const following = editor.graph.createNode('RECTANGLE', parent.id, { width: 31, height: 47 })
    editor.runLayoutForNode(parent.id)
    editor.select(nodes.map((node) => node.id))
    const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
    expect(editor.graph.getNode(id)).toMatchObject({ width: 180, height: 80 })
    expect(parent.width).toBe(251)
    expect(following.x).toBe(220)
    editor.undoAction()
    expect(parent.width).toBe(271)
    expect(following.x).toBe(240)
    editor.redoAction()
    expect(editor.graph.getNode(id)).toMatchObject({ width: 180, height: 80 })
    expect(parent.width).toBe(251)
    expect(following.x).toBe(220)
  } finally {
    editor.dispose()
  }
})

test('a later gap edit still recalculates rotated Fill children and their Hug parent', async () => {
  const { editor } = await rotatedInput()
  try {
    const id = expectDefined(editor.wrapInAutoLayout(true), 'wrapper')
    editor.graph.updateNode(id, { itemSpacing: 61 })
    editor.runLayoutForNode(id)
    // The matched native reference recalculates to 221 x 80 after changing the gap to 61.
    expect(editor.graph.getNode(id)).toMatchObject({ width: 221, height: 80, itemSpacing: 61 })
    expect(editor.graph.getChildren(id).map(({ width, height }) => [width, height])).toEqual([
      [80, 80],
      [80, 80]
    ])
  } finally {
    editor.dispose()
  }
})

test.each([false, true])(
  'wrapping and its history leave unrelated Hug subtrees untouched (preserve spacing: %s)',
  async (preserveSpacing) => {
    const { editor, page } = await rotatedInput()
    try {
      const unrelated = editor.graph.createNode('FRAME', page.id, {
        x: 500,
        y: 300,
        width: 100,
        height: 47,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizing: 'HUG',
        counterAxisSizing: 'FIXED'
      })
      const child = editor.graph.createNode('RECTANGLE', unrelated.id, { width: 50, height: 20 })
      const before = structuredClone([unrelated, child])
      editor.wrapInAutoLayout(preserveSpacing)
      expect([unrelated, child]).toEqual(before)
      editor.undoAction()
      expect([unrelated, child]).toEqual(before)
      editor.redoAction()
      expect([unrelated, child]).toEqual(before)
    } finally {
      editor.dispose()
    }
  }
)
