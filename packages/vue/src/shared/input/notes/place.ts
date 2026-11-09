import type { Editor } from '@open-pencil/core'
import { NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH, noteBody } from '@open-pencil/scene-graph/generated'

import { parentSpace } from '#vue/shared/input/draw'
import { findDrawParent } from '#vue/shared/input/drop-target'

/** Pen places a fixed-size Note centered at the press, even when the pointer drags. */
export function startNotePlacement(cx: number, cy: number, editor: Editor) {
  const parentId = findDrawParent(cx, cy, 'FRAME', editor)
  const point = parentSpace(editor, parentId)(cx, cy)
  const note = editor.createNote(parentId, {
    x: point.x - NOTE_MIN_WIDTH / 2,
    y: point.y - NOTE_MIN_HEIGHT / 2
  })
  editor.setTool('SELECT')
  const body = noteBody(editor.graph, note)
  if (body) editor.startTextEditing(body.id)
  return note
}
