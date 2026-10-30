import { isEqual } from 'es-toolkit/predicate'

import type { Editor } from '@open-pencil/core'
import type { Color } from '@open-pencil/scene-graph/primitives'
import type { BindingTarget } from '@open-pencil/vue/controls/binding-provider'
import type { BindableValueActions } from '@open-pencil/vue/primitives/BindableValue'

export type PaintBindingKind = 'fills' | 'strokes'

export function paintBindingTargets(
  nodeIds: string[],
  kind: PaintBindingKind,
  index: number
): BindingTarget[] {
  return nodeIds.map((nodeId) => ({ nodeId, path: `${kind}/${index}/color` }))
}

export function applyPaintMutation(
  actions: BindableValueActions<Color>,
  flush: () => void,
  update: () => void
): boolean {
  flush()
  if (!actions.beginMutation('edit')) return false
  update()
  return true
}

export function commitPaintMutation(actions: BindableValueActions<Color>) {
  actions.commitMutation()
}

/** Paint settings retain color bindings and commit independently of channel edits. */
export function commitPaintSetting(
  actions: BindableValueActions<Color>,
  flush: () => void,
  update: () => void
) {
  actions.commitMutation()
  update()
  flush()
}

export function cancelPaintMutation(actions: BindableValueActions<Color>) {
  actions.cancelMutation()
}

/** Vertex edits detach only that color; resizing and shuffling carry aliases with their colors. */
export function remapMeshColorBindings(
  editor: Editor,
  nodeIds: readonly string[],
  kind: PaintBindingKind,
  paintIndex: number,
  sources: readonly (number | null)[] | undefined
) {
  const prefix = `${kind}/${paintIndex}/meshGradient/colors/`
  for (const id of nodeIds) {
    const node = editor.graph.getNode(id)
    if (!node || (!sources && node[kind][paintIndex]?.type === 'GRADIENT_MESH')) continue
    const original = node.boundVariables
    const next = Object.fromEntries(
      Object.entries(original).filter(([key]) => !key.startsWith(prefix))
    )
    ;(sources ?? []).forEach((source, index) => {
      const variable = source === null ? undefined : original[`${prefix}${source}`]
      if (variable) next[`${prefix}${index}`] = variable
    })
    if (!isEqual(original, next))
      editor.updateNodeWithUndo(id, { boundVariables: next }, 'Edit mesh colors')
  }
}
