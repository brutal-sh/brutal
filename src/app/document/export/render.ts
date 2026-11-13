import { invoke } from '@tauri-apps/api/core'

import type { ExportRequest } from '@open-pencil/core/io'

import { IS_TAURI } from '@/constants'

import type { ExportContext } from './context'
import {
  getExportBaseName,
  getExportBytes,
  getExportFileName,
  getExportOptions,
  type ExportedFile
} from './files'
import type { ExportOptions } from './types'

async function encodeWebPFallback(png: Uint8Array, quality?: number): Promise<Uint8Array> {
  // Preserve the existing lossless native default; explicit quality uses the full codec.
  if (IS_TAURI && quality === undefined)
    return new Uint8Array(await invoke<ArrayBuffer>('encode_webp', { png: Array.from(png) }))
  const { encodeWebP } = await import('./webp')
  return encodeWebP(png, quality)
}

export async function renderExportFile(
  context: ExportContext,
  target: ExportRequest['target'],
  formatId: string,
  options?: ExportOptions
): Promise<ExportedFile> {
  const { editor, io, prepareExportTarget } = context
  const format = io.getFormat(formatId)
  if (!format) throw new Error(`Unknown export format: ${formatId}`)

  const exportOptions = getExportOptions(format, options)
  await prepareExportTarget(target)

  const result = await io.exportContent(
    formatId,
    { graph: editor.graph, target },
    exportOptions,
    editor.renderer
      ? {
          canvasKit: editor.renderer.ck,
          renderer: editor.renderer,
          encodeWebP: encodeWebPFallback
        }
      : undefined
  )

  const baseName = getExportBaseName(editor.graph, target)
  return {
    bytes: getExportBytes(result.data),
    assets: result.assets,
    fileName: getExportFileName(baseName, format, result.extension, options),
    format: format.label,
    ext: `.${result.extension}`,
    mime: result.mimeType
  }
}
