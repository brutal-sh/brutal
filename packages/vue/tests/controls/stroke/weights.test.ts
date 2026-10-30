import { expect, test } from 'bun:test'

import { ref } from 'vue'

import { createEditor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import {
  borderWeight,
  createStrokeSideActions,
  updateStrokeWeight
} from '#vue/controls/stroke/helpers'

function weights(node: SceneNode) {
  return structuredClone({
    strokeWeight: node.strokeWeight,
    independent: node.independentStrokeWeights,
    sides: [
      node.borderTopWeight,
      node.borderRightWeight,
      node.borderBottomWeight,
      node.borderLeftWeight
    ],
    strokes: node.strokes,
    bindings: node.boundVariables,
    scales: node.variableBindingScales
  })
}

test('common stroke weight resets paints and independent sides, with exact binding Undo', () => {
  const editor = createEditor()
  try {
    const collection = editor.graph.createCollection('Stroke variables')
    const width = editor.graph.createVariable('Width', 'FLOAT', collection.id, 6)
    const color = editor.graph.createVariable('Ink', 'COLOR', collection.id, {
      r: 1,
      g: 0,
      b: 0,
      a: 1
    })
    const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      strokeWeight: 12,
      independentStrokeWeights: true,
      borderTopWeight: 12,
      borderRightWeight: 12,
      borderBottomWeight: 12,
      borderLeftWeight: 12,
      fills: [colorToFill('#FF0000')],
      strokes: [
        { ...colorToFill('#000000'), weight: 12, align: 'INSIDE' },
        { ...colorToFill('#FFFFFF'), weight: 18, align: 'OUTSIDE' }
      ],
      boundVariables: {
        strokeWeight: width.id,
        borderTopWeight: width.id,
        'fills/0/color': color.id
      },
      variableBindingScales: { strokeWeight: 2, borderTopWeight: 2 }
    })
    const before = weights(node)
    updateStrokeWeight(editor, [node], 20)
    expect(node.strokes.map((stroke) => stroke.weight)).toEqual([20, 20])
    expect([
      node.borderTopWeight,
      node.borderRightWeight,
      node.borderBottomWeight,
      node.borderLeftWeight
    ]).toEqual([20, 20, 20, 20])
    expect(node.strokes.map((stroke) => stroke.align)).toEqual(['INSIDE', 'OUTSIDE'])
    expect(node.boundVariables).toEqual({ 'fills/0/color': color.id })
    expect(node.variableBindingScales).toEqual({})
    editor.undoAction()
    expect(weights(node)).toEqual(before)
    editor.redoAction()
    expect(node.strokeWeight).toBe(20)
    updateStrokeWeight(editor, [node], Number.NaN)
    expect(node.strokeWeight).toBe(20)
  } finally {
    editor.dispose()
  }
})

test('first independent side edit starts from the common weight and preserves other scaled bindings', () => {
  const editor = createEditor()
  try {
    const collection = editor.graph.createCollection('Stroke width')
    const width = editor.graph.createVariable('Width', 'FLOAT', collection.id, 6)
    const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      strokeWeight: 12,
      strokes: [{ ...colorToFill('#000000'), weight: 12, align: 'INSIDE' }],
      boundVariables: { strokeWeight: width.id },
      variableBindingScales: { strokeWeight: 2 }
    })
    const before = weights(node)
    expect(borderWeight([node], 'left')).toBe(12)
    const controls = createStrokeSideActions(editor, ref(false))
    controls.updateBorderWeight('left', 5, [node])
    expect(node.independentStrokeWeights).toBe(true)
    expect([
      node.borderTopWeight,
      node.borderRightWeight,
      node.borderBottomWeight,
      node.borderLeftWeight
    ]).toEqual([12, 12, 12, 5])
    expect(node.boundVariables).toEqual({
      strokeWeight: width.id,
      borderTopWeight: width.id,
      borderRightWeight: width.id,
      borderBottomWeight: width.id
    })
    expect(node.variableBindingScales).toEqual({
      strokeWeight: 2,
      borderTopWeight: 2,
      borderRightWeight: 2,
      borderBottomWeight: 2
    })
    editor.undoAction()
    expect(weights(node)).toEqual(before)
  } finally {
    editor.dispose()
  }
})
