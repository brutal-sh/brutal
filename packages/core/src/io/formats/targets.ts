import { findPageId } from '#core/io/subgraph'
import type { ExportRequest } from '#core/io/types'

export function ensureSingleNode(target: ExportRequest['target']): string | null {
  if (target.scope === 'node') return target.nodeId
  if (target.scope === 'selection' && target.nodeIds.length === 1) return target.nodeIds[0]
  return null
}

export function resolveExportNodes(
  request: ExportRequest
): { pageId: string; nodeIds: string[] } | null {
  switch (request.target.scope) {
    case 'document': {
      const page = request.graph.getPages()[0]
      return { pageId: page.id, nodeIds: page.childIds }
    }
    case 'page': {
      const page = request.graph.getNode(request.target.pageId)
      if (!page) return null
      return { pageId: page.id, nodeIds: page.childIds }
    }
    case 'selection': {
      const first = request.target.nodeIds[0]
      if (!first) return null
      const pageId = findPageId(request.graph, first)
      if (!pageId) return null
      if (!request.target.nodeIds.every((nodeId) => findPageId(request.graph, nodeId) === pageId)) {
        throw new Error('Export selection must stay on a single page')
      }
      return { pageId, nodeIds: request.target.nodeIds }
    }
    case 'node':
      return resolveExportNodes({
        ...request,
        target: { scope: 'selection', nodeIds: [request.target.nodeId] }
      })
    default:
      return null
  }
}
