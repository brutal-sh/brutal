import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'

export interface SceneCanvas {
  r: SkiaRenderer
  canvas: Canvas
  graph: SceneGraph
}

export interface NodePaintContext extends SceneCanvas {
  node: SceneNode
}
