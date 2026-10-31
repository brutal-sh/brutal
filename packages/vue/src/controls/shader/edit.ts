import { tryOnScopeDispose } from '@vueuse/core'
import { getCurrentInstance, onDeactivated } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

/** Own one picker gesture across its live updates and terminal event. */
export function useShaderPaintEditing(editor: Editor) {
  let edit: ReturnType<Editor['beginShaderPaintEdit']> | undefined
  function update(
    ids: readonly string[],
    list: 'fills' | 'strokes',
    index: number,
    preset: ShaderPreset
  ) {
    edit ??= editor.beginShaderPaintEdit(ids, list, index)
    edit.update(preset)
  }
  function commit() {
    const current = edit
    edit = undefined
    current?.commit()
  }
  function cancel() {
    const current = edit
    edit = undefined
    current?.cancel()
  }
  tryOnScopeDispose(cancel)
  if (getCurrentInstance()) onDeactivated(cancel)
  return { update, commit, cancel }
}
