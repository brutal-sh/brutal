import { captureClipboardSnapshot } from '@open-pencil/core/clipboard'
import { prepareGraphFonts } from '@open-pencil/core/text'

import { getActiveEditorStoreOrNull, type EditorStore } from '@/app/editor/active-store'
import { pastePoint } from '@/app/editor/clipboard/paste/content'

import { extractedPageToGraph } from './convert'
import type { ExtractedPage } from './schema'

export interface BrowserImportTarget {
  isCurrent(): boolean
  place(page: ExtractedPage, isLive: () => boolean): Promise<void>
}

/** All async preparation belongs to a temporary graph; the editor changes only at the final commit. */
export function browserImportTarget(
  store: EditorStore,
  isVisible: () => boolean = () => true
): BrowserImportTarget {
  if (store.state.readOnly) throw new Error('This design is read-only. Choose an editable design.')
  const graph = store.graph
  const pageId = store.state.currentPageId
  const selected = [...store.state.selectedIds]
  const entered = store.state.enteredContainerId
  const point = pastePoint(store)
  const isCurrent = () =>
    isVisible() &&
    getActiveEditorStoreOrNull() === store &&
    store.graph === graph &&
    store.state.currentPageId === pageId &&
    !store.state.readOnly &&
    store.state.enteredContainerId === entered &&
    selected.length === store.state.selectedIds.size &&
    selected.every((id) => store.state.selectedIds.has(id))
  return {
    isCurrent,
    async place(page, isLive) {
      if (!isLive() || !isCurrent())
        throw new Error('The import destination changed. Select it and import again.')
      const prepared = extractedPageToGraph(page)
      const fonts = await prepareGraphFonts(prepared.graph, [prepared.root.id])
      if (!fonts.faithful)
        throw new Error(
          `Import requires unavailable fonts: ${fonts.issues.map((face) => `${face.family} ${face.style}`).join(', ')}. The design was not changed.`
        )
      const ck = store.renderer?.ck
      if (!ck) throw new Error('Wait for the design canvas to load before importing.')
      for (const bytes of prepared.graph.images.values()) {
        const image = ck.MakeImageFromEncoded(bytes)
        if (!image)
          throw new Error('An extracted image could not be decoded. The design was not changed.')
        image.delete()
      }
      if (!isLive() || !isCurrent())
        throw new Error('The import destination changed. Select it and import again.')
      const snapshot = captureClipboardSnapshot(prepared.graph, [prepared.root])
      store.pastePreparedSnapshot(snapshot, point, 'Import browser page')
      store.requestRender()
    }
  }
}
