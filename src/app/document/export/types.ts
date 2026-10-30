import type { HTMLExportOptions } from '@open-pencil/core/io'

export type ExportOptions = HTMLExportOptions & {
  scale?: number
  quality?: number
  pdfMode?: 'single' | 'frames'
}
