import type { EditorStore } from '@/app/editor/active-store'

import { GALLERY_SCRIPT_PREFIX, type GalleryScript } from './catalog'

export function insertGalleryScript(store: EditorStore, script: GalleryScript) {
  if (store.state.readOnly) throw new Error('This document is read-only.')
  const center = store.viewportCanvasCenter()
  const point = store.screenToCanvas(center.x, center.y)
  return store.undo.runBatch('Insert Script', () => {
    const id = store.createScript(point.x - script.width / 2, point.y - script.height / 2)
    store.updateNodeWithUndo(id, {
      name: script.name,
      width: script.width,
      height: script.height,
      clipsContent: script.clip
    })
    store.setScriptDefinition(id, {
      uri: `${GALLERY_SCRIPT_PREFIX}${script.id}.js`,
      inputs: { ...script.inputs }
    })
    store.select([id])
    return id
  })
}
