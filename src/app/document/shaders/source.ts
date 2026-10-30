import { MAX_FRAGMENT_SOURCE_LENGTH, type FragmentShader } from '@open-pencil/scene-graph/shaders'
import { createFragmentRenderer } from '@open-pencil/vue/canvas/surface'

import { documentAssetPath, documentAssetReader } from '@/app/document/io/assets'
import { readBoundedBody } from '@/app/document/io/browser'
import { isTauri } from '@/app/tauri/env'
import { readBoundedFile } from '@/app/tauri/files'

/** Automatic watches only follow document-local references or files explicitly chosen here. */
export async function fragmentSourceFilePath(
  url: string,
  documentPath: string | null,
  chosen: boolean
) {
  if (!isTauri() || /^https?:/i.test(url)) return null
  if (url.startsWith('/') || /^file:/i.test(url)) {
    if (!chosen) return null
    if (!/^file:/i.test(url)) return url
    const file = new URL(url)
    return file.hostname ? null : decodeURIComponent(file.pathname)
  }
  return documentPath ? documentAssetPath(documentPath, decodeURIComponent(url)) : null
}

/** Compile before replacing the current paint, keeping diagnostics beside the source field. */
export async function validateFragmentSource(shader: FragmentShader) {
  const renderer = createFragmentRenderer(shader)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    await renderer.initialize(canvas)
    await renderer.renderFrame()
  } finally {
    renderer.dispose()
  }
}

/** Explicit source loading, with the document reader's existing boundary for relative files. */
export async function loadFragmentSource(
  url: string,
  documentPath?: string | null,
  signal?: AbortSignal
): Promise<FragmentShader> {
  const path = url.trim()
  if (!path || path.length > 16384) throw new Error('Choose a valid shader path or URL.')
  let bytes: Uint8Array | null
  if (/^https?:\/\//i.test(path)) {
    const response = await fetch(path, {
      credentials: 'omit',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000)
    })
    if (!response.ok) throw new Error(`Shader request failed (${response.status}).`)
    bytes = await readBoundedBody(response, MAX_FRAGMENT_SOURCE_LENGTH)
  } else if (isTauri() && (path.startsWith('/') || /^file:/i.test(path))) {
    const fileURL = /^file:/i.test(path) ? new URL(path) : null
    if (fileURL?.hostname) throw new Error('Remote file hosts are not supported.')
    const local = fileURL ? decodeURIComponent(fileURL.pathname) : path
    bytes = await readBoundedFile(local, MAX_FRAGMENT_SOURCE_LENGTH)
  } else {
    bytes =
      (await documentAssetReader(documentPath ?? undefined)?.(decodeURIComponent(path), {
        maxBytes: MAX_FRAGMENT_SOURCE_LENGTH
      })) ?? null
  }
  signal?.throwIfAborted()
  if (!bytes) throw new Error('Shader file could not be read. Choose it with the file button.')
  if (bytes.byteLength > MAX_FRAGMENT_SOURCE_LENGTH) throw new Error('Shader source is too large.')
  return {
    url: path,
    source: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    uniforms: {}
  }
}
