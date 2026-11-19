import { SceneGraph } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'
import { fitEnclosingGroups } from '@open-pencil/scene-graph/group-bounds'

import { storeImage } from '#core/figma-api/images'

import type { PhotoshopArtwork, PhotoshopLayer, PhotoshopLayersResult } from './decode'

function addLayers(
  graph: SceneGraph,
  parent: string,
  layers: PhotoshopLayer[],
  groups: string[]
): void {
  for (const layer of layers) {
    const style = { name: layer.name, visible: layer.visible, opacity: layer.opacity }
    if (layer.kind === 'group') {
      const group = graph.createNode('GROUP', parent, {
        ...style,
        blendMode: layer.isolated ? 'NORMAL' : 'PASS_THROUGH'
      })
      addLayers(graph, group.id, layer.children, groups)
      if (layer.children.length) groups.push(group.id)
    } else {
      graph.createNode('RECTANGLE', parent, {
        ...style,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        fills: layer.png
          ? [
              {
                type: 'IMAGE',
                color: BLACK,
                opacity: 1,
                visible: true,
                imageHash: storeImage(graph, layer.png),
                imageScaleMode: 'FILL'
              }
            ]
          : []
      })
    }
  }
}

export function photoshopLayersToScene(artwork: PhotoshopArtwork, name: string): SceneGraph {
  const graph = new SceneGraph()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    name,
    width: artwork.width,
    height: artwork.height,
    fills: [],
    clipsContent: true
  })
  const groups: string[] = []
  addLayers(graph, frame.id, artwork.layers, groups)
  fitEnclosingGroups(graph, groups)
  return graph
}

export function openPhotoshopLayers(
  bytes: ArrayBuffer,
  signal: AbortSignal
): Promise<PhotoshopLayersResult> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    let worker: Worker
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    } catch {
      resolve({ reason: 'The layer reader could not start.' })
      return
    }
    const timeout = setTimeout(
      () => finish({ reason: 'Working with the layer data took too long.' }),
      15_000
    )
    function cleanUp() {
      clearTimeout(timeout)
      worker.terminate()
      signal.removeEventListener('abort', abort)
    }
    function finish(result: PhotoshopLayersResult) {
      cleanUp()
      resolve(result)
    }
    function abort() {
      cleanUp()
      reject(signal.reason instanceof Error ? signal.reason : new Error('Layer import cancelled.'))
    }
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<PhotoshopLayersResult>) => finish(event.data)
    worker.onerror = () => finish({ reason: 'The layer data could not be read.' })
    const copy = bytes.slice(0)
    try {
      worker.postMessage(copy, [copy])
    } catch {
      finish({ reason: 'The layer data could not be sent to the reader.' })
    }
  })
}
