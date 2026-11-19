import * as v from 'valibot'

import { SceneGraph, type NodeType, type SceneNode } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'
import { imageHeader } from '@open-pencil/scene-graph/images'

import { storeImage } from '#core/figma-api/images'
import type { ReadDocumentResult } from '#core/io/types'

import { sketchAppearance, sketchCorners, sketchText } from './appearance'
import { readSketchArchive, readSketchJSON, type SketchArchive } from './archive'
import {
  sketchDocumentSchema,
  sketchLayerSchema,
  sketchPageSchema,
  type SketchLayer
} from './schema'

const SKETCH_LAYER_TYPES = new Map<string, NodeType>([
  ['artboard', 'FRAME'],
  ['group', 'GROUP'],
  ['rectangle', 'RECTANGLE'],
  ['oval', 'ELLIPSE'],
  ['text', 'TEXT'],
  ['bitmap', 'RECTANGLE']
])
const MAX_LAYER_DEPTH = 64
const MAX_LAYERS = 20_000
const MAX_IMAGE_PIXELS = 16_000_000

function sketchBitmap(imageHash: string): Partial<SceneNode> {
  return {
    fills: [
      {
        type: 'IMAGE',
        visible: true,
        opacity: 1,
        color: BLACK,
        imageHash,
        imageScaleMode: 'CROP',
        imageTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ]
  }
}

class SketchImport {
  readonly graph = new SceneGraph()
  readonly omissions = new Set<string>()
  private layerCount = 0
  private readonly images = new Map<string, string | null>()

  constructor(private readonly archive: SketchArchive) {}

  addLayers(rawLayers: readonly unknown[], parentId: string, depth = 0) {
    if (depth > MAX_LAYER_DEPTH) throw new Error('The Sketch file exceeds the layer nesting limit.')
    let insideMask = false
    for (const input of rawLayers) {
      if (++this.layerCount > MAX_LAYERS)
        throw new Error('The Sketch file exceeds the layer count limit.')
      const result = v.safeParse(sketchLayerSchema, input, { abortEarly: true })
      if (!result.success) throw new Error('The Sketch file contains invalid layer data.')
      const layer = result.output
      if (layer.shouldBreakMaskChain) insideMask = false
      if (layer.hasClippingMask) insideMask = true
      if (insideMask) {
        this.omissions.add('clipping masks and masked layers')
        continue
      }
      const node = this.addLayer(layer, parentId)
      if (node && layer.layers.length) this.addLayers(layer.layers, node.id, depth + 1)
    }
  }

  private addLayer(layer: SketchLayer, parentId: string) {
    const type = SKETCH_LAYER_TYPES.get(layer._class)
    if (!type) {
      this.omissions.add('unsupported layer types')
      return undefined
    }
    const content = this.layerContent(layer)
    if (!content) return undefined
    return this.graph.createNode(type, parentId, {
      ...layer.frame,
      name: layer.name,
      rotation: layer.rotation ? -layer.rotation : 0,
      visible: layer.isVisible,
      locked: layer.isLocked,
      flipX: layer.isFlippedHorizontal,
      flipY: layer.isFlippedVertical,
      clipsContent: layer._class === 'artboard',
      ...sketchAppearance(layer, this.omissions),
      ...content
    })
  }

  private imageHash(ref: string): string | null {
    const cached = this.images.get(ref)
    if (cached !== undefined) return cached
    const bytes = this.archive[ref]
    const header = bytes && imageHeader(bytes)
    const hash =
      bytes && header?.width && header.height && header.width * header.height <= MAX_IMAGE_PIXELS
        ? storeImage(this.graph, bytes)
        : null
    this.images.set(ref, hash)
    return hash
  }

  private layerContent(layer: SketchLayer) {
    switch (layer._class) {
      case 'rectangle':
        return sketchCorners(layer)
      case 'text':
        return sketchText(layer, this.omissions)
      case 'bitmap': {
        const hash = layer.image && this.imageHash(layer.image._ref)
        if (hash) return sketchBitmap(hash)
        this.omissions.add('missing or unsupported images')
        return undefined
      }
      default:
        return {}
    }
  }
}

export function readSketchDocument(bytes: Uint8Array): ReadDocumentResult {
  const archive = readSketchArchive(bytes)
  const sketch = readSketchJSON(archive, 'document.json', sketchDocumentSchema)
  const importer = new SketchImport(archive)
  const graph = importer.graph
  const firstPage = graph.getPages()[0]
  for (const [index, { _ref }] of sketch.pages.entries()) {
    const path = _ref.endsWith('.json') ? _ref : `${_ref}.json`
    const page = readSketchJSON(archive, path, sketchPageSchema)
    const target = index === 0 ? firstPage : graph.addPage(page.name)
    if (index === 0) graph.updateNode(target.id, { name: page.name })
    importer.addLayers(page.layers, target.id)
  }
  if (importer.omissions.size && graph.getPages().every((page) => page.childIds.length === 0)) {
    throw new Error('The Sketch file contains no supported layers to import.')
  }
  return { graph, sourceFormat: 'sketch', importWarnings: [...importer.omissions] }
}
