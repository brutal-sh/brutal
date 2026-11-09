import type { Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import { DEFAULT_ICON_SIZE } from '@open-pencil/core/constants'
import { WHITE } from '@open-pencil/scene-graph/constants'

import { startPenInput } from '#vue/canvas/pen/input'
import { startPencilInput } from '#vue/canvas/pencil/input'
import { HAND_GRAB_CURSOR } from '#vue/editor/tool-cursor'
import { attachModifiers, startConnectorDraw } from '#vue/shared/input/connector/draw'
import { parentSpace, startShapeDraw, startTextDraw } from '#vue/shared/input/draw'
import { findDrawParent } from '#vue/shared/input/drop-target'
import { startNotePlacement } from '#vue/shared/input/notes/place'
import { startPanDrag } from '#vue/shared/input/pan/drag'
import { handleSelectDown } from '#vue/shared/input/select'
import type { HitTestFns } from '#vue/shared/input/select'
import { startStickyDraw } from '#vue/shared/input/sticky/draw'
import type { DragState } from '#vue/shared/input/types'

type ToolMouseDownOptions = {
  event: MouseEvent
  cx: number
  cy: number
  sx: number
  sy: number
  editor: Editor
  hitFns: HitTestFns
  cursorOverride: Ref<string | null>
  setDrag: (d: DragState) => void
  tryStartRotation: (cx: number, cy: number) => boolean
  handleTextEditClick: (cx: number, cy: number, shiftKey: boolean) => boolean
}

export { startPanDrag }

export function handleToolMouseDown({
  event,
  cx,
  cy,
  sx,
  sy,
  editor,
  hitFns,
  cursorOverride,
  setDrag,
  tryStartRotation,
  handleTextEditClick
}: ToolMouseDownOptions) {
  const tool = editor.state.activeTool

  if (event.button === 1 || tool === 'HAND') {
    startPanDrag(event, setDrag, editor)
    cursorOverride.value = HAND_GRAB_CURSOR
    return
  }

  // Comments are placed by the app's comments layer above the canvas.
  if (tool === 'COMMENT') return

  if (tool === 'SELECT' || tool === 'SCALE') {
    handleSelectDown(
      event,
      cx,
      cy,
      sx,
      sy,
      editor,
      hitFns,
      tryStartRotation,
      handleTextEditClick,
      setDrag
    )
    return
  }

  if (tool === 'PEN') {
    startPenInput(event, cx, cy, editor, setDrag, cursorOverride)
    return
  }

  if (tool === 'PENCIL') {
    startPencilInput(cx, cy, editor, setDrag)
    return
  }

  if (tool === 'TEXT') {
    startTextDraw(cx, cy, editor, setDrag)
    return
  }

  if (tool === 'CONNECTOR') {
    startConnectorDraw(cx, cy, sx, sy, editor, setDrag, attachModifiers(event))
    return
  }

  if (tool === 'SCRIPT') {
    const parentId = findDrawParent(cx, cy, 'FRAME', editor)
    const point = parentSpace(editor, parentId)(cx, cy)
    const id = editor.createScript(point.x, point.y, parentId)
    editor.select([id])
    editor.setTool('SELECT')
    return
  }

  if (tool === 'ICON') {
    const parentId = findDrawParent(cx, cy, 'FRAME', editor)
    const point = parentSpace(editor, parentId)(cx, cy)
    editor.setTool('SELECT')
    void editor
      .insertIcon('lucide:heart', WHITE, {
        parentId,
        x: point.x - DEFAULT_ICON_SIZE / 2,
        y: point.y - DEFAULT_ICON_SIZE / 2,
        name: 'Icon'
      })
      .catch((error: unknown) => {
        console.error('Failed to place icon', error)
      })
    return
  }

  if (tool === 'NOTE') {
    startNotePlacement(cx, cy, editor)
    return
  }

  if (tool === 'STICKY') {
    startStickyDraw(cx, cy, editor, setDrag)
    return
  }

  startShapeDraw(cx, cy, editor, setDrag)
}
