import { platform } from '@tauri-apps/plugin-os'

import { IS_TAURI } from '@/constants'

export const MAX_NATIVE_PDF_BYTES = 32 * 1024 * 1024
export const NATIVE_PDF_EXTENSIONS = ['pdf', 'ai'] as const

export function canOpenNativePDF(): boolean {
  return IS_TAURI && platform() === 'macos'
}

export function nativePDFFormat(name: string): (typeof NATIVE_PDF_EXTENSIONS)[number] | undefined {
  if (!canOpenNativePDF()) return undefined
  const lower = name.toLowerCase()
  return NATIVE_PDF_EXTENSIONS.find((extension) => lower.endsWith(`.${extension}`))
}

export async function openNativePDF(file: File, format: 'pdf' | 'ai', signal: AbortSignal) {
  if (file.size > MAX_NATIVE_PDF_BYTES)
    throw new Error('PDF import files must be 32 MB or smaller.')
  const [{ invoke }, { readPDFPageImages }, bytes] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@open-pencil/core/io/formats/pdf'),
    file.arrayBuffer()
  ])
  signal.throwIfAborted()
  if (format === 'ai' && new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error(
      'This Illustrator file has no PDF artwork. Save with Create PDF Compatible File enabled, or export a PDF.'
    )
  }
  const rendered = await invoke<ArrayBuffer>('render_pdf_pages', bytes)
  signal.throwIfAborted()
  return readPDFPageImages(new Uint8Array(rendered))
}
