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
import { getActiveEditorStoreOrNull, type EditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'

export const snapshotExportOpen = ref(false)
export const snapshotExportBusy = ref(false)
export const snapshotExport = shallowRef<{
  file: ExportedFile
  name: string
  sources: ReadonlyMap<string, string>
} | null>(null)

export async function requestSnapshotExport(store: EditorStore): Promise<void> {
  if (snapshotExportBusy.value) return
  snapshotExportBusy.value = true
  const graph = store.graph
  try {
    const sources = await store.collectScriptSources()
    if (graph !== store.graph) throw new Error('The document changed. Export its snapshot again.')
    if (getActiveEditorStoreOrNull()?.graph !== graph) return
    const result = exportPenSnapshot(graph, sources)
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
  } finally {
    snapshotExportBusy.value = false
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
