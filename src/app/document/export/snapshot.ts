import { basename } from 'pathe'
import { ref, shallowRef } from 'vue'

import { exportPenSnapshot } from '@open-pencil/core/io'
import { filesMessages } from '@open-pencil/vue/i18n'

import {
  bundleExportFiles,
  getExportBytes,
  saveExportedFile,
  type ExportedFile
} from '@/app/document/export/files'
import { downloadBlob } from '@/app/document/io/browser'
import type { EditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'

export const snapshotExportOpen = ref(false)
export const snapshotExportBusy = ref(false)
export const snapshotExport = shallowRef<{
  file: ExportedFile
  name: string
  sources: ReadonlyMap<string, string>
} | null>(null)

export function requestSnapshotExport(store: EditorStore): void {
  if (snapshotExportBusy.value) return
  try {
    const result = exportPenSnapshot(store.graph)
    const name =
      basename(store.state.documentName || 'Untitled').replace(/\.pen$/i, '') || 'Untitled'
    snapshotExport.value = {
      name,
      sources: result.sources,
      file: {
        bytes: getExportBytes(result.data),
        assets: result.assets,
        fileName: `${name}.pen`,
        format: 'PEN',
        ext: '.pen',
        mime: result.mimeType
      }
    }
    snapshotExportOpen.value = true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : filesMessages.get().snapshotFailed)
  }
}

export async function saveSnapshotExport(): Promise<void> {
  const snapshot = snapshotExport.value
  if (!snapshot || snapshotExportBusy.value) return
  snapshotExportBusy.value = true
  try {
    const saved = await saveExportedFile(
      bundleExportFiles([snapshot.file]),
      `${snapshot.name}-snapshot.zip`,
      'ZIP',
      '.zip',
      'application/zip',
      downloadBlob
    )
    if (saved && snapshotExport.value === snapshot) snapshotExportOpen.value = false
  } catch (error) {
    toast.error(error instanceof Error ? error.message : filesMessages.get().snapshotFailed)
  } finally {
    snapshotExportBusy.value = false
  }
}
