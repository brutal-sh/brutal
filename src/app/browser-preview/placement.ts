import { getActiveEditorStoreOrNull, type EditorStore } from '@/app/editor/active-store'
import { pastePoint } from '@/app/editor/clipboard/paste/content'

import type { CaptureTarget } from './controller'

/** Keep capture tied to the selected design/page, even while native snapshotting is pending. */
export function browserCaptureTarget(store: EditorStore): CaptureTarget {
  if (store.state.readOnly) throw new Error('This design is read-only. Choose an editable design.')
  const graph = store.graph
  const page = store.state.currentPageId
  const isCurrent = () =>
    getActiveEditorStoreOrNull() === store &&
    store.graph === graph &&
    store.state.currentPageId === page &&
    !store.state.readOnly
  return {
    isCurrent,
    place: async (png) => {
      if (!isCurrent()) throw new Error('The capture destination changed. Try again.')
      const selectedBefore = new Set(store.state.selectedIds)
      const { x, y } = pastePoint(store)
      await store.placeImageFiles(
        [new File([png], 'Browser capture.png', { type: 'image/png' })],
        x,
        y
      )
      if (![...store.state.selectedIds].some((id) => !selectedBefore.has(id))) {
        throw new Error('The image could not be placed. Wait for the canvas to load and try again.')
      }
    }
  }
}
