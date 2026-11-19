import { platform } from '@tauri-apps/plugin-os'

import { IS_TAURI } from '@/constants'

export const MAX_NATIVE_ARTWORK_BYTES = 32 * 1024 * 1024
export const NATIVE_ARTWORK_EXTENSIONS = ['pdf', 'ai', 'psd', 'psb'] as const

export function canOpenNativeArtwork(): boolean {
  return IS_TAURI && platform() === 'macos'
}

type NativeArtworkFormat = (typeof NATIVE_ARTWORK_EXTENSIONS)[number]

export function nativeArtworkFormat(name: string): NativeArtworkFormat | undefined {
  if (!canOpenNativeArtwork()) return undefined
  const lower = name.toLowerCase()
  return NATIVE_ARTWORK_EXTENSIONS.find((extension) => lower.endsWith(`.${extension}`))
}

export async function openNativeArtwork(
  file: File,
  format: NativeArtworkFormat,
  signal: AbortSignal
) {
  if (file.size > MAX_NATIVE_ARTWORK_BYTES)
    throw new Error('Artwork import files must be 32 MB or smaller.')
  const [{ invoke }, { readRasterPageImages }, bytes] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@open-pencil/core/io/formats/raster'),
    file.arrayBuffer()
  ])
  signal.throwIfAborted()
  if (format === 'ai' && new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error(
      'This Illustrator file has no PDF artwork. Save with Create PDF Compatible File enabled, or export a PDF.'
    )
  }
  if (format === 'psd' || format === 'psb') {
    const { openPhotoshopLayers, photoshopLayersToScene } =
      await import('@open-pencil/core/io/formats/photoshop')
    const result = await openPhotoshopLayers(bytes, signal)
    signal.throwIfAborted()
    if ('artwork' in result) {
      const name = file.name.replace(/\.(psd|psb)$/i, '')
      return {
        graph: photoshopLayersToScene(result.artwork, name),
        photoshop: { mode: 'layers' as const }
      }
    }
    const rendered = await invoke<ArrayBuffer>('render_photoshop_image', bytes)
    signal.throwIfAborted()
    return {
      graph: readRasterPageImages(new Uint8Array(rendered)),
      photoshop: { mode: 'composite' as const, reason: result.reason }
    }
  }
  const rendered = await invoke<ArrayBuffer>('render_pdf_pages', bytes)
  signal.throwIfAborted()
  return { graph: readRasterPageImages(new Uint8Array(rendered)), photoshop: undefined }
}
