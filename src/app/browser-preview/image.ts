import { fromUint8Array } from 'js-base64'

import { captureClipboardSnapshot } from '@open-pencil/core/clipboard'
import { sceneGraphFromStyledHTML } from '@open-pencil/core/io/formats/html/layers'
import type { DesignDocument } from '@open-pencil/dom-css'
import { imageHeader } from '@open-pencil/scene-graph/images'

const MAX_CAPTURE_PIXELS = 16_000_000

/** Preserve browser CSS dimensions while retaining the native PNG's display-density pixels. */
export function browserImageSnapshot(png: Uint8Array, pixelRatio: number) {
  const header = imageHeader(png)
  if (
    !header ||
    header.type !== 'image/png' ||
    header.width <= 0 ||
    header.height <= 0 ||
    header.width * header.height > MAX_CAPTURE_PIXELS ||
    !Number.isFinite(pixelRatio) ||
    pixelRatio <= 0
  )
    throw new Error('The browser returned invalid capture dimensions.')
  const document: DesignDocument = {
    type: 'document',
    children: [
      {
        type: 'element',
        tagName: 'img',
        attrs: { id: 'browser-capture-image', src: `data:image/png;base64,${fromUint8Array(png)}` },
        children: [],
        computedStyle: {
          display: 'block',
          width: `${header.width / pixelRatio}px`,
          height: `${header.height / pixelRatio}px`,
          'object-fit': 'cover'
        }
      }
    ]
  }
  const graph = sceneGraphFromStyledHTML(document)
  const root = [...graph.nodes.values()].find((node) => node.name === 'browser-capture-image')
  if (!root?.parentId) throw new Error('The browser image could not be prepared.')
  const image = graph.createNode('RECTANGLE', root.parentId, {
    name: 'Browser capture',
    width: root.width,
    height: root.height,
    fills: root.fills
  })
  return captureClipboardSnapshot(graph, [image])
}
