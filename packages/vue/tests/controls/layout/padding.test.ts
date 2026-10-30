import { expect, test } from 'bun:test'

import { effectScope } from 'vue'

import { createEditor } from '@open-pencil/core'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

import { createPaddingActions } from '#vue/controls/layout/helpers'
import { createSelectedNodeState } from '#vue/editor/selection-state/nodes'

test.each([true, false])(
  'padding collapse preserves values, layout and leading bindings (%s) through Undo',
  (leadingBound) => {
    const editor = createEditor()
    const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
      width: 300,
      height: 100,
      layoutMode: 'HORIZONTAL',
      paddingTop: 5,
      paddingRight: 10,
      paddingBottom: 15,
      paddingLeft: 20,
      pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution, 'SPACE_AROUND')
    })
    const first = editor.graph.createNode('RECTANGLE', frame.id, { width: 30, height: 30 })
    editor.graph.createNode('RECTANGLE', frame.id, { width: 30, height: 30 })
    const collection = editor.graph.createCollection('Spacing')
    const top = editor.graph.createVariable('Top', 'FLOAT', collection.id, 2.5)
    const right = editor.graph.createVariable('Right', 'FLOAT', collection.id, 5)
    const bottom = editor.graph.createVariable('Bottom', 'FLOAT', collection.id, 5)
    const left = editor.graph.createVariable('Left', 'FLOAT', collection.id, 5)
    const bindings: Record<string, string> = {
      paddingBottom: bottom.id,
      paddingLeft: left.id
    }
    if (leadingBound) {
      bindings.paddingTop = top.id
      bindings.paddingRight = right.id
    }
    const scales: Record<string, number> = { paddingBottom: 3, paddingLeft: 4 }
    if (leadingBound) {
      scales.paddingTop = 2
      scales.paddingRight = 2
    }
    editor.graph.updateNode(frame.id, { boundVariables: bindings, variableBindingScales: scales })
    editor.runLayoutForNode(frame.id)
    editor.select([frame.id])
    const selection = createSelectedNodeState(editor)
    const scope = effectScope()
    const controls = scope.run(() => createPaddingActions(editor, selection.node))
    if (!controls) throw new Error('Padding scope unavailable')
    const sides = () => {
      const n = editor.graph.getNode(frame.id)
      if (!n) throw new Error('Padding frame unavailable')
      return [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]
    }
    const x = () => editor.graph.getNode(first.id)?.x
    try {
      expect(controls.showIndividualPadding.value).toBe(true)
      expect(x()).toBe(72.5)
      controls.toggleIndividualPadding()
      expect(sides()).toEqual([5, 10, 5, 10])
      const collapsedBindings: typeof bindings = leadingBound
        ? {
            paddingTop: top.id,
            paddingBottom: top.id,
            paddingRight: right.id,
            paddingLeft: right.id
          }
        : {}
      expect(editor.graph.getNode(frame.id)?.boundVariables).toEqual(collapsedBindings)
      expect(editor.graph.getNode(frame.id)?.variableBindingScales).toEqual(
        leadingBound ? { paddingTop: 2, paddingBottom: 2, paddingRight: 2, paddingLeft: 2 } : {}
      )
      expect(x()).toBe(65)
      expect(controls.showIndividualPadding.value).toBe(false)
      editor.undoAction()
      expect(sides()).toEqual([5, 10, 15, 20])
      expect(editor.graph.getNode(frame.id)?.boundVariables).toEqual(bindings)
      expect(editor.graph.getNode(frame.id)?.variableBindingScales).toEqual(scales)
      expect(x()).toBe(72.5)
      expect(controls.showIndividualPadding.value).toBe(true)
      editor.redoAction()
      expect(sides()).toEqual([5, 10, 5, 10])
      expect(x()).toBe(65)
      controls.toggleIndividualPadding()
      expect(controls.showIndividualPadding.value).toBe(true)
      expect(sides()).toEqual([5, 10, 5, 10])
      editor.undoAction()
      expect(controls.showIndividualPadding.value).toBe(false)
      expect(sides()).toEqual([5, 10, 5, 10])
    } finally {
      scope.stop()
      selection.dispose()
      editor.dispose()
    }
  }
)
