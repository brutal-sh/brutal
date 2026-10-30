import { sceneGraphFromStyledHTML } from '@open-pencil/core/io/formats/html/layers'
import type { DesignDocument, DesignElement } from '@open-pencil/dom-css'
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { ExtractedPage, ExtractedNode } from './schema'

/** Reuse CSS paint/text conversion, then retain the measured page's fixed geometry. */
export function extractedPageToGraph(page: ExtractedPage) {
  const root: DesignElement = {
    type: 'element',
    tagName: 'div',
    attrs: { id: 'browser-page-root' },
    children: [],
    computedStyle: {
      width: `${page.width}px`,
      height: `${page.height}px`,
      'background-color': page.background
    }
  }
  const elements = new Map<string, DesignElement>()
  const sources = new Map(page.nodes.map((node) => [node.id, node]))
  for (const node of page.nodes) {
    const element = measuredElement(node)
    elements.set(node.id, element)
    const parent = node.parentId === null ? root : elements.get(node.parentId)
    if (!parent) throw new Error(`${node.path}: the parent element is missing.`)
    parent.children.push(element)
  }
  const document: DesignDocument = { type: 'document', children: [root] }
  const graph = sceneGraphFromStyledHTML(document, { pageName: page.title || 'Browser import' })
  const importedRoot = [...graph.nodes.values()].find((node) => node.name === 'browser-page-root')
  if (!importedRoot) throw new Error('The page could not be converted to editable layers.')
  retainMeasuredGeometry(graph, sources)
  importedRoot.name = page.title || new URL(page.url).hostname
  importedRoot.width = page.width
  importedRoot.height = page.height
  importedRoot.clipsContent = true
  importedRoot.pluginData.push({
    pluginId: 'open-pen-browser',
    key: 'source',
    value: JSON.stringify({
      url: page.url,
      viewportWidth: page.viewportWidth,
      viewportHeight: page.viewportHeight,
      layout: 'fixed'
    })
  })
  return { graph, root: importedRoot }
}

function measuredElement(node: ExtractedNode): DesignElement {
  const element: DesignElement = {
    type: 'element',
    tagName: node.image ? 'img' : 'div',
    attrs: { id: node.id },
    children: node.type === 'text' ? [{ type: 'text', text: node.text ?? '' }] : [],
    computedStyle: {
      ...node.style,
      width: `${node.box.width}px`,
      height: `${node.box.height}px`,
      'box-sizing': 'border-box',
      display: 'block',
      position: 'absolute'
    }
  }
  if (node.image) element.attrs.src = node.image
  if (node.type === 'text' && element.computedStyle)
    Object.assign(element.computedStyle, {
      'background-color': 'transparent',
      'box-shadow': 'none',
      'border-top-left-radius': '0',
      'border-top-right-radius': '0',
      'border-bottom-left-radius': '0',
      'border-bottom-right-radius': '0',
      overflow: 'visible',
      'border-top-width': '0',
      'border-right-width': '0',
      'border-bottom-width': '0',
      'border-left-width': '0',
      opacity: '1'
    })
  return element
}

function retainMeasuredGeometry(graph: SceneGraph, sources: Map<string, ExtractedNode>) {
  for (const node of graph.nodes.values()) {
    if (node.type !== 'FRAME') continue
    node.layoutMode = 'NONE'
    node.primaryAxisSizing = 'FIXED'
    node.counterAxisSizing = 'FIXED'
    node.paddingTop = node.paddingRight = node.paddingBottom = node.paddingLeft = 0
    const source = sources.get(node.name)
    if (!source) continue
    const parentBox = source.parentId ? sources.get(source.parentId)?.box : undefined
    Object.assign(node, {
      x: source.box.x - (parentBox?.x ?? 0),
      y: source.box.y - (parentBox?.y ?? 0),
      width: source.box.width,
      height: source.box.height,
      layoutPositioning: 'ABSOLUTE'
    })
    node.name = source.type === 'text' ? source.text?.trim().slice(0, 48) || 'Text' : source.tag
    if (source.type === 'text') {
      for (const text of graph.getChildren(node.id)) {
        if (text.type !== 'TEXT') continue
        Object.assign(text, {
          x: 0,
          y: 0,
          width: source.box.width,
          height: source.box.height,
          textAutoResize: 'NONE',
          layoutPositioning: 'ABSOLUTE'
        })
      }
    }
  }
}
