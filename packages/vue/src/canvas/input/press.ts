import { handleToolMouseDown } from '#vue/canvas/tools/input'

import { setInputDrag, type CanvasInputState, type InputCoordinates } from './state'

export function onDblClick(s: CanvasInputState, e: MouseEvent) {
  if (s.options.editor.state.play) return
  const { cx, cy } = s.pointer.getCoords(e)
  if (!s.options.editor.state.readOnly && s.valueEdit.start(cx, cy)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  s.textInput.onDblClick(e)
}

function startGuide(s: CanvasInputState, e: MouseEvent, p: InputCoordinates) {
  if (e.button !== 0 || s.options.editor.state.readOnly) return false
  if (s.guideInput.tryStartExisting(p.sx, p.sy, e.altKey)) {
    e.preventDefault()
    return true
  }
  if (s.guideInput.tryStartFromRuler(p.sx, p.sy, p.cx, p.cy)) {
    e.preventDefault()
    return true
  }
  return false
}

function preparePress(s: CanvasInputState, e: MouseEvent) {
  const { editor, onActivate, isEnabled, canvasRef } = s.options
  onActivate?.()
  if (!isEnabled()) return false
  if (editor.state.play && e.button === 0 && editor.state.activeTool !== 'HAND') {
    e.preventDefault()
    return false
  }
  // Safari otherwise starts text selection and freezes the canvas cursor during drags.
  if (e.button === 0) e.preventDefault()
  editor.setMeasurementMode('off')
  const openValueEdit = s.valueEdit.edit.value
  if (openValueEdit) s.valueEdit.commit(openValueEdit.value)
  if (!editor.state.editingTextId) canvasRef.value?.focus()
  editor.setHoveredNode(null)
  return true
}

export function onMouseDown(s: CanvasInputState, e: MouseEvent) {
  if (!preparePress(s, e)) return
  const { editor } = s.options
  const { sx, sy, cx, cy } = s.pointer.getCoords(e)
  if (startGuide(s, e, { sx, sy, cx, cy })) return
  editor.setSelectedGuide(null)
  const selectedIdsBeforeMouseDown = new Set(editor.state.selectedIds)
  const clickCount = s.clicks.recordClick(sx, sy)
  if (clickCount === 1) s.selectedIdsBeforeClickSequence.value = selectedIdsBeforeMouseDown
  handleToolMouseDown({
    event: e,
    cx,
    cy,
    sx,
    sy,
    editor,
    hitFns: s.pointer.hitFns,
    cursorOverride: s.cursorOverride,
    setDrag: (drag) => setInputDrag(s, drag),
    tryStartRotation: s.transformInput.tryStartRotation,
    handleTextEditClick: s.textInput.handleTextEditClick
  })
}
