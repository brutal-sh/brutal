import * as v from 'valibot'

import { INTERNAL_GRAPH } from '#core/figma-api/proxy'
import { defineTool, nodeSummary } from '#core/tools/schema'

import type { AppState } from './schema'

export const getAppState = defineTool({
  name: 'get_app_state',
  description:
    'Read the selected document graph identity, current page and selection summaries. Graph rootId is not an app document target ID. Does not change selection, view, history or files.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({}),
  execute: (figma): AppState => {
    const page = figma.graph.getNode(figma.currentPageId)
    if (page?.type !== 'CANVAS') throw new Error('Page not found in the selected document')
    const root = figma.graph.getNode(figma.graph.rootId)
    if (!root) throw new Error('Selected document not found')
    const selection = figma.currentPage.selection.flatMap((selected) => {
      if (selected[INTERNAL_GRAPH] !== figma.graph) return []
      const node = figma.graph.getNode(selected.id)
      return node && figma.graph.pageOf(node.id) === page.id ? [nodeSummary(selected)] : []
    })
    return {
      graph: { rootId: root.id, name: root.name },
      page: { id: page.id, name: page.name },
      selection
    }
  }
})
