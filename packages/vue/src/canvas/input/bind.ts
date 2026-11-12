import { useEventListener } from '@vueuse/core'
import { onScopeDispose } from 'vue'

import { setupPanZoom } from '#vue/shared/input/pan/zoom'

import { cancelPointerInteraction, onMouseUp } from './finish'
import { bindEscape, bindModifierKeys, bindSpaceKeys } from './keyboard'
import { resetMeasurementModifiers } from './measurement'
import { onMouseMove } from './move'
import { onDblClick, onMouseDown } from './press'
import type { CanvasInputState } from './state'

function onPointerDown(s: CanvasInputState, e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  s.options.canvasRef.value?.setPointerCapture(e.pointerId)
}

function releasePointer(s: CanvasInputState, e: PointerEvent) {
  if (s.options.canvasRef.value?.hasPointerCapture(e.pointerId))
    s.options.canvasRef.value.releasePointerCapture(e.pointerId)
}

function onPointerUp(s: CanvasInputState, e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  onMouseUp(s)
  releasePointer(s, e)
}

function onPointerCancel(s: CanvasInputState, e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  cancelPointerInteraction(s)
  releasePointer(s, e)
}

function onMouseLeave(s: CanvasInputState) {
  const { editor, isEnabled } = s.options
  s.pointerInside.value = false
  if (!isEnabled()) return
  editor.setMeasurementMode('off')
  if (!s.drag.value) {
    editor.setHoveredNode(null)
    editor.setHoveredGuide(null)
    editor.setShapeHandleHover(null)
  }
}

function bindEditorLifecycle(s: CanvasInputState) {
  const { editor, isEnabled } = s.options
  const stopRotation = editor.onEditorEvent('rotation:preview-changed', (preview) => {
    if (s.drag.value?.type === 'rotate' && preview?.nodeId !== s.drag.value.nodeId)
      cancelPointerInteraction(s)
  })
  const stopTool = editor.onEditorEvent('tool:changed', () => {
    if (!isEnabled()) return
    editor.setMeasurementMode('off')
    cancelPointerInteraction(s)
  })
  const stopReadOnly = editor.onEditorEvent('document:read-only-changed', (readOnly) => {
    if (!readOnly) return
    s.valueEdit.cancel()
    s.canvasLabelEdit.cancel()
    cancelPointerInteraction(s)
  })
  const stopPlay = (['selection:changed', 'page:changed', 'graph:replaced'] as const).map((event) =>
    editor.onEditorEvent(event, () => {
      const type = s.drag.value?.type
      if (
        type === 'draw' ||
        type === 'sticky-draw' ||
        type === 'rotate' ||
        type === 'shape-handle' ||
        type === 'scale' ||
        type === 'sticky-scale'
      )
        cancelPointerInteraction(s)
    })
  )
  onScopeDispose(() => {
    stopRotation()
    stopTool()
    stopReadOnly()
    for (const stop of stopPlay) stop()
    cancelPointerInteraction(s)
  })
}

function publicActions(s: CanvasInputState) {
  return {
    drag: s.drag,
    cursorOverride: s.cursorOverride,
    canvasLabelEdit: s.canvasLabelEdit.edit,
    updateCanvasLabelEdit: s.canvasLabelEdit.update,
    commitCanvasLabelEdit: s.canvasLabelEdit.commit,
    cancelCanvasLabelEdit: s.canvasLabelEdit.cancel,
    autoLayoutValueEdit: s.valueEdit.edit,
    updateAutoLayoutValueEdit: s.valueEdit.update,
    commitAutoLayoutValueEdit: s.valueEdit.commit,
    cancelAutoLayoutValueEdit: s.valueEdit.cancel,
    cleanupInteractions() {
      s.valueEdit.cancel()
      cancelPointerInteraction(s)
      s.pointerInside.value = false
      resetMeasurementModifiers(s)
    }
  }
}

export function bindCanvasInput(s: CanvasInputState) {
  const { canvasRef, editor, zoomSpeed } = s.options
  const down = (e: MouseEvent) => onMouseDown(s, e)
  const move = (e: MouseEvent) => onMouseMove(s, e)
  const up = () => onMouseUp(s)
  useEventListener(canvasRef, 'pointerdown', (e) => onPointerDown(s, e))
  useEventListener(canvasRef, 'pointerup', (e) => onPointerUp(s, e))
  useEventListener(canvasRef, 'pointercancel', (e) => onPointerCancel(s, e))
  useEventListener(canvasRef, 'dblclick', (e) => onDblClick(s, e))
  useEventListener(canvasRef, 'mousedown', down)
  useEventListener(canvasRef, 'mousemove', move)
  useEventListener(canvasRef, 'mouseup', up)
  bindModifierKeys(s)
  bindEscape(s)
  bindSpaceKeys(s)
  useEventListener(window, 'blur', () => {
    resetMeasurementModifiers(s)
    cancelPointerInteraction(s)
  })
  useEventListener(canvasRef, 'mouseleave', () => onMouseLeave(s))
  useEventListener(
    window,
    'mouseup',
    () => {
      if (s.drag.value) up()
    },
    { capture: true }
  )
  bindEditorLifecycle(s)
  setupPanZoom(canvasRef, editor, s.drag, down, move, up, zoomSpeed)
  return publicActions(s)
}
