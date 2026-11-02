import type { IORegistry } from '@open-pencil/core/io'
import { layoutAuthoredNodes } from '@open-pencil/core/layout'
import { prepareGraphFonts } from '@open-pencil/core/text'
import type { PenNode } from '@open-pencil/pen'
import { scaleNodeChanges } from '@open-pencil/scene-graph/scaling'

export async function scriptErrorGraph(
  io: IORegistry,
  size: { width: number; height: number },
  status: { title: string; description: string; code?: string }
) {
  const children: PenNode[] = [
    {
      type: 'path',
      id: 'error-icon',
      width: 16,
      height: 16,
      viewBox: [0, 0, 24, 24],
      // Lucide badge-x (ISC); see public/licenses/lucide.txt.
      geometry:
        'M3.85 8.62a4 4 0 0 1 4.78-4.77a4 4 0 0 1 6.74 0a4 4 0 0 1 4.78 4.78a4 4 0 0 1 0 6.74a4 4 0 0 1-4.77 4.78a4 4 0 0 1-6.75 0a4 4 0 0 1-4.78-4.77a4 4 0 0 1 0-6.76M15 9l-6 6m0-6l6 6',
      stroke: { thickness: 4 / 3, fill: '#E52E2E', cap: 'round', join: 'round' }
    },
    {
      type: 'text',
      id: 'error-title',
      width: 240,
      textGrowth: 'fixed-width',
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 16 / 12,
      textAlign: 'center',
      fill: '#E52E2E',
      content: status.title
    },
    {
      type: 'text',
      id: 'error-description',
      width: 240,
      textGrowth: 'fixed-width',
      fontFamily: 'Inter',
      fontSize: 10,
      fontWeight: 500,
      lineHeight: 1.4,
      textAlign: 'center',
      fill: '#E52E2E',
      content: status.description
    }
  ]
  if (status.code)
    children.push({
      type: 'frame',
      id: 'error-code',
      width: 240,
      height: 'fit_content',
      layout: 'vertical',
      padding: 8,
      gap: 10,
      alignItems: 'center',
      fill: '#141414',
      cornerRadius: 2,
      children: [
        {
          type: 'text',
          id: 'error-excerpt',
          width: 224,
          textGrowth: 'fixed-width',
          fontFamily: 'JetBrains Mono',
          fontSize: 10,
          fontWeight: 500,
          lineHeight: 1.2,
          fill: '#ADADB2',
          content: status.code
        }
      ]
    })
  const { graph } = await io.readDocument({
    name: 'script-error.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            type: 'rectangle',
            id: 'error-background',
            ...size,
            fill: '#FF66661A',
            stroke: '#FF6666',
            strokeWidth: 1,
            strokeAlignment: 'inner'
          },
          {
            type: 'frame',
            id: 'error-status',
            width: 240,
            height: 'fit_content',
            layout: 'vertical',
            alignItems: 'center',
            gap: 4,
            children
          }
        ]
      })
    )
  })
  await prepareGraphFonts(graph, [graph.rootId])
  layoutAuthoredNodes(graph, [graph.rootId])
  const content = graph.getNode('error-status')
  if (content) {
    const scale = Math.min(
      1,
      Math.max(0, size.width - 16) / content.width,
      Math.max(0, size.height - 16) / content.height
    )
    if (scale > 0) {
      for (const node of graph.getAllNodes())
        if (graph.closest(node.id, (ancestor) => ancestor.id === content.id))
          graph.updateNode(node.id, scaleNodeChanges(node, scale, node.id !== content.id))
      graph.updateNode(content.id, {
        x: (size.width - content.width) / 2,
        y: (size.height - content.height) / 2
      })
    } else graph.deleteNode(content.id)
  }
  return graph
}
