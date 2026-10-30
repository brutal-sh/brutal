import { useFileDialog } from '@vueuse/core'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { pastePoint } from '@/app/editor/clipboard/paste/content'
import { toast } from '@/app/shell/ui'

import { importCanvasFile } from './actions/import'

/** A fresh picker captures its destination, so switching tabs cannot import into another design. */
export function importCanvasFileDialog(): void {
  const store = getActiveEditorStoreOrNull()
  if (!store || store.state.readOnly) {
    toast.error('Choose an editable design before importing.')
    return
  }
  const graph = store.graph
  const page = store.state.currentPageId
  const point = pastePoint(store)
  const dialog = useFileDialog({
    accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.fig',
    multiple: false,
    reset: true
  })
  dialog.onChange((files) => {
    const file = files?.[0]
    if (!file) return
    void importCanvasFile(
      store,
      file,
      point,
      () =>
        getActiveEditorStoreOrNull() === store &&
        store.graph === graph &&
        store.state.currentPageId === page
    ).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'The file could not be imported.')
    })
  })
  dialog.open()
}
