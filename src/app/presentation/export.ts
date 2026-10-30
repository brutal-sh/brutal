import { exportPDFDocument, planPDFPages } from '@open-pencil/core/io/formats/pdf'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { saveExportedFile } from '@/app/document/export/files'
import { downloadBlob } from '@/app/document/io/browser'

export async function exportSlidesPDF(graph: SceneGraph, pageId: string, ids: string[]) {
  if (!ids.length) return
  const pages = planPDFPages(graph, { mode: 'frames', ids, currentPageId: pageId })
  const result = await exportPDFDocument(graph, pages, { embedFonts: true })
  if (!result) throw new Error('No slides to export')
  await saveExportedFile(
    new Uint8Array(result.data),
    'slides.pdf',
    'PDF',
    '.pdf',
    'application/pdf',
    downloadBlob
  )
}
