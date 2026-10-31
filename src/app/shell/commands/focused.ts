import { deleteCanvasTextInput, isCanvasTextInput } from '@open-pencil/vue/canvas/text-edit'
import type { EditorCommandId } from '@open-pencil/vue/editor/commands'

import type { EditorStore } from '@/app/editor/active-store'
import { isInputElement, isToggleInput } from '@/app/shell/keyboard/focus'

/**
 * Commands a focused text field carries out itself. As in VS Code's
 * `EditorOrNativeTextInputCommand`, `execCommand` is the one API that reaches a field's own
 * selection and undo history.
 */
const TEXT_FIELD_EDITS: Partial<Record<EditorCommandId, 'selectAll' | 'undo' | 'redo' | 'delete'>> =
  {
    'selection.selectAll': 'selectAll',
    'edit.undo': 'undo',
    'edit.redo': 'redo',
    'selection.delete': 'delete'
  }

/** A text field in the page has focus; the canvas text editor types through its own textarea. */
export function textFieldFocused(): boolean {
  const active = document.activeElement
  return isInputElement(active) && !isCanvasTextInput(active)
}

/**
 * Runs a command against what has keyboard focus when it runs. A focused text field takes the
 * edits it has its own version of, and commands on the document or selection wait for the
 * canvas, as keyboard shortcuts do; view commands still run.
 *
 * Entry points that keep the person's focus, the native menu, run commands through this. The
 * command palette and the in-app menu take focus themselves and act on the document.
 */
export function runFocusedCommand(
  store: EditorStore,
  runCommand: (id: EditorCommandId) => void,
  id: EditorCommandId
): void {
  if ((id === 'edit.undo' || id === 'edit.redo') && isToggleInput(document.activeElement)) {
    runCommand(id)
    return
  }
  if (id === 'selection.selectAll' && isCanvasTextInput(document.activeElement)) {
    store.textEditor?.selectAll()
    store.requestRender()
    return
  }
  if (id === 'selection.delete' && isCanvasTextInput(document.activeElement)) {
    deleteCanvasTextInput(document.activeElement)
    return
  }
  if (textFieldFocused()) {
    const edit = TEXT_FIELD_EDITS[id]
    if (edit) document.execCommand(edit)
    else if (id.startsWith('view.')) runCommand(id)
    return
  }
  runCommand(id)
}

/** An action on the canvas selection that waits, like the commands above, while a field has focus. */
export function onCanvasSelection(action: () => void): () => void {
  return () => {
    if (!textFieldFocused()) action()
  }
}
