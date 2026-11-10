import type { NumericNodeProperty } from '@open-pencil/scene-graph'

import type { SizeLimitProp } from '#vue/controls/layout/axis'

import type { LayoutActionsContext } from './context'
export function createPropertyActions({ editor, node, preview }: LayoutActionsContext) {
  function updateProp(key: NumericNodeProperty, value: number) {
    if (node.value) preview.update([node.value.id], { [key]: value }, `Change ${key}`)
  }

  function updateSizeLimit(prop: SizeLimitProp, value: number) {
    if (!node.value) return
    preview.update([node.value.id], { [prop]: value }, `Change ${prop}`)
  }

  function setSizeLimitToCurrent(prop: SizeLimitProp) {
    const n = node.value
    if (!n) return
    const value = prop === 'minWidth' || prop === 'maxWidth' ? n.width : n.height
    editor.updateNodeWithUndo(n.id, { [prop]: Math.round(value) }, `Set ${prop}`)
  }

  function commitSizeLimit(_prop: SizeLimitProp, _value: number, _previous: number) {
    preview.commit()
  }

  function addSizeLimit(prop: SizeLimitProp) {
    const n = node.value
    if (!n) return
    const fallback = prop === 'minWidth' || prop === 'maxWidth' ? n.width : n.height
    editor.updateNodeWithUndo(n.id, { [prop]: Math.round(fallback) }, `Add ${prop}`)
  }

  function removeSizeLimit(prop: SizeLimitProp) {
    if (!node.value) return
    editor.updateNodeWithUndo(node.value.id, { [prop]: null }, `Remove ${prop}`)
  }

  function commitProp(_key: NumericNodeProperty, _value: number, _previous: number) {
    preview.commit()
  }
  return {
    updateProp,
    updateSizeLimit,
    setSizeLimitToCurrent,
    commitSizeLimit,
    addSizeLimit,
    removeSizeLimit,
    commitProp
  }
}
