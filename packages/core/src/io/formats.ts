import { sceneNodeToJSX, selectionToJSX } from '@open-pencil/design-jsx'
import { isDrawIOExportFileName } from '@open-pencil/drawio'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { layoutAuthoredNodes } from '#core/layout'

import type { DrawIOExportTarget } from './formats/drawio/export'
import { figFormat, jamFormat } from './formats/fig/adapter'
import { mermaidFormat } from './formats/mermaid/adapter'
import { penFormat } from './formats/pen/adapter'
import type { PPTXExportOptions } from './formats/pptx'
import { jpgFormat, pngFormat, webpFormat } from './formats/raster/adapter'
import { EXPORT_EVERY_TARGET, FIXED_SIZE_EXPORT, lowerExt } from './formats/shared'
import { sketchFormat } from './formats/sketch/adapter'
import { ensureSingleNode, resolveExportNodes } from './formats/targets'
import type {
  ExportRequest,
  ExportResult,
  HTMLExportOptions,
  IOContext,
  IOFormatAdapter,
  SVGExportOptions
} from './types'

export { figFormat, jpgFormat, mermaidFormat, penFormat, pngFormat, webpFormat }

export const drawioFormat: IOFormatAdapter<'drawio'> = {
  id: 'drawio',
  label: 'draw.io Diagram',
  role: 'interchange-document',
  category: 'document',
  extensions: ['drawio', 'dio'],
  mimeTypes: ['application/vnd.jgraph.mxfile'],
  support: {
    readDocument: true,
    writeDocument: true,
    exportDocument: true,
    exportPage: true,
    exportSelection: true,
    exportNode: true
  },
  exportOptions: FIXED_SIZE_EXPORT,
  laysOutOnRead: true,
  // A draw.io PNG or SVG export opens as its diagram when its name says it is one.
  matchesFile(fileName, mimeType) {
    const ext = lowerExt(fileName)
    return (
      ext === 'drawio' ||
      ext === 'dio' ||
      isDrawIOExportFileName(fileName) ||
      mimeType === 'application/vnd.jgraph.mxfile'
    )
  },
  async readDocument(input) {
    const { readDrawIOBytes } = await import('@open-pencil/drawio')
    const { drawioToSceneGraph } = await import('./formats/drawio')
    const file = readDrawIOBytes(input.data)
    if (!file) throw new Error('This file holds no draw.io diagram')
    if (file.unreadable.length > 0) {
      throw new Error(`Could not read the draw.io pages ${file.unreadable.join(', ')}`)
    }
    const graph = drawioToSceneGraph(file)
    // draw.io stores label text, not the sizes it lays out to.
    layoutAuthoredNodes(
      graph,
      graph.getPages().map((page) => page.id)
    )
    return { graph, sourceFormat: 'drawio' }
  },
  async writeDocument(graph) {
    const pageIds = graph.getPages().map((page) => page.id)
    return writeDrawIO(graph, { pageIds })
  },
  // A page or a selection goes as a one-page diagram; the document, every page.
  async exportContent(request) {
    if (request.target.scope === 'document') {
      const pageIds = request.graph.getPages().map((page) => page.id)
      return writeDrawIO(request.graph, { pageIds })
    }
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    return writeDrawIO(request.graph, target)
  }
}

/** Pages or layers as a draw.io file, loading the writer only when one is saved. */
async function writeDrawIO(graph: SceneGraph, target: DrawIOExportTarget): Promise<ExportResult> {
  const { writeDrawIOFile } = await import('@open-pencil/drawio')
  const { sceneGraphToDrawIO } = await import('./formats/drawio')
  return {
    format: 'drawio',
    mimeType: 'application/vnd.jgraph.mxfile',
    extension: 'drawio',
    data: writeDrawIOFile(sceneGraphToDrawIO(graph, target)),
    encoding: 'utf8'
  }
}

export const svgFormat: IOFormatAdapter<'svg'> = {
  id: 'svg',
  label: 'SVG',
  role: 'derived-export',
  category: 'vector',
  extensions: ['svg'],
  mimeTypes: ['image/svg+xml'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: { ...FIXED_SIZE_EXPORT, colorSpace: true },
  async exportContent(request, options?: SVGExportOptions) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToLaidOutSVG } = await import('./formats/svg/text/layout')
    const data = await renderNodesToLaidOutSVG(
      request.graph,
      target.pageId,
      target.nodeIds,
      options
    )
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'svg',
      mimeType: 'image/svg+xml',
      extension: 'svg',
      data,
      encoding: 'utf8'
    }
  }
}

export const pdfFormat: IOFormatAdapter<'pdf'> = {
  id: 'pdf',
  label: 'PDF',
  role: 'derived-export',
  category: 'vector',
  extensions: ['pdf'],
  mimeTypes: ['application/pdf'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: { mode?: 'single' | 'frames' }, context?: IOContext) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    // Embedded, as Figma embeds every face its PDFs draw.
    const { exportPDFDocument, planPDFPages } = await import('./formats/pdf')
    const pages = planPDFPages(request.graph, {
      mode: options?.mode === 'frames' ? 'frames' : 'single',
      ids: target.nodeIds,
      currentPageId: target.pageId
    })
    const data = (await exportPDFDocument(request.graph, pages, { embedFonts: true, context }))
      ?.data
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      data
    }
  }
}

/**
 * Every top-level frame becomes a slide, so a PPTX document export spans all
 * pages — the shared resolver only reaches the first one.
 */
function resolvePPTXExportNodes(
  request: ExportRequest
): { pageId: string; nodeIds: string[] } | null {
  if (request.target.scope !== 'document') return resolveExportNodes(request)
  const pages = request.graph.getPages()
  if (!pages.length) return null
  return { pageId: pages[0].id, nodeIds: pages.flatMap((page) => page.childIds) }
}

export const pptxFormat: IOFormatAdapter<'pptx'> = {
  id: 'pptx',
  label: 'PowerPoint',
  role: 'derived-export',
  category: 'print',
  extensions: ['pptx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: PPTXExportOptions, context?: IOContext) {
    const target = resolvePPTXExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToPPTX } = await import('./formats/pptx')
    const data = await renderNodesToPPTX(request.graph, target.pageId, target.nodeIds, {
      ...options,
      context: options?.context ?? context
    })
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
      data
    }
  }
}

export const jsxFormat: IOFormatAdapter<'jsx'> = {
  id: 'jsx',
  label: 'JSX',
  role: 'derived-export',
  category: 'code',
  extensions: ['jsx'],
  mimeTypes: ['text/plain', 'text/jsx'],
  support: {
    exportSelection: true,
    exportNode: true
  },
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request): Promise<ExportResult> {
    const nodeId = ensureSingleNode(request.target)
    let data = ''
    if (nodeId) {
      data = sceneNodeToJSX(nodeId, request.graph)
    } else if (request.target.scope === 'selection') {
      data = selectionToJSX(request.target.nodeIds, request.graph)
    }
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'jsx',
      mimeType: 'text/plain',
      extension: 'jsx',
      data,
      encoding: 'utf8'
    }
  }
}

export const htmlFormat: IOFormatAdapter<'html'> = {
  id: 'html',
  label: 'HTML',
  role: 'derived-export',
  category: 'code',
  extensions: ['html'],
  mimeTypes: ['text/html'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request, options?: HTMLExportOptions) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { renderNodesToHTML } = await import('./formats/html')
    const { html, assets } = await renderNodesToHTML(
      request.graph,
      target.nodeIds,
      options,
      request.fileName
    )
    return {
      format: 'html',
      mimeType: 'text/html',
      extension: 'html',
      data: html,
      encoding: 'utf8',
      assets
    }
  }
}

export const tailwindJSXFormat: IOFormatAdapter<'tailwind-jsx'> = {
  id: 'tailwind-jsx',
  label: 'Tailwind JSX',
  role: 'derived-export',
  category: 'code',
  extensions: ['jsx'],
  mimeTypes: ['text/plain', 'text/jsx'],
  support: EXPORT_EVERY_TARGET,
  exportOptions: FIXED_SIZE_EXPORT,
  async exportContent(request) {
    const target = resolveExportNodes(request)
    if (!target) throw new Error('Nothing to export')
    const { sceneNodesToTailwindJSX } = await import('@open-pencil/dom-css/export')
    const { vectorElement } = await import('#core/io/formats/html/vectors')
    const data = sceneNodesToTailwindJSX(request.graph, target.nodeIds, { vectorElement })
    if (!data) throw new Error('Nothing to export')
    return {
      format: 'tailwind-jsx',
      mimeType: 'text/plain',
      extension: 'jsx',
      data,
      encoding: 'utf8'
    }
  }
}

export const BUILTIN_IO_FORMATS = [
  figFormat,
  jamFormat,
  sketchFormat,
  penFormat,
  drawioFormat,
  mermaidFormat,
  pngFormat,
  jpgFormat,
  webpFormat,
  svgFormat,
  pdfFormat,
  pptxFormat,
  jsxFormat,
  tailwindJSXFormat,
  htmlFormat
] as const satisfies readonly IOFormatAdapter[]

export type BuiltinIOFormatId = (typeof BUILTIN_IO_FORMATS)[number]['id']
