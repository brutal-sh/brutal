import { resolveAutoLayoutHover } from '#vue/shared/input/auto-layout-hover'
import { updateHoverCursor } from '#vue/shared/input/select'
import { resolveShapeHandleHover } from '#vue/shared/input/shape-handles'

import type { CanvasInputState } from './state'

const MODIFIER_KEYS: ReadonlyMap<string, keyof CanvasInputState['modifiers']> = new Map([
  ['AltLeft', 'altHeld'],
  ['AltRight', 'altHeld'],
  ['MetaLeft', 'metaHeld'],
  ['MetaRight', 'metaHeld'],
  ['ControlLeft', 'controlHeld'],
  ['ControlRight', 'controlHeld']
])

function canMeasure(s: CanvasInputState) {
  const { editor } = s.options
  return (
    s.pointerInside.value &&
    !s.drag.value &&
    editor.state.activeTool === 'SELECT' &&
    editor.state.selectedIds.size > 0 &&
    !editor.state.editingTextId &&
    !editor.state.nodeEditState &&
    !editor.state.penState
  )
}

export function hoverDeep(s: CanvasInputState, event?: MouseEvent) {
  return event ? event.metaKey || event.ctrlKey : s.modifiers.metaHeld || s.modifiers.controlHeld
}

export function autoLayoutHoverAt(
  s: CanvasInputState,
  cx: number,
  cy: number,
  mode: CanvasInputState['options']['editor']['state']['measurementMode']
) {
  return mode === 'off' && !s.options.editor.state.readOnly
    ? resolveAutoLayoutHover(cx, cy, s.options.editor)
    : null
}

export function shapeHandleHoverAt(s: CanvasInputState, sx: number, sy: number, altKey: boolean) {
  return s.options.editor.state.readOnly
    ? null
    : resolveShapeHandleHover(s.options.editor, sx, sy, altKey)
}

function measurementMode(s: CanvasInputState) {
  if (!s.modifiers.altHeld || !canMeasure(s)) return 'off'
  return s.modifiers.metaHeld || s.modifiers.controlHeld ? 'deep' : 'shallow'
}

export function refreshMeasurement(s: CanvasInputState) {
  const { editor } = s.options
  const mode = measurementMode(s)
  editor.setMeasurementMode(mode)
  const pointer = s.lastPointer.value
  if (!pointer || s.drag.value || editor.state.activeTool !== 'SELECT' || !s.pointerInside.value)
    return
  s.cursorOverride.value = updateHoverCursor(
    pointer.cx,
    pointer.cy,
    editor,
    s.pointer.hitFns,
    mode === 'deep' || hoverDeep(s)
  )
  editor.setAutoLayoutHover(autoLayoutHoverAt(s, pointer.cx, pointer.cy, mode))
  editor.setShapeHandleHover(shapeHandleHoverAt(s, pointer.sx, pointer.sy, s.modifiers.altHeld))
}

export function updateModifier(s: CanvasInputState, code: string, held: boolean) {
  const { isEnabled } = s.options
  if (!isEnabled()) return
  const modifier = MODIFIER_KEYS.get(code)
  if (modifier) s.modifiers[modifier] = held
  if (code.startsWith('Alt') || code.startsWith('Meta') || code.startsWith('Control'))
    refreshMeasurement(s)
}

export function resetMeasurementModifiers(s: CanvasInputState) {
  s.modifiers.altHeld = false
  s.modifiers.metaHeld = false
  s.modifiers.controlHeld = false
  s.options.editor.setMeasurementMode('off')
}
