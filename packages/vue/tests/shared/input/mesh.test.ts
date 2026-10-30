import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'

import { tryStartMeshDrag } from '#vue/shared/input/mesh'
import type { DragState } from '#vue/shared/input/types'

function setup() {
  const editor = createEditor()
  const mesh = createMeshGradient()
  const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    width: 200,
    height: 100,
    fills: [
      {
        type: 'GRADIENT_MESH',
        color: { r: 0, g: 0, b: 0, a: 1 },
        visible: true,
        opacity: 1,
        meshGradient: mesh
      }
    ]
  })
  editor.state.zoom = 1
  editor.state.panX = 0
  editor.state.panY = 0
  editor.state.gradientEdit = { nodeId: node.id, paint: 'fills', index: 0, stop: 4 }
  return { editor, node, mesh }
}

for (const mirrored of [true, false]) {
  test(`mesh tangent drag with mirroring ${mirrored} commits and undoes once`, () => {
    const { editor, node, mesh } = setup()
    try {
      editor.state.gradientEdit = {
        nodeId: node.id,
        paint: 'fills',
        index: 0,
        stop: 4,
        meshMirrored: mirrored
      }
      const holder: { drag?: DragState } = {}
      expect(
        tryStartMeshDrag(editor, 125, 50, (drag) => {
          holder.drag = drag
        })
      ).toBe(true)
      if (holder.drag?.type !== 'gradient') throw new Error('Expected mesh drag')
      holder.drag.update(140, 60, false)
      holder.drag.commit()
      const changed = editor.graph.getNode(node.id)?.fills[0].meshGradient?.points[4]
      expect(changed?.rightHandle?.x).toBeCloseTo(0.2)
      expect(changed?.rightHandle?.y).toBeCloseTo(0.1)
      expect(changed?.leftHandle).toEqual(
        mirrored ? { x: -0.19999999999999996, y: -0.09999999999999998 } : undefined
      )
      editor.undoAction()
      expect(editor.graph.getNode(node.id)?.fills[0].meshGradient).toEqual(mesh)
    } finally {
      editor.dispose()
    }
  })
}

test('canceling a mesh vertex preview restores the point and selection', () => {
  const { editor, node, mesh } = setup()
  try {
    const holder: { drag?: DragState } = {}
    expect(
      tryStartMeshDrag(editor, 100, 50, (drag) => {
        holder.drag = drag
      })
    ).toBe(true)
    if (holder.drag?.type !== 'gradient') throw new Error('Expected mesh drag')
    holder.drag.update(120, 70, false)
    expect(editor.graph.getNode(node.id)?.fills[0].meshGradient?.points[4].position).toEqual({
      x: 0.6,
      y: 0.7
    })
    holder.drag.cancel()
    expect(editor.graph.getNode(node.id)?.fills[0].meshGradient).toEqual(mesh)
    expect(editor.state.gradientEdit?.stop).toBe(4)
  } finally {
    editor.dispose()
  }
})
