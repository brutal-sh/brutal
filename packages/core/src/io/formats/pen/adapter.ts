import {
  assertPenCompatible,
  buildPenGraph,
  isDataURL,
  parsePenDocument,
  penAssets,
  writePenDocument,
  type PenOverride
} from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { MAX_FRAGMENT_SOURCE_LENGTH } from '@open-pencil/scene-graph/shaders'

import { withTextShaper } from '#core/canvas/text/shape'
import { getCanvasKit } from '#core/canvaskit'
import { defaultIcons } from '#core/icons'
import { EXPORT_EVERY_TARGET, FIXED_SIZE_EXPORT, lowerExt } from '#core/io/formats/shared'
import { extractExportGraph } from '#core/io/subgraph'
import type { ExportResult, IOFormatAdapter, ReadDocumentInput } from '#core/io/types'
import { layoutAuthoredNodes } from '#core/layout'
import { withTextMeasurer } from '#core/layout/text-measurement'
import { prepareGraphFonts } from '#core/text/prepare'

import { loadPenIcons } from './icons'

/**
 * An image's bytes: a data URL decoded by the platform's own URL handling, a file through the
 * host; null when either fails.
 */
async function loadPenImage(url: string, input: ReadDocumentInput): Promise<Uint8Array | null> {
  try {
    if (!isDataURL(url)) return (await input.readAsset?.(url)) ?? null
    // Through `URL`, which lowercases the scheme for runtimes that only fetch `data:`.
    return new Uint8Array(await (await fetch(new URL(url))).arrayBuffer())
  } catch {
    return null
  }
}

async function loadPenImages(
  urls: readonly string[],
  input: ReadDocumentInput
): Promise<Map<string, Uint8Array>> {
  const images = new Map<string, Uint8Array>()
  await Promise.all(
    urls.map(async (url) => {
      const bytes = await loadPenImage(url, input)
      if (bytes) images.set(url, bytes)
    })
  )
  return images
}

async function loadPenShaders(urls: readonly string[], input: ReadDocumentInput) {
  const sources = new Map<string, string>()
  await Promise.all(
    urls.map(async (url) => {
      try {
        const bytes = await input.readAsset?.(decodeURIComponent(url), {
          maxBytes: MAX_FRAGMENT_SOURCE_LENGTH
        })
        if (bytes && bytes.byteLength <= MAX_FRAGMENT_SOURCE_LENGTH)
          sources.set(url, new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      } catch (error) {
        // Keep the source URL and any saved snapshot when an external file is unavailable.
        console.warn('Could not load a shader source', error)
      }
    })
  )
  return sources
}

export const penFormat: IOFormatAdapter<'pen'> = {
  id: 'pen',
  label: 'Pencil Document',
  role: 'interchange-document',
  category: 'document',
  extensions: ['pen'],
  mimeTypes: ['application/json', 'text/plain'],
  support: {
    readDocument: true,
    writeDocument: true,
    ...EXPORT_EVERY_TARGET
  },
  exportOptions: FIXED_SIZE_EXPORT,
  async writeDocument(graph) {
    return penExportResult(graph)
  },
  async exportContent(request) {
    const graph =
      request.target.scope === 'document'
        ? request.graph
        : extractExportGraph(request.graph, request.target).graph
    return penExportResult(graph)
  },
  laysOutOnRead: true,
  matchesFile(fileName, mimeType) {
    return lowerExt(fileName) === 'pen' || mimeType === 'application/json'
  },
  async readDocument(input, context) {
    const doc = parsePenDocument(new TextDecoder().decode(input.data))
    assertPenCompatible(doc)
    const assets = penAssets(doc)
    const [images, icons, shaders] = await Promise.all([
      loadPenImages(assets.images, input),
      loadPenIcons(assets.icons, context?.icons ?? defaultIcons),
      loadPenShaders(assets.shaders, input)
    ])
    // A .pen file stores its layout intent, not the sizes and positions it implies.
    const build = () =>
      buildPenGraph(doc, {
        images,
        icons: icons.source,
        shaders,
        layout: (target) =>
          layoutAuthoredNodes(
            target,
            target.getPages().map((page) => page.id)
          )
      })
    let graph = build()
    if (await icons.loadMissing()) graph = build()
    const pages = graph.getPages().map((page) => page.id)
    const fonts = await prepareGraphFonts(graph, pages)
    if (fonts.faces.length) {
      const ck = context?.canvasKit ?? (await getCanvasKit())
      // Pen text uses the canvas paragraph metrics regardless of other open documents.
      await withTextShaper(ck, async (_shape, measure) =>
        withTextMeasurer(measure, () => layoutAuthoredNodes(graph, pages))
      )
    }
    return { graph, sourceFormat: 'pen' }
  }
}

function hasLegacyLine(node: PenOverride): boolean {
  return (
    node.type === 'line' ||
    (node.children?.some(hasLegacyLine) ?? false) ||
    Object.values(node.descendants ?? {}).some(hasLegacyLine)
  )
}

function penExportResult(graph: SceneGraph): ExportResult {
  const doc = writePenDocument(graph)
  // shortcut: retain legacy line headers until current-schema line export is qualified.
  if (!doc.children.some(hasLegacyLine)) doc.version = '2.22'
  return {
    format: 'pen',
    mimeType: 'application/json',
    extension: 'pen',
    data: `${JSON.stringify(doc, null, 2)}\n`,
    encoding: 'utf8'
  }
}
