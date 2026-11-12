import { filename } from 'pathe/utils'

import type { SceneGraph } from '@open-pencil/scene-graph'

import { FIXED_SIZE_EXPORT, lowerExt } from '#core/io/formats/shared'
import { extractExportGraph } from '#core/io/subgraph'
import type { ExportResult, FigWriteOptions, IOContext, IOFormatAdapter } from '#core/io/types'

import { exportFigFile, parseFigFile } from './index'

export const figFormat: IOFormatAdapter<'fig'> = {
  id: 'fig',
  label: 'Open Pen Document',
  role: 'native-document',
  category: 'document',
  extensions: ['fig'],
  mimeTypes: ['application/octet-stream'],
  support: {
    readDocument: true,
    writeDocument: true,
    exportDocument: true,
    exportPage: true,
    exportSelection: true,
    exportNode: true
  },
  exportOptions: FIXED_SIZE_EXPORT,
  matchesFile(fileName) {
    return lowerExt(fileName) === 'fig'
  },
  async readDocument(input) {
    const data = new Uint8Array(input.data).buffer
    const graph = await parseFigFile(data, { populate: 'first-page' })
    return { graph, sourceFormat: 'fig' }
  },
  async writeDocument(graph, options?: FigWriteOptions, context?: IOContext) {
    return writeFig(graph, options, context, { pageId: options?.thumbnailPageId })
  },
  async exportContent(request, options?: FigWriteOptions, context?: IOContext) {
    // A whole document is written as it is, so one opened from an archive keeps that archive.
    if (request.target.scope === 'document')
      return writeFig(request.graph, options, context, {
        pageId: options?.thumbnailPageId,
        fileName: request.fileName
      })
    const extracted = extractExportGraph(request.graph, request.target)
    return writeFig(extracted.graph, options, context, {
      pageId: options?.thumbnailPageId ?? extracted.pageId ?? undefined,
      fileName: request.fileName
    })
  }
}

/** A `.fig` named as asked, or else after the file it is written to, or else Untitled. */
async function writeFig(
  graph: SceneGraph,
  options: FigWriteOptions | undefined,
  context: IOContext | undefined,
  target: { pageId?: string; fileName?: string }
): Promise<ExportResult> {
  const data = await exportFigFile(graph, {
    ck: context?.canvasKit,
    renderer: context?.renderer,
    pageId: target.pageId,
    renderHeadlessThumbnail: options?.renderThumbnail ?? false,
    documentName: options?.documentName ?? (target.fileName && filename(target.fileName))
  })
  return { format: 'fig', mimeType: 'application/octet-stream', extension: 'fig', data }
}
