import { selectedTopLevelGuideFrameId } from '#vue/canvas/guides/input'
import { handlePenDragMove, updatePenHover } from '#vue/canvas/pen/input'
import { handlePencilDragMove } from '#vue/canvas/pencil/input'
import { handleBendHandleMove, updateNodeEditHover } from '#vue/canvas/vector-input/input'
import { attachModifiers, handleConnectorDrawMove } from '#vue/shared/input/connector/draw'
import { handleDrawMove } from '#vue/shared/input/draw'
import { handleMoveMove } from '#vue/shared/input/move/drag'
import { applyResize } from '#vue/shared/input/resize'
import { updateHoverCursor } from '#vue/shared/input/select'
import { applyStickyScale } from '#vue/shared/input/sticky/scale'
import type { DragState } from '#vue/shared/input/types'
import { handleNodeEditMarqueeMove, handleNodeEditMove } from '#vue/shared/input/vector'

import { autoLayoutHoverAt, hoverDeep, shapeHandleHoverAt } from './measurement'
import type { CanvasInputState, InputCoordinates } from './state'

type TransformDrag = Extract<
  DragState,
  { type: 'rotate' | 'move' | 'text-select' | 'resize' | 'scale' | 'sticky-scale' }
>
type PathDrag = Extract<
  DragState,
  {
    type: 'pen-drag' | 'pencil-drag' | 'edit-node' | 'edit-handle' | 'bend-handle' | 'edit-marquee'
  }
>
type DrawingDrag = Extract<
  DragState,
  {
    type:
      | 'draw'
      | 'sticky-draw'
      | 'connector-draw'
      | 'connector-end'
      | 'connector-line'
      | 'line-end'
  }
>

function isTransformDrag(d: DragState): d is TransformDrag {
  return (
    d.type === 'rotate' ||
    d.type === 'move' ||
    d.type === 'text-select' ||
    d.type === 'resize' ||
    d.type === 'scale' ||
    d.type === 'sticky-scale'
  )
}

function isPathDrag(d: DragState): d is PathDrag {
  return (
    d.type === 'pen-drag' ||
    d.type === 'pencil-drag' ||
    d.type === 'edit-node' ||
    d.type === 'edit-handle' ||
    d.type === 'bend-handle' ||
    d.type === 'edit-marquee'
  )
}

function isDrawingDrag(d: DragState): d is DrawingDrag {
  return (
    d.type === 'draw' ||
    d.type === 'sticky-draw' ||
    d.type === 'connector-draw' ||
    d.type === 'connector-end' ||
    d.type === 'connector-line' ||
    d.type === 'line-end'
  )
}

function moveTransform(s: CanvasInputState, d: TransformDrag, e: MouseEvent, p: InputCoordinates) {
  const { editor } = s.options
  if (d.type === 'rotate') s.transformInput.handleRotateMove(d, p.cx, p.cy, e.shiftKey)
  else if (d.type === 'move')
    handleMoveMove(d, p.cx, p.cy, p.sx, p.sy, editor, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
  else if (d.type === 'text-select') s.transformInput.handleTextSelectMove(p.cx, p.cy)
  else if (d.type === 'resize') applyResize(d, p.cx, p.cy, e.shiftKey, editor, e.ctrlKey)
  else if (d.type === 'scale') d.move(p.cx, p.cy)
  else applyStickyScale(d, p.cx, p.cy, editor)
}

function movePath(s: CanvasInputState, d: PathDrag, e: MouseEvent, p: InputCoordinates) {
  const { editor } = s.options
  if (d.type === 'pen-drag') handlePenDragMove(d, p.cx, p.cy, s.spaceHeld.value, e, editor)
  else if (d.type === 'pencil-drag') handlePencilDragMove(p.cx, p.cy, e.shiftKey, editor)
  else if (d.type === 'edit-node' || d.type === 'edit-handle')
    handleNodeEditMove(
      d,
      p.cx,
      p.cy,
      editor,
      e.altKey,
      e.metaKey || e.ctrlKey,
      e.shiftKey,
      e.ctrlKey
    )
  else if (d.type === 'bend-handle') handleBendHandleMove(d, p.cx, p.cy, e, editor)
  else handleNodeEditMarqueeMove(d, p.cx, p.cy, editor)
}

function moveDrawing(s: CanvasInputState, d: DrawingDrag, e: MouseEvent, p: InputCoordinates) {
  const { editor } = s.options
  if (d.type === 'draw') handleDrawMove(d, p.cx, p.cy, e.shiftKey)
  else if (d.type === 'sticky-draw') d.move(p.cx, p.cy)
  else if (d.type === 'connector-draw')
    handleConnectorDrawMove(d, p.cx, p.cy, p.sx, p.sy, editor, attachModifiers(e))
  else if (d.type === 'connector-end') editor.connectorEndpointDrag(p.cx, p.cy, attachModifiers(e))
  else if (d.type === 'connector-line') editor.connectorLineDrag(p.cx, p.cy)
  else editor.lineEndDrag(p.cx, p.cy, { shift: e.shiftKey, alt: e.altKey })
}

function moveGuide(
  s: CanvasInputState,
  d: Extract<DragState, { type: 'guide' }>,
  e: MouseEvent,
  p: InputCoordinates
) {
  const frameId = e.altKey && !d.guideId ? selectedTopLevelGuideFrameId(s.options.editor) : null
  s.guideInput.handleMove(
    d,
    p.sx,
    p.sy,
    p.cx,
    p.cy,
    frameId ? { frameId, deep: e.metaKey || e.ctrlKey } : undefined
  )
}

function updateSelectionHover(s: CanvasInputState, e: MouseEvent, p: InputCoordinates) {
  const { editor } = s.options
  if (s.drag.value) return
  if (editor.state.activeTool !== 'SELECT' && editor.state.activeTool !== 'SCALE') return
  const guideCursor = editor.state.readOnly ? null : s.guideInput.updateHover(p.sx, p.sy)
  s.cursorOverride.value =
    guideCursor ??
    updateHoverCursor(
      p.cx,
      p.cy,
      editor,
      s.pointer.hitFns,
      editor.state.measurementMode === 'deep' || hoverDeep(s, e)
    )
  editor.setAutoLayoutHover(autoLayoutHoverAt(s, p.cx, p.cy, editor.state.measurementMode))
}

function updateIdleHover(s: CanvasInputState, e: MouseEvent, p: InputCoordinates) {
  const { editor } = s.options
  if (!s.drag.value) updatePenHover(p.cx, p.cy, editor)
  if (!s.drag.value) {
    updateNodeEditHover(editor, p.cx, p.cy)
    editor.setShapeHandleHover(shapeHandleHoverAt(s, p.sx, p.sy, e.altKey))
  }
  if (!s.drag.value && editor.state.activeTool === 'CONNECTOR')
    editor.connectorHover(p.cx, p.cy, attachModifiers(e))
  updateSelectionHover(s, e, p)
}

function moveActiveDrag(s: CanvasInputState, e: MouseEvent, d: DragState) {
  if (d.type === 'pan') {
    s.transformInput.handlePanMove(d, e)
    return
  }
  const p = s.pointer.getCoords(e)
  if (d.type === 'gradient' || d.type === 'shape-handle') {
    d.update(p.sx, p.sy, e.shiftKey)
    return
  }
  if (d.type === 'guide') {
    moveGuide(s, d, e, p)
    return
  }
  if (isTransformDrag(d)) {
    moveTransform(s, d, e, p)
    return
  }
  if (isPathDrag(d)) {
    movePath(s, d, e, p)
    return
  }
  if (isDrawingDrag(d)) {
    moveDrawing(s, d, e, p)
    return
  }
  s.transformInput.handleMarqueeMove(d, p.cx, p.cy)
}

export function onMouseMove(s: CanvasInputState, e: MouseEvent) {
  const { editor, isEnabled, onCursorMove } = s.options
  if (!isEnabled()) return
  s.pointerInside.value = true
  const coords = s.pointer.getCoords(e)
  s.lastPointer.value = { cx: coords.cx, cy: coords.cy, sx: coords.sx, sy: coords.sy }
  onCursorMove?.(coords.cx, coords.cy)
  if (editor.state.play && !s.drag.value) return
  updateIdleHover(s, e, coords)
  if (s.drag.value) moveActiveDrag(s, e, s.drag.value)
}
