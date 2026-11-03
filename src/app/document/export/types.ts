import type { HTMLExportOptions } from '@open-pencil/core/io'

export type ExportOptions = HTMLExportOptions & {
  scale?: number
  quality?: number
  pdfMode?: 'single' | 'frames'
}

export interface ExportDelivery {
  fileName: string
  nativePath?: string
}

export interface ExportSaveResult {
  saved: boolean
  nativePath?: string
}
