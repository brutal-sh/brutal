import type { BuiltinIOFormatId } from '@open-pencil/core/io'

import type { EditorStore } from '@/app/editor/active-store'

type ExportMenuStore = {
  state: Pick<EditorStore['state'], 'selectedIds'>
  exportSelection: EditorStore['exportSelection']
}

const EXPORT_FORMATS = {
  'export-selection': 'png',
  'export-pdf': 'pdf',
  'export-png': 'png',
  'export-jpeg': 'jpg',
  'export-webp': 'webp',
  'export-svg': 'svg',
  'export-pptx': 'pptx',
  'export-drawio': 'drawio',
  'export-fig': 'fig'
} satisfies Record<string, BuiltinIOFormatId>

/** Native menus and the command palette share the same format dispatch. */
export function createExportMenuActions(store: ExportMenuStore) {
  return Object.fromEntries(
    Object.entries(EXPORT_FORMATS).map(([id, format]) => [
      id,
      async () => {
        if (store.state.selectedIds.size > 0) await store.exportSelection(1, format)
      }
    ])
  )
}
