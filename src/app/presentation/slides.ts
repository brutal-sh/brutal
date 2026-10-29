import type { SceneGraph } from '@open-pencil/scene-graph'

export interface PresentationSlide {
  id: string
  name: string
  scale: number
}

const MAX_SLIDE_EDGE = 1920

/** Follow the top-to-bottom order shown in the Layers panel, without changing the document. */
export function collectPresentationSlides(graph: SceneGraph, pageId: string): PresentationSlide[] {
  return graph
    .getChildren(pageId)
    .toReversed()
    .filter((node) => node.type === 'FRAME' && node.visible && !node.internalOnly)
    .map((node) => ({
      id: node.id,
      name: node.name,
      scale: Math.min(2, MAX_SLIDE_EDGE / Math.max(1, node.width, node.height))
    }))
}

export function presentationIndex(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index))
}
