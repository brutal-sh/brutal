import type { SceneNode, SceneGraph } from '@open-pencil/scene-graph'

import * as LabelHitTest from '#core/canvas/labels/hit-test'
import { labelHitOptions } from '#core/canvas/labels/style'
import type { SkiaRenderer } from '#core/canvas/renderer'
import type { RenderOverlays } from '#core/canvas/renderer/types'

export const rendererLabelsMethods = {
  hitTestSectionTitle(
    graph: SceneGraph,
    canvasX: number,
    canvasY: number,
    preview?: RenderOverlays['rotationPreview']
  ): SceneNode | null {
    return LabelHitTest.hitTestSectionTitle(
      graph,
      canvasX,
      canvasY,
      this.zoom,
      this.pageId ?? graph.rootId,
      this.sectionTitleFont,
      this.labelCache,
      labelHitOptions(this, graph, preview)
    )
  },

  hitTestComponentLabel(
    graph: SceneGraph,
    canvasX: number,
    canvasY: number,
    preview?: RenderOverlays['rotationPreview']
  ): SceneNode | null {
    return LabelHitTest.hitTestComponentLabel(
      graph,
      canvasX,
      canvasY,
      this.zoom,
      this.pageId ?? graph.rootId,
      this.componentLabelFont,
      this.labelCache,
      labelHitOptions(this, graph, preview)
    )
  },

  hitTestFrameTitle(
    graph: SceneGraph,
    canvasX: number,
    canvasY: number,
    preview?: RenderOverlays['rotationPreview']
  ): SceneNode | null {
    return LabelHitTest.hitTestFrameTitle(
      graph,
      canvasX,
      canvasY,
      this.zoom,
      this.pageId ?? graph.rootId,
      this.labelFont,
      this.labelCache,
      labelHitOptions(this, graph, preview)
    )
  }
} satisfies ThisType<SkiaRenderer>
