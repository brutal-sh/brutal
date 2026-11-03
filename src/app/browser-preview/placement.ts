import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'

import { getActiveEditorStoreOrNull, type EditorStore } from '@/app/editor/active-store'

import type { CaptureTarget } from './controller'
import { browserImageSnapshot } from './image'

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
    place: async (capture) => {
      if (!isCurrent()) throw new Error('The capture destination changed. Try again.')
      const snapshot = browserImageSnapshot(capture)
      const ck = store.renderer?.ck
      for (const slice of capture.slices) {
        const image = ck?.MakeImageFromEncoded(slice.png)
        if (!image) throw new Error('The browser image could not be decoded. Try again.')
        image.delete()
      }
      const bounds = graph.getChildren(page).map((node) => getAxisAlignedWorldBounds(node, graph))
      const width = Math.max(...capture.slices.map((slice) => slice.width))
      const height = capture.slices.reduce((sum, slice) => sum + slice.height, 0)
      const left = bounds.length ? Math.max(...bounds.map((box) => box.x + box.width)) + 40 : 0
      const top = bounds.length ? Math.min(...bounds.map((box) => box.y)) : 0
      const ids = store.pastePreparedSnapshot(
        snapshot,
        { x: left + width / 2, y: top + height / 2 },
        'Capture browser page',
        { atPageRoot: true }
      )
      store.revealNodes(ids)
      store.requestRender()
    }
  }
}
