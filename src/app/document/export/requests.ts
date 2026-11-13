import { trackDocumentFormat } from '@/app/telemetry'

import type { ExportContext } from './context'
import { saveExportFile } from './delivery'
import { bundleExportFiles, getExportBaseName, saveExportedFile, type ExportedFile } from './files'
import { renderExportFile } from './render'
import type { ExportDelivery, ExportTargetRequest } from './types'

export async function exportTarget(
  context: ExportContext,
  request: ExportTargetRequest,
  delivery?: ExportDelivery
) {
  const file = await renderExportFile(context, request.target, request.formatId, request.options)
  if (delivery) file.fileName = delivery.fileName
  const result = await saveExportFile(context.downloadBlob, file, delivery?.nativePath)
  if (result.saved) trackDocumentFormat('document_exported', request.formatId)
  return result
}

export async function exportTargets(context: ExportContext, requests: ExportTargetRequest[]) {
  const { editor, downloadBlob } = context
  if (requests.length === 0) return

  const files: ExportedFile[] = []
  for (const request of requests) {
    files.push(await renderExportFile(context, request.target, request.formatId, request.options))
  }

  const baseNames = new Set(requests.map((r) => getExportBaseName(editor.graph, r.target)))
  const zipBaseName = baseNames.size === 1 ? [...baseNames][0] : 'export'
  const saved =
    files.length === 1
      ? (await saveExportFile(downloadBlob, files[0])).saved
      : await saveExportedFile(
          bundleExportFiles(files),
          `${zipBaseName}.zip`,
          'ZIP',
          '.zip',
          'application/zip',
          downloadBlob
        )
  // Counted once delivered, so a failed render or a cancelled save is not an export.
  if (saved) for (const { formatId } of requests) trackDocumentFormat('document_exported', formatId)
}
