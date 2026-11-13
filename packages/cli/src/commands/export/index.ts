import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'

import { defineCommand } from 'citty'
import { isValid, toUint8Array } from 'js-base64'

import type { ExportResult, ExportTarget } from '@open-pencil/core/io'
import { writeFileAtomic } from '@open-pencil/core/node/fs'
import type { AutomationDocumentSummary } from '@open-pencil/core/rpc'

import { isAppMode, requireFile, rpc } from '#cli/app/client'
import { appTargetRPCArgs } from '#cli/app/target'
import { ok, printError } from '#cli/format'
import {
  loadDocument,
  populateDocumentPage,
  populateWholeDocument,
  requirePage
} from '#cli/headless'

import { exportArgs, validateExportArgs, type ExportArgs } from './args'
import { applyExportFontPolicy, exportFontRoots } from './font-policy'
import { FORMAT_LIST, formatSupportsScale, io } from './formats'
import { exportStorybookFromFile } from './storybook'

async function writeAndLog(path: string, content: string | Uint8Array) {
  await writeFileAtomic(path, content, { fallback: 'refuse' })
  const size = content.length
  console.log(ok(`Exported ${path} (${(size / 1024).toFixed(1)} KB)`))
}

/** The app addresses pages by ID, so look the `--page` name up in the target document. */
async function appPageId(args: ExportArgs, pageName: string): Promise<string> {
  const { documents } = await rpc<{ documents: AutomationDocumentSummary[] }>('list_documents')
  const documentId = args['document-id']
  const document = documents.find((doc) => (documentId ? doc.id === documentId : doc.active))
  if (!document) {
    printError(documentId ? `Document "${documentId}" not found.` : 'No active document.')
    process.exit(1)
  }
  const page = document.pages.find((candidate) => candidate.name === pageName)
  if (!page) {
    const available = document.pages.map((candidate) => candidate.name).join(', ')
    printError(`Page "${pageName}" not found. Available: ${available}`)
    process.exit(1)
  }
  return page.id
}

async function appExportTarget(args: ExportArgs) {
  const target = appTargetRPCArgs(args)
  if (!args.page) return target
  if (args.node || args['page-id']) {
    printError(`--page and ${args.node ? '--node' : '--page-id'} cannot be used together.`)
    process.exit(1)
  }
  target.page_id = await appPageId(args, args.page)
  return target
}

const FILE_ONLY_FORMATS = new Set(['JSX', 'HTML', 'FIG', 'PPTX', 'STORYBOOK'])

function decodeExportBase64(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !isValid(value))
    throw new Error('Invalid Base64 export response.')
  const data = toUint8Array(value)
  if (!data.length) throw new Error('Empty export response.')
  return data
}

async function exportVectorViaApp(
  format: 'SVG' | 'PDF',
  args: ExportArgs,
  target: ReturnType<typeof appTargetRPCArgs>
) {
  const result = await rpc<{ svg?: string; base64?: string }>('tool', {
    ...target,
    name: format === 'SVG' ? 'export_svg' : 'export_pdf',
    args: { ids: args.node ? [args.node] : undefined }
  })
  const encoded = format === 'SVG' ? result.svg : result.base64
  if (!encoded) {
    printError('Nothing to export.')
    process.exit(1)
  }
  const content = format === 'SVG' ? encoded : decodeExportBase64(encoded)
  await writeAndLog(resolve(args.output ?? `export.${format.toLowerCase()}`), content)
}

async function exportViaApp(format: string, args: ExportArgs) {
  const targetArgs = await appExportTarget(args)
  if (format === 'SVG' || format === 'PDF') {
    await exportVectorViaApp(format, args, targetArgs)
    return
  }
  if (FILE_ONLY_FORMATS.has(format)) {
    printError(`${format} export is only available in file mode right now.`)
    process.exit(1)
  }
  const result = await rpc<{ base64: string }>('export', {
    ...targetArgs,
    nodeIds: args.node ? [args.node] : undefined,
    // Without a node or a page the app exports the selection.
    scope: !args.node && targetArgs.page_id ? 'page' : undefined,
    scale: Number(args.scale),
    format: format.toLowerCase()
  })
  const data = decodeExportBase64(result.base64)
  await writeAndLog(resolve(args.output ?? `export.${format.toLowerCase()}`), data)
}

function exportFileName(defaultName: string, extension: string, scale?: number): string {
  return scale ? `${defaultName}@${scale}x.${extension}` : `${defaultName}.${extension}`
}

function targetLabel(pageName?: string, nodeId?: string, wholeDocument = false): string {
  if (wholeDocument) return 'whole document'
  if (nodeId) return `node ${nodeId}`
  return pageName ? `page "${pageName}"` : 'first page'
}

/** Writes the export and the files it refers to, which sit next to it. */
async function writeExport(output: string, result: ExportResult) {
  await writeAndLog(output, result.data)
  const assets = result.assets ?? []
  for (const asset of assets) {
    const assetPath = join(dirname(output), asset.path)
    await mkdir(dirname(assetPath), { recursive: true })
    await writeFile(assetPath, asset.content)
  }
  if (assets.length > 0) console.log(ok(`Assets: ${assets.length} files`))
}

function prepareGraphForExport(
  graph: Awaited<ReturnType<typeof loadDocument>>,
  pageId: string,
  format: string,
  args: ExportArgs
): boolean {
  const wholeDocument = (format === 'FIG' || format === 'PPTX') && !args.page && !args.node
  if (wholeDocument || args.node) populateWholeDocument(graph)
  else populateDocumentPage(graph, pageId)
  return wholeDocument
}

function fileExportTarget(
  pageId: string,
  nodeId: string | undefined,
  wholeDocument: boolean
): ExportTarget {
  if (wholeDocument) return { scope: 'document' }
  return nodeId ? { scope: 'node', nodeId } : { scope: 'page', pageId }
}

function exportOptions(format: string, args: ExportArgs): unknown {
  if (format === 'FIG') return { renderThumbnail: true }
  if (format === 'HTML')
    return { html: args.html, style: args.css, assets: args.assets, fonts: args.fonts ?? 'none' }
  if (formatSupportsScale(format))
    return {
      format,
      scale: Number(args.scale),
      quality: args.quality ? Number(args.quality) : undefined
    }
  return undefined
}

async function exportFromFile(format: string, args: ExportArgs) {
  const file = requireFile(args.file)
  const graph = await loadDocument(file)
  const pages = graph.getPages()
  const page = requirePage(graph, args.page)

  const defaultName = basename(file, extname(file))

  if (args.page && args.node) {
    printError('--page and --node cannot be used together.')
    process.exit(1)
  }

  const wholeDocument = prepareGraphForExport(graph, page.id, format, args)

  const target = fileExportTarget(page.id, args.node, wholeDocument)
  await applyExportFontPolicy(
    graph,
    exportFontRoots(
      args.node,
      page.id,
      pages.map((candidate) => candidate.id),
      wholeDocument
    ),
    format,
    args['font-policy']
  )

  if (args.thumbnail) {
    printError('Thumbnail export is not supported by the shared file export path yet.')
    process.exit(1)
  }

  // `--style tailwind` keeps the JSX spelling of the Tailwind JSX format.
  const formatId =
    format === 'JSX' && args.style === 'tailwind' ? 'tailwind-jsx' : format.toLowerCase()
  const scale = formatSupportsScale(format) ? Number(args.scale) : undefined
  const extension = io.getFormat(formatId)?.extensions[0] ?? formatId
  const output = resolve(args.output ?? exportFileName(defaultName, extension, scale))
  const result = await io.exportContent(
    formatId,
    { graph, target, fileName: basename(output) },
    exportOptions(format, args)
  )
  await writeExport(output, result)
  console.log(ok(`Target: ${targetLabel(args.page, args.node, wholeDocument)}`))
}

export default defineCommand({
  meta: { description: `Export a document to ${FORMAT_LIST}` },
  args: exportArgs,
  async run({ args }) {
    const format = validateExportArgs(args)

    if (isAppMode(args.file)) {
      await exportViaApp(format, args)
    } else if (format === 'STORYBOOK') {
      await exportStorybookFromFile(args)
    } else {
      await exportFromFile(format, args)
    }
  }
})
