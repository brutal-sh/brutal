import type { NodeType } from '@open-pencil/scene-graph'
import { createConnector, freeEndpoint } from '@open-pencil/scene-graph/connectors'

import { newLayerDefaults } from '#core/editor/shapes/defaults'
import { createSVGNodes } from '#core/io/formats/svg'
import { textAutoResizeChanges } from '#core/layout/text-auto-resize'

import type { FigmaAPI } from './index'
import type { FigmaConnectorNode, FigmaFrameNode, FigmaTextNode } from './node-types'
import { setDefaultPageBackground } from './page-backgrounds'
import type { FigmaNodeProxy } from './proxy'

export function createNode(api: FigmaAPI, type: NodeType): FigmaNodeProxy {
  const defaults = newLayerDefaults(type, api.theme)
  // Figma's plugin API makes a line with no height, a 496 px section, and a hugging frame.
  if (type === 'LINE') defaults.height = 0
  if (type === 'SECTION') Object.assign(defaults, { width: 496, height: 496 })
  if (type === 'FRAME' || type === 'COMPONENT') defaults.primaryAxisSizing = 'HUG'
  const node = api.graph.createNode(type, api.currentPageId, defaults)
  return api.wrapNode(node.id)
}

export function createText(api: FigmaAPI): FigmaTextNode {
  const text = createNode(api, 'TEXT') as FigmaTextNode
  // Figma's plugin text starts empty at 12px and sizes itself to its content: no width, one
  // line tall.
  const node = api.graph.getNode(text.id)
  const defaults = { fontSize: 12, textAutoResize: 'WIDTH_AND_HEIGHT' as const, width: 0 }
  api.graph.updateNode(text.id, { ...defaults, ...textAutoResizeChanges(node, defaults) })
  return text
}

export function createSVGFrame(api: FigmaAPI, svg: string): FigmaFrameNode {
  const node = createSVGNodes(api.graph, api.currentPageId, svg, { keepEmpty: true })
  if (!node) throw new Error('in createNodeFromSvg: Failed to convert SVG file')
  return api.wrapNode(node.id) as FigmaFrameNode
}

export function createConnectorNode(api: FigmaAPI): FigmaConnectorNode {
  const node = createConnector(api.graph, api.currentPageId, {
    start: freeEndpoint(0, 0),
    end: freeEndpoint(200, 0),
    startCap: 'NONE',
    endCap: 'ARROW_LINES'
  })
  return api.wrapNode(node.id) as FigmaConnectorNode
}

export function createPage(api: FigmaAPI): FigmaNodeProxy {
  const page = api.graph.addPage('Page')
  setDefaultPageBackground(api.graph, page, api.theme)
  return api.wrapNode(page.id)
}
