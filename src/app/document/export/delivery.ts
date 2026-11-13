import { isTauri } from '@/app/tauri/env'

import {
  bundleExportFiles,
  chooseTauriExportPath,
  saveExportedFile,
  type ExportedFile
} from './files'
import type { DownloadBlob, ExportSaveResult } from './types'

function exportOutput(file: ExportedFile): ExportedFile {
  if (!file.assets?.length) return file
  return {
    bytes: bundleExportFiles([file]),
    fileName: `${file.fileName}.zip`,
    format: 'ZIP',
    ext: '.zip',
    mime: 'application/zip'
  }
}

export async function saveExportFile(
  downloadBlob: DownloadBlob,
  file: ExportedFile,
  nativePath?: string
): Promise<ExportSaveResult> {
  const output = exportOutput(file)
  const bundled = output !== file
  let path = nativePath
  if (path && bundled) path = `${path}.zip`
  if (!path && isTauri())
    path = (await chooseTauriExportPath(output.fileName, output.format, output.ext)) ?? undefined
  if (isTauri() && !path) return { saved: false }
  const saved = await saveExportedFile(
    output.bytes,
    output.fileName,
    output.format,
    output.ext,
    output.mime,
    downloadBlob,
    path
  )
  return { saved, nativePath: saved ? path : undefined }
}
