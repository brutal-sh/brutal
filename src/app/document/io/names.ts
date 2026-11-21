import { basename } from 'pathe'
import { filename } from 'pathe/utils'

export const DEFAULT_DOCUMENT_EXTENSION = '.brut'
export const WRITABLE_DOCUMENT_NAME = /\.(brut|pen|fig)$/i

export function documentNameFromFigPath(path: string): string {
  return filename(path) || 'Untitled'
}

export function downloadNameFromPath(path: string): string {
  return basename(path) || 'Untitled.fig'
}

export function documentDownloadName(fileName: string, sourceFormat: string): string {
  return sourceFormat === 'fig' || sourceFormat === 'pen'
    ? fileName
    : `${filename(fileName) ?? fileName}.fig`
}
