import * as v from 'valibot'

import { toolNumber, defineTool } from '#core/tools/schema'

import { autoDepth, describeOneNode } from './tree'

export const describe = defineTool({
  name: 'describe',
  description:
    'Describe the layout and design of specific nodes. Find their IDs with get_selection or get_page_tree first. Pass `id` for one node or `ids` for several. Omit depth for automatic detail based on the subtree size.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({
    id: v.optional(v.pipe(v.string(), v.description('Node ID (single node)'))),
    ids: v.optional(
      v.pipe(
        v.array(v.string()),
        v.minLength(1),
        v.description('Node IDs (multiple nodes in one call)')
      )
    ),
    depth: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Override depth (auto if omitted, max: 5)')))
    ),
    grid: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Grid size for alignment checks (default: 8)')))
    )
  }),
  execute: (figma, args) => {
    const gridSize = args.grid ?? 8

    if (args.ids && Array.isArray(args.ids)) {
      return {
        nodes: args.ids.map((nodeId) => {
          const depth = Math.min(args.depth ?? autoDepth(figma.graph, nodeId), 5)
          return describeOneNode(figma, nodeId, depth, gridSize)
        })
      }
    }

    if (!args.id) {
      return {
        error:
          'Describe needs a node ID. Find the target with get_selection or get_page_tree, then retry with id or ids.'
      }
    }
    const depth = Math.min(args.depth ?? autoDepth(figma.graph, args.id), 5)
    return describeOneNode(figma, args.id, depth, gridSize)
  }
})
