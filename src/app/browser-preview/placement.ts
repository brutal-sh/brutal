import { getActiveEditorStoreOrNull, type EditorStore } from '@/app/editor/active-store'
import { pastePoint } from '@/app/editor/clipboard/paste/content'

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
    place: async (png) => {
      if (!isCurrent()) throw new Error('The capture destination changed. Try again.')
      // shortcut: this unzoomed view uses editor display density; capture bundles must carry scale for zoom/monitor changes.
      const snapshot = browserImageSnapshot(png, window.devicePixelRatio)
      const ck = store.renderer?.ck
      const image = ck?.MakeImageFromEncoded(png)
      if (!image) throw new Error('The browser image could not be decoded. Try again.')
      image.delete()
      const point = pastePoint(store)
      store.pastePreparedSnapshot(snapshot, point, 'Capture browser page')
      store.requestRender()
    }
  }
}
