import { useObjectUrl } from '@vueuse/core'
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'

import type { SceneNode } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

import type { LocalAsset } from './catalog'

interface PreviewState {
  editor: EditorStore
  selectedAsset: ComputedRef<LocalAsset | null>
  selectedAssetId: Ref<string | null>
  detailsOpen: Ref<boolean>
  selectedPreviewNodeId: ComputedRef<string | null>
  previewBlob: ShallowRef<Blob | null>
  previewLoading: Ref<boolean>
  previewRequestId: number
}

export function useAssetPreview(
  editor: EditorStore,
  selectedAsset: ComputedRef<LocalAsset | null>,
  selectedAssetId: Ref<string | null>,
  detailsOpen: Ref<boolean>
) {
  const state: PreviewState = {
    editor,
    selectedAsset,
    selectedAssetId,
    detailsOpen,
    selectedPreviewNodeId: computed(() => selectedAsset.value?.componentId ?? null),
    previewBlob: shallowRef<Blob | null>(null),
    previewLoading: ref(false),
    previewRequestId: 0
  }
  const previewURL = useObjectUrl(state.previewBlob)
  watch(
    [detailsOpen, state.selectedPreviewNodeId, () => editor.state.sceneVersion],
    () => updatePreview(state),
    { flush: 'post' }
  )
  return {
    previewURL,
    previewLoading: state.previewLoading,
    openDetails: (asset: LocalAsset) => openDetails(state, asset)
  }
}

function clearPreview(state: PreviewState) {
  state.previewBlob.value = null
}

function previewTarget(state: PreviewState) {
  const nodeId = state.selectedPreviewNodeId.value
  if (!nodeId) {
    clearPreview(state)
    return null
  }
  const node = state.editor.getNode(nodeId)
  if (!node) {
    clearPreview(state)
    return null
  }
  return { nodeId, node }
}

function renderPreview(state: PreviewState, nodeId: string, node: SceneNode) {
  const maxSize = Math.max(node.width, node.height, 1)
  const scale = Math.min(176 / maxSize, 2)
  return state.editor.renderExportImage([nodeId], scale, 'PNG', state.selectedAsset.value?.pageId)
}

async function updatePreview(state: PreviewState, opening = false) {
  // Closing keeps the preview the dialog showed while it animates out.
  if (!state.detailsOpen.value && !opening) return
  const requestId = ++state.previewRequestId
  const target = previewTarget(state)
  if (!target) return
  const { nodeId, node } = target

  state.previewLoading.value = true
  try {
    const data = await renderPreview(state, nodeId, node)
    if (requestId !== state.previewRequestId) return
    state.previewBlob.value = data ? new Blob([data], { type: 'image/png' }) : null
  } catch {
    if (requestId === state.previewRequestId) clearPreview(state)
  } finally {
    if (requestId === state.previewRequestId) state.previewLoading.value = false
  }
}

async function openDetails(state: PreviewState, asset: LocalAsset) {
  if (asset.id !== state.selectedAssetId.value) clearPreview(state)
  state.selectedAssetId.value = asset.id
  await updatePreview(state, true)
  state.detailsOpen.value = true
}
