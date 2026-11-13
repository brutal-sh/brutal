import type { HTMLExportOptions, ExportRequest } from '@open-pencil/core/io'

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

export type DownloadBlob = (data: Uint8Array, filename: string, mime: string) => void

export interface ExportTargetRequest {
  target: ExportRequest['target']
  formatId: string
  options?: ExportOptions
}
