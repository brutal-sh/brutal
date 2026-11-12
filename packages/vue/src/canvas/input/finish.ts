import { finishPencilDrag } from '#vue/canvas/pencil/input'
import { finishMarquee } from '#vue/canvas/transform/marquee'
import { cancelNodeEditDrag, handleNodeEditPointerUp } from '#vue/canvas/vector-input/input'
import { cancelMove, handleMoveUp } from '#vue/shared/input/move/drag'
import { cancelResizePreview, commitResizePreview } from '#vue/shared/input/resize'
import type { DragState } from '#vue/shared/input/types'

import { refreshMeasurement } from './measurement'
import type { CanvasInputState } from './state'

function commitRotation(s: CanvasInputState, d: Extract<DragState, { type: 'rotate' }>) {
  const { editor } = s.options
  const preview = editor.state.rotationPreview
  if (preview?.nodeId === d.nodeId && preview.angle !== d.origRotation) {
    editor.updateNode(d.nodeId, { rotation: preview.angle })
    editor.commitRotation(d.nodeId, d.origRotation)
  }
  if (editor.state.rotationPreview === preview) editor.setRotationPreview(null)
}

function commitDrag(s: CanvasInputState, d: DragState) {
  const { editor } = s.options
  if (d.type === 'guide') s.guideInput.finish(d)
  else if (d.type === 'move') handleMoveUp(d, editor)
  else if (d.type === 'resize') commitResizePreview(d, editor)
  else if (d.type === 'pencil-drag') finishPencilDrag(editor)
  else if (d.type === 'rotate') commitRotation(s, d)
  else if ('commit' in d) d.commit()
  else if (d.type === 'marquee') finishMarquee(editor, d)
}

export function onMouseUp(s: CanvasInputState) {
  if (!s.drag.value) return
  const d = s.drag.value
  if (handleNodeEditPointerUp(s.drag, s.options.editor)) return
  if (d.type === 'text-select' || d.type === 'pen-drag') {
    if (d.type === 'pen-drag' && s.options.editor.state.penState?.pendingClose)
      s.options.editor.penCommit(true)
    s.drag.value = null
    return
  }
  commitDrag(s, d)
  s.drag.value = null
  s.cursorOverride.value = null
  refreshMeasurement(s)
}

function clearTransientInteractionFeedback(s: CanvasInputState) {
  const { editor } = s.options
  editor.setSnapGuides([])
  editor.setLayoutInsertIndicator(null)
  editor.setDropTarget(null)
  editor.setShapeHandleHover(null)
  s.guideInput.clearHoverAndPreview()
}

function discardDrawnPreview(s: CanvasInputState, d: DragState) {
  if (d.type === 'resize') cancelResizePreview(d, s.options.editor)
  else if ('cancel' in d) d.cancel()
  else if (d.type === 'pencil-drag') s.options.editor.pencilCancel()
}

function discardDrag(s: CanvasInputState, d: DragState) {
  discardDrawnPreview(s, d)
  if (d.type === 'move') cancelMove(d, s.options.editor)
  else if (d.type === 'rotate') {
    if (s.options.editor.state.rotationPreview?.nodeId === d.nodeId)
      s.options.editor.setRotationPreview(null)
  } else cancelNodeEditDrag(d, s.options.editor)
}

export function cancelPointerInteraction(s: CanvasInputState) {
  const d = s.drag.value
  // Ending a preview can synchronously cancel again.
  s.drag.value = null
  if (d) discardDrag(s, d)
  s.cursorOverride.value = null
  clearTransientInteractionFeedback(s)
}
