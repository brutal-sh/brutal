import type { IOFormatExportOptions, IOFormatSupport } from '#core/io/types'

/** Formats that export a document, page, selection, or single node alike. */
export const EXPORT_EVERY_TARGET: IOFormatSupport = {
  exportDocument: true,
  exportPage: true,
  exportSelection: true,
  exportNode: true
}

/** Formats with a size of their own, so no export scale or quality. */
export const FIXED_SIZE_EXPORT: IOFormatExportOptions = { scale: false, quality: false }

export function lowerExt(name: string): string {
  const match = /\.([^.]+)$/.exec(name.toLowerCase())
  return match?.[1] ?? ''
}
