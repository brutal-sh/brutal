import { ref, type Ref } from 'vue'

import type { SceneNode } from '@open-pencil/scene-graph'
import { cycleSafeParent } from '@open-pencil/scene-graph/instances'

import type { EditorStore } from '@/app/editor/active-store'
import type { LibraryService } from '@/app/libraries'

import type { LocalAsset } from './catalog'

interface InsertionState {
  editor: EditorStore
  libraryService: LibraryService
  insertingAssetId: Ref<string | null>
  openDetails: (asset: LocalAsset) => Promise<void>
}

export function useAssetInsertion(
  editor: EditorStore,
  libraryService: LibraryService,
  openDetails: InsertionState['openDetails']
) {
  const state: InsertionState = {
    editor,
    libraryService,
    openDetails,
    insertingAssetId: ref<string | null>(null)
  }
  return {
    insertingAssetId: state.insertingAssetId,
    insertAsset: (asset: LocalAsset) => insertAsset(state, asset),
    focusAsset: (asset: LocalAsset) => focusAsset(state, asset),
    onAssetKeydown: (event: KeyboardEvent, asset: LocalAsset) =>
      onAssetKeydown(state, event, asset),
    onDragStart
  }
}

function insertionPoint(state: InsertionState, component: SceneNode, parentId: string) {
  const canvasCenter = state.editor.viewportCanvasCenter()
  const center = state.editor.screenToCanvas(canvasCenter.x, canvasCenter.y)
  const parentOffset =
    parentId === state.editor.state.currentPageId
      ? { x: 0, y: 0 }
      : state.editor.graph.getAbsolutePosition(parentId)
  return {
    x: center.x - parentOffset.x - component.width / 2,
    y: center.y - parentOffset.y - component.height / 2
  }
}

async function resolveAssetComponent(
  state: InsertionState,
  asset: LocalAsset
): Promise<string | null> {
  if (asset.componentId) return asset.componentId
  if (!asset.libraryId || !asset.revisionId || !asset.assetKey) return null
  state.insertingAssetId.value = asset.id
  try {
    const result = await state.libraryService.materialize(
      state.editor,
      asset.libraryId,
      asset.revisionId,
      asset.assetKey
    )
    return result.componentId
  } finally {
    state.insertingAssetId.value = null
  }
}

async function insertAsset(state: InsertionState, asset: LocalAsset) {
  const componentId = await resolveAssetComponent(state, asset)
  if (!componentId) return
  const component = state.editor.graph.getNode(componentId)
  if (!component) return
  const parentId = cycleSafeParent(
    state.editor.graph,
    state.editor.state.enteredContainerId ?? state.editor.state.currentPageId,
    [componentId]
  )
  const point = insertionPoint(state, component, parentId)
  state.editor.createInstanceFromComponent(componentId, point.x, point.y, parentId)
  state.editor.requestRender()
}

function onDragStart(event: DragEvent, asset: LocalAsset) {
  if (!event.dataTransfer || !asset.componentId) return
  event.dataTransfer.setData('application/x-openpencil-component', asset.componentId)
  event.dataTransfer.effectAllowed = 'copy'
}

function focusAsset(state: InsertionState, asset: LocalAsset) {
  if (asset.libraryId) return
  void state.editor.focusComponent(asset.id)
}

function onAssetKeydown(state: InsertionState, event: KeyboardEvent, asset: LocalAsset) {
  if ((event.metaKey || event.ctrlKey) && event.code === 'Enter') {
    event.preventDefault()
    void state.openDetails(asset)
    return
  }
  if (event.code === 'Enter' || event.code === 'Space') {
    event.preventDefault()
    void insertAsset(state, asset)
  }
}
