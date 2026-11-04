import { expect, test } from 'bun:test'

import { computed, effectScope } from 'vue'

import { createEditor } from '@open-pencil/core'
import { layoutJustification } from '@open-pencil/scene-graph/layout'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

import { MIXED } from '#vue/controls/node-props/use'
import { createSelectionFlexControls } from '#vue/controls/selection-layout/helpers'
import { createSelectedNodeState } from '#vue/editor/selection-state/nodes'

test('multi-frame spacing and screen alignment preserve each frame distribution through history', () => {
  const editor = createEditor()
  const frames = (['VERTICAL', 'HORIZONTAL'] as const).map((layoutMode, i) =>
    editor.graph.createNode('FRAME', editor.state.currentPageId, {
      width: 160,
      height: 100,
      layoutMode,
      itemSpacing: i ? 10 : 8,
      pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.paddingMode, 'INDIVIDUAL')
    })
  )
  const shape = editor.graph.createNode('RECTANGLE', editor.state.currentPageId)
  editor.select([...frames.map((n) => n.id), shape.id])
  const selection = createSelectedNodeState(editor)
  const scope = effectScope()
  const controls = scope.run(() =>
    createSelectionFlexControls(
      editor,
      computed(() => selection.nodes.value.filter((n) => n.type === 'FRAME'))
    )
  )
  if (!controls) throw new Error('Selection layout unavailable')
  try {
    expect(controls.containerProp('itemSpacing')).toBe(MIXED)
    controls.updateContainers({ itemSpacing: 12.5 })
    controls.commitContainers()
    expect(frames.map((n) => n.itemSpacing)).toEqual([12.5, 12.5])
    expect(shape.itemSpacing).toBe(0)
    editor.undoAction()
    expect(frames.map((n) => n.itemSpacing)).toEqual([8, 10])
    expect(editor.undo.canUndo).toBe(false)
    editor.redoAction()
    controls.setGapDistribution('SPACE_AROUND')
    controls.setFlexAlignment(5)
    expect(frames.map(layoutJustification)).toEqual(['SPACE_AROUND', 'SPACE_AROUND'])
    expect(frames.map((n) => n.counterAxisAlign)).toEqual(['MAX', 'CENTER'])
    expect(controls.flexAlignment.value[5]).toBe(true)
    editor.undoAction()
    expect(frames.map((n) => n.counterAxisAlign)).toEqual(['MIN', 'MIN'])
    expect(frames.map(layoutJustification)).toEqual(['SPACE_AROUND', 'SPACE_AROUND'])
    editor.undoAction()
    expect(frames.map(layoutJustification)).toEqual(['MIN', 'MIN'])
  } finally {
    scope.stop()
    selection.dispose()
    editor.dispose()
  }
})

test('padding collapse retains each frame leading bindings, scales and unrelated data in one Undo', () => {
  const editor = createEditor()
  const collection = editor.graph.createCollection('Padding')
  const variable = editor.graph.createVariable('Leading', 'FLOAT', collection.id, 5)
  const frames = [0, 1].map((i) =>
    editor.graph.createNode('FRAME', editor.state.currentPageId, {
      width: 160,
      height: 100,
      layoutMode: 'VERTICAL',
      paddingTop: 5,
      paddingRight: 10,
      paddingBottom: 15,
      paddingLeft: 20,
      boundVariables: i ? { paddingRight: variable.id } : { paddingTop: variable.id },
      variableBindingScales: i ? { paddingRight: 2 } : { paddingTop: 1 },
      pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution, 'SPACE_AROUND')
    })
  )
  editor.select(frames.map((n) => n.id))
  const selection = createSelectedNodeState(editor)
  const scope = effectScope()
  const controls = scope.run(() => createSelectionFlexControls(editor, selection.nodes))
  if (!controls) throw new Error('Selection layout unavailable')
  const values = () =>
    frames.map((n) =>
      structuredClone({
        padding: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft],
        bindings: n.boundVariables,
        scales: n.variableBindingScales,
        data: n.pluginData
      })
    )
  try {
    const original = values()
    expect(controls.individualPadding.value).toBe(true)
    controls.toggleIndividualPadding()
    expect(values().map((n) => n.padding)).toEqual([
      [5, 10, 5, 10],
      [5, 10, 5, 10]
    ])
    expect(frames[0].boundVariables).toEqual({
      paddingTop: variable.id,
      paddingBottom: variable.id
    })
    expect(frames[1].boundVariables).toEqual({
      paddingRight: variable.id,
      paddingLeft: variable.id
    })
    expect(frames[1].variableBindingScales).toEqual({ paddingRight: 2, paddingLeft: 2 })
    expect(frames.map(layoutJustification)).toEqual(['SPACE_AROUND', 'SPACE_AROUND'])
    editor.undoAction()
    expect(values()).toEqual(original)
    expect(editor.undo.canUndo).toBe(false)
  } finally {
    scope.stop()
    selection.dispose()
    editor.dispose()
  }
})
