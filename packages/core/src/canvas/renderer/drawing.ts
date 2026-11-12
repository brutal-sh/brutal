import type { Canvas } from 'canvaskit-wasm'

import type { SceneNode, SceneGraph, Fill, Stroke } from '@open-pencil/scene-graph'
import type { ResolvedRenderColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'
import * as RenderColors from '#core/canvas/renderer/colors'
import * as RenderPipeline from '#core/canvas/renderer/pipeline'
import type { RenderOverlays } from '#core/canvas/renderer/types'
import * as RenderText from '#core/canvas/text'
import type { EditorState } from '#core/editor/types'

export const rendererDrawingMethods = {
  renderSceneToCanvas(canvas: Canvas, graph: SceneGraph, pageId: string): void {
    RenderPipeline.renderSceneToCanvas(this, canvas, graph, pageId)
  },

  render(
    graph: SceneGraph,
    selectedIds: Set<string>,
    ...[overlays = {}, sceneVersion = -1, layer = 'full']: [
      overlays?: RenderOverlays,
      sceneVersion?: number,
      layer?: RenderPipeline.RenderLayer
    ]
  ): void {
    RenderPipeline.render(this, graph, selectedIds, overlays, sceneVersion, layer)
  },

  measureTextNode(node: SceneNode, maxWidth?: number): { width: number; height: number } | null {
    return RenderText.measureTextNode(this, node, maxWidth)
  },

  nodeFontReadiness(node: SceneNode): RenderText.NodeFontReadiness {
    return RenderText.nodeFontReadiness(this, node)
  },

  isNodeFontLoaded(node: SceneNode): boolean {
    return RenderText.isNodeFontLoaded(this, node)
  },

  buildTextPicture(node: SceneNode): Uint8Array | null {
    return RenderText.buildTextPicture(this, node)
  },

  buildParagraph(
    node: SceneNode,
    color?: Float32Array,
    opts?: RenderText.ParagraphBuildOptions
  ): RenderText.TextLayout {
    return RenderText.buildParagraph(this, node, color, opts)
  },

  resolveFillColorInfo(
    fill: Fill,
    fillIndex: number,
    node: SceneNode,
    graph: SceneGraph
  ): ResolvedRenderColor {
    return RenderColors.resolveFillColorInfo(
      fill,
      fillIndex,
      node,
      graph,
      this.presentationColorSpace
    )
  },

  resolveFillColor(fill: Fill, fillIndex: number, node: SceneNode, graph: SceneGraph): Color {
    return RenderColors.resolveFillColor(fill, fillIndex, node, graph, this.presentationColorSpace)
  },

  resolveStrokeColorInfo(
    stroke: Stroke,
    strokeIndex: number,
    node: SceneNode,
    graph: SceneGraph
  ): ResolvedRenderColor {
    return RenderColors.resolveStrokeColorInfo(
      stroke,
      strokeIndex,
      node,
      graph,
      this.presentationColorSpace
    )
  },

  resolveStrokeColor(
    stroke: Stroke,
    strokeIndex: number,
    node: SceneNode,
    graph: SceneGraph
  ): Color {
    return RenderColors.resolveStrokeColor(
      stroke,
      strokeIndex,
      node,
      graph,
      this.presentationColorSpace
    )
  }
} satisfies ThisType<SkiaRenderer>

export type RendererEditorStateArgs = [
  state: EditorState,
  graph: SceneGraph,
  textEditor: unknown,
  viewportWidth: number,
  viewportHeight: number,
  showRulers?: boolean,
  layer?: RenderPipeline.RenderLayer,
  interactive?: boolean
]

export function createEditorStateRenderMethod(
  getPixelRatio: () => number
): (...args: RendererEditorStateArgs) => void {
  const methods: { renderFromEditorState: (...args: RendererEditorStateArgs) => void } = {
    renderFromEditorState(
      this: SkiaRenderer,
      ...[
        state,
        graph,
        textEditor,
        viewportWidth,
        viewportHeight,
        showRulers = true,
        layer = 'full',
        interactive = false
      ]: RendererEditorStateArgs
    ): void {
      const dpr = getPixelRatio()
      RenderPipeline.renderFromEditorState(
        this,
        state,
        graph,
        textEditor,
        viewportWidth,
        viewportHeight,
        showRulers,
        dpr,
        layer,
        interactive
      )
    }
  }
  const result = methods.renderFromEditorState
  // Preserve the existing positional API's callable metadata.
  Object.defineProperty(result, 'length', { value: 5 })
  return result
}
