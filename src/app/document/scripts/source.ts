import { documentSourceFilePath } from '@/app/document/io/assets'
import { readBoundedFile } from '@/app/tauri/files'

/** Script loading grants only a document-local file or a file explicitly selected by the user. */
export async function loadCanvasScriptSource(
  uri: string,
  documentPath: string | null,
  chosen: boolean
) {
  if (!uri || uri.length > 16_384) throw new Error('Choose a valid script path.')
  if (uri.startsWith('open-pen:gallery/')) {
    const { galleryScripts, GALLERY_SCRIPT_PREFIX } = await import('./gallery/catalog')
    const script = galleryScripts.find((item) => `${GALLERY_SCRIPT_PREFIX}${item.id}.js` === uri)
    if (!script) throw new Error('Unknown gallery script.')
    return { source: script.source, path: null }
  }
  const path = await documentSourceFilePath(uri, documentPath, chosen)
  if (!path) throw new Error('Script file could not be read. Choose it with the file button.')
  const bytes = await readBoundedFile(path, 256_000)
  return { source: new TextDecoder('utf-8', { fatal: true }).decode(bytes), path }
}
