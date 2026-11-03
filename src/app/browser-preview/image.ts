import { fromUint8Array } from 'js-base64'

import { captureClipboardSnapshot } from '@open-pencil/core/clipboard'
import { sceneGraphFromStyledHTML } from '@open-pencil/core/io/formats/html/layers'
import type { DesignDocument } from '@open-pencil/dom-css'
import { colorToFill } from '@open-pencil/scene-graph/color'

import type { BrowserCapture } from './capture'

/** Keep native PNG pixels and captured CSS dimensions together through one atomic insertion. */
export function browserImageSnapshot(capture: BrowserCapture) {
  if (!capture.slices.length) throw new Error('The browser returned no screenshot images.')
  const document: DesignDocument = {
    type: 'document',
    children: capture.slices.map((slice, index) => ({
      type: 'element',
      tagName: 'img',
      attrs: {
        id: `browser-capture-${index}`,
        src: `data:image/png;base64,${fromUint8Array(slice.png)}`
      },
      children: [],
      computedStyle: {
        display: 'block',
        width: `${slice.width}px`,
        height: `${slice.height}px`,
        'object-fit': 'cover'
      }
    }))
  }
  const graph = sceneGraphFromStyledHTML(document)
  const sources = capture.slices.map((_, index) =>
    [...graph.nodes.values()].find((node) => node.name === `browser-capture-${index}`)
  )
  const first = sources[0]
  if (!first?.parentId || sources.some((source) => !source))
    throw new Error('The browser screenshot could not be prepared.')
  const name = capture.title.trim() || 'Screenshot'
  const width = Math.max(...capture.slices.map((slice) => slice.width))
  const height = capture.slices.reduce((sum, slice) => sum + slice.height, 0)
  const frame =
    sources.length > 1
      ? graph.createNode('FRAME', first.parentId, {
          name,
          width,
          height,
          layoutMode: 'VERTICAL',
          fills: [colorToFill('#ffffff')]
        })
      : null
  const host =
    new URL(capture.url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-') || 'site'
  let y = 0
  const images = sources.map((source, index) => {
    const slice = capture.slices.at(index)
    if (!source || !slice) throw new Error('The screenshot image disappeared during preparation.')
    const image = graph.createNode('RECTANGLE', frame?.id ?? first.parentId ?? graph.rootId, {
      name: frame ? `screenshot-${host}-${index + 1}.png` : name,
      x: 0,
      y,
      width: slice.width,
      height: slice.height,
      fills: source.fills
    })
    y += slice.height
    return image
  })
  return captureClipboardSnapshot(graph, frame ? [frame] : images)
}
