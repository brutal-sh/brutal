import { resolveExportNodes } from '#core/io/formats/targets'
import type { ExportRequest, IOContext, IOFormatAdapter, RasterExportOptions } from '#core/io/types'

import { headlessRenderNodes, renderNodesToImage, type RasterExportFormat } from './index'

async function renderRaster(
  request: ExportRequest,
  options: RasterExportOptions,
  context?: IOContext
): Promise<Uint8Array | null> {
  const target = resolveExportNodes(request)
  if (!target) return null
  const scale = options.scale ?? 1

  if (context?.canvasKit && context.renderer) {
    return renderNodesToImage(
      context.canvasKit,
      context.renderer,
      request.graph,
      target.pageId,
      target.nodeIds,
      {
        scale,
        format: options.format,
        quality: options.quality,
        trimTransparent: request.target.scope === 'page' || request.target.scope === 'document'
      }
    )
  }

  return headlessRenderNodes(request.graph, target.pageId, target.nodeIds, {
    scale,
    format: options.format,
    quality: options.quality,
    trimTransparent: request.target.scope === 'page' || request.target.scope === 'document'
  })
}

function rasterFormat<F extends RasterExportFormat>(format: F): IOFormatAdapter<Lowercase<F>> {
  const extension = format.toLowerCase() as Lowercase<F>
  let mimeType = 'image/png'
  if (format === 'JPG') mimeType = 'image/jpeg'
  else if (format === 'WEBP') mimeType = 'image/webp'

  return {
    id: extension,
    label: format,
    role: 'derived-export',
    category: 'raster',
    extensions: [extension],
    mimeTypes: [mimeType],
    support: {
      exportDocument: true,
      exportPage: true,
      exportSelection: true,
      exportNode: true
    },
    exportOptions: {
      scale: true,
      quality: format !== 'PNG',
      colorSpace: false
    },
    async exportContent(request, options?: RasterExportOptions, context?: IOContext) {
      const { scale, quality } = options ?? {}
      let data = await renderRaster(
        request,
        {
          format,
          scale,
          quality
        },
        context
      )
      if (!data && format === 'WEBP' && context?.encodeWebP) {
        const png = await renderRaster(request, { format: 'PNG', scale }, context)
        if (png) data = new Uint8Array(await context.encodeWebP(png, quality))
      }
      if (!data) throw new Error('Nothing to export')
      return {
        format: extension,
        mimeType,
        extension,
        data
      }
    }
  }
}

export const pngFormat = rasterFormat('PNG')
export const jpgFormat = rasterFormat('JPG')
export const webpFormat = rasterFormat('WEBP')
