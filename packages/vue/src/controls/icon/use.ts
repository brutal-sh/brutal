import { tryOnScopeDispose, watchImmediate } from '@vueuse/core'
import { computed, getCurrentInstance, onDeactivated, ref, watch } from 'vue'

import { iconColor } from '@open-pencil/core/icons'
import {
  hasIconFills,
  isIconModified,
  readIcon,
  type IconOptions
} from '@open-pencil/scene-graph/icons'
import type { Color } from '@open-pencil/scene-graph/primitives'

import { useUndoBatch } from '#vue/controls/undo-batch/use'
import { useEditor } from '#vue/editor/context'
import { useSelectionState } from '#vue/editor/selection-state/use'
import { useSceneComputed } from '#vue/internal/scene-computed/use'

/** Headless state and actions for the selected icon: its name and its color. */
export function useIcon() {
  const editor = useEditor()
  const { selectedNode } = useSelectionState()
  const batch = useUndoBatch(editor.undo, editor.beginInteractiveEdit)

  const name = useSceneComputed(() => {
    const node = selectedNode.value
    return node ? (readIcon(node)?.name ?? null) : null
  })
  const options = useSceneComputed(() => {
    const node = selectedNode.value
    return node ? readIcon(node)?.options : undefined
  })
  const authoredFills = useSceneComputed(() => {
    const node = selectedNode.value
    return !!node && hasIconFills(node)
  })
  /** The color of the icon's tinted paths; null for an icon drawn only in its own colors. */
  const color = useSceneComputed(() => {
    const node = selectedNode.value
    return node && name.value ? iconColor(editor.graph, node) : null
  })

  /** The selected icon's SVG markup, for showing which icon it is. */
  const preview = ref<string | null>(null)
  /** The name of the set the icon comes from, such as Lucide, once the catalogue is in. */
  const setName = ref<string | null>(null)
  watchImmediate(name, async (current) => {
    // The last icon's preview never stands in for the next one while it loads.
    preview.value = null
    setName.value = null
    if (!current) return
    const prefix = current.slice(0, current.indexOf(':'))
    const [drawn, sets] = await Promise.all([
      editor.iconProvider.previews([current]).catch(() => null),
      editor.iconProvider.collections().catch(() => [])
    ])
    if (name.value !== current) return
    preview.value = drawn?.get(current) ?? null
    setName.value = sets.find((info) => info.prefix === prefix)?.name ?? null
  })

  /** The selected icon's layer, so a question asked about it can be dropped if it changes. */
  const frameId = computed(() => (name.value ? (selectedNode.value?.id ?? null) : null))

  /** The icon's paths were edited since it was placed; see `isIconModified`. */
  const modified = useSceneComputed(() => {
    const node = selectedNode.value
    const frame = node && name.value ? editor.graph.getNode(node.id) : undefined
    return frame ? isIconModified(editor.graph, frame) : false
  })

  /** Draws the icon as it was placed, discarding edits to its paths. */
  async function reset() {
    const node = selectedNode.value
    if (!node || !name.value) return
    finishWeight()
    batch.flush()
    await editor.resetIcon(node.id)
  }

  /** Makes the icon plain artwork that keeps its paths. */
  function detach() {
    const node = selectedNode.value
    if (!node || !name.value) return
    finishWeight()
    batch.flush()
    editor.detachIcon(node.id)
  }

  async function swap(next: string, options?: IconOptions) {
    const node = selectedNode.value
    if (!node || !name.value || name.value === next) return
    finishWeight()
    batch.flush()
    await editor.swapIconGlyph(node.id, next, options)
  }

  let weightPreview: ReturnType<typeof editor.beginIconWeightPreview> = null
  let weightEditing = false
  let weightRequest: AbortController | null = null
  const weightFailed = ref(false)

  function finishWeight() {
    weightRequest?.abort()
    weightRequest = null
    const owned = weightPreview
    weightPreview = null
    weightEditing = false
    owned?.finish()
  }

  function cancelWeight() {
    weightRequest?.abort()
    weightRequest = null
    weightPreview?.cancel()
    weightPreview = null
    weightEditing = false
  }

  function setWeightEditing(open: boolean) {
    if (editor.state.readOnly) {
      cancelWeight()
      return
    }
    if (open) {
      if (weightEditing) return
      finishWeight()
      batch.flush()
      const id = frameId.value
      weightPreview = id ? editor.beginIconWeightPreview(id) : null
      weightEditing = true
      weightFailed.value = false
      return
    }
    weightEditing = false
    const owned = weightPreview
    if (owned)
      void owned
        .commit()
        .catch(() => {
          if (weightPreview === owned) weightFailed.value = true
        })
        .finally(() => {
          if (weightPreview === owned) weightPreview = null
        })
  }

  async function setWeight(weight: number) {
    const id = frameId.value
    if (!id || editor.state.readOnly) return
    weightFailed.value = false
    if (weightEditing) {
      const owned = weightPreview
      if (!owned || owned.closed) return
      try {
        await owned.update(weight)
      } catch {
        if (weightPreview === owned) weightFailed.value = true
      }
      return
    }
    finishWeight()
    batch.flush()
    const request = new AbortController()
    weightRequest = request
    try {
      await editor.setIconOptions(id, { wght: weight }, request.signal)
    } catch {
      if (!request.signal.aborted && frameId.value === id) weightFailed.value = true
    } finally {
      if (weightRequest === request) weightRequest = null
    }
  }

  watch(frameId, finishWeight, { flush: 'sync' })
  tryOnScopeDispose(finishWeight)
  if (getCurrentInstance()) onDeactivated(finishWeight)

  // A drag in the open color picker sends many colors; they undo as one step, committed when
  // the picker closes. A color typed in while it is closed is a step of its own.
  let picking = false
  function setColorPicking(open: boolean) {
    picking = open
    if (!open) batch.flush()
  }

  function setColor(next: Color) {
    const node = selectedNode.value
    if (!node || !name.value) return
    if (picking) batch.ensure(`icon-color:${node.id}`, 'Change icon color')
    editor.setIconColor(node.id, next)
  }

  return {
    frameId,
    name,
    options,
    authoredFills,
    color,
    preview,
    setName,
    modified,
    swap,
    setWeight,
    setWeightEditing,
    cancelWeight,
    weightFailed,
    reset,
    detach,
    setColor,
    setColorPicking
  }
}
