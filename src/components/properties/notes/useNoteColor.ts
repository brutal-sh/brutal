import { isEqual } from 'es-toolkit'
import { computed, onScopeDispose, watch } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import { parseColor } from '@open-pencil/scene-graph/color'
import { NOTE_BACKGROUND, noteOfNode } from '@open-pencil/scene-graph/generated'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'
import { createSelectedNodeState } from '@open-pencil/vue/editor/selection-state'
import { useRetainedActivity } from '@open-pencil/vue/lifecycle/retention'

import { useEditorStore } from '@/app/editor/active-store'

function createColorSession(
  store: ReturnType<typeof useEditorStore>,
  targets: readonly string[],
  current: () => boolean
) {
  let preview: ReturnType<typeof store.beginNoteColorPreview> | null = null
  function cancel() {
    preview?.cancel()
    preview = null
  }
  function openChanged(open: boolean) {
    if (!open) {
      preview?.commit()
      preview = null
      return
    }
    cancel()
    if (current()) preview = store.beginNoteColorPreview(targets)
  }
  function updatePreview(value: Color) {
    if (current() && preview && !preview.closed) preview.update(value)
  }
  function setColor(value: Color) {
    if (!current()) return
    cancel()
    store.setNoteColor(targets, value)
  }
  return { cancel, openChanged, updatePreview, setColor }
}

/** One mounted Note selection owns its picker and every trailing input event. */
export function useNoteColor(ids: readonly string[]) {
  const store = useEditorStore()
  const graph = store.graph
  const targets = [...ids]
  const retained = useRetainedActivity()
  const selection = createSelectedNodeState(store, retained)
  let alive = true
  const disabled = computed(() => {
    void store.state.sceneVersion
    return (
      store.state.readOnly || targets.some((id) => !getNodeEditCapability(store.graph, id).editable)
    )
  })
  const colors = computed(() =>
    selection.nodes.value.map((node) => {
      const fill = (resolvedPaintBindings(store.graph, node).fills ?? node.fills).at(0)
      return fill ? { ...fill.color, a: fill.opacity } : parseColor(NOTE_BACKGROUND)
    })
  )
  const color = computed(() => colors.value.at(0) ?? parseColor(NOTE_BACKGROUND))
  const mixed = computed(() => colors.value.some((value) => !isEqual(value, color.value)))

  function current() {
    return (
      alive &&
      retained?.value !== false &&
      !disabled.value &&
      store.graph === graph &&
      store.state.selectedIds.size === targets.length &&
      targets.every((id) => {
        const node = graph.getNode(id)
        return store.state.selectedIds.has(id) && !!node && !!noteOfNode(node)
      })
    )
  }
  const session = createColorSession(store, targets, current)
  watch(
    () => [store.graph, store.state.selectedIds, disabled.value, retained?.value],
    () => {
      if (!current()) session.cancel()
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    alive = false
    session.cancel()
    selection.dispose()
  })
  return { color, mixed, disabled, ...session }
}
