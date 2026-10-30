import { pick } from 'es-toolkit'
import { isEqual } from 'es-toolkit/predicate'

import type { SceneNode, Stroke } from '@open-pencil/scene-graph'
import {
  createShaderPaint,
  shaderOfPaint,
  withShaderPaints,
  type ShaderPreset
} from '@open-pencil/scene-graph/shaders'

import type { EditorContext } from '#core/editor/types'

import { isSharedShaderFrame } from './ownership'

/** What a stroke has beyond its paint. */
const STROKE_FIELDS = [
  'weight',
  'align',
  'cap',
  'join',
  'dashPattern'
] as const satisfies readonly (keyof Stroke)[]

const replaceAt = <T>(items: readonly T[], index: number, item: T) =>
  items.map((existing, at) => (at === index ? item : existing))

/** Which of a layer's paint lists a shader is set in. */
export type ShaderPaintList = 'fills' | 'strokes'

interface NodeActions {
  updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label?: string): void
}

/**
 * Shader paint commands. A shader paint is an image paint of the shader's frame plus the preset
 * in plugin data, so each command records both together, as one undo step.
 */
export function createShaderActions(ctx: EditorContext, nodes: NodeActions) {
  function setNodeShader(
    nodeId: string,
    list: ShaderPaintList,
    index: number,
    preset: ShaderPreset
  ): void {
    const node = ctx.graph.getNode(nodeId)
    const previous = node?.[list].at(index)
    if (!node || !previous) return
    const existing = shaderOfPaint(node, previous)
    if (existing && isEqual(existing.preset, preset)) return
    const next =
      existing && !isSharedShaderFrame(ctx.graph, existing.image)
        ? { paint: previous, shader: { image: existing.image, preset: structuredClone(preset) } }
        : createShaderPaint(preset)
    if (existing && next.shader.image !== existing.image) {
      const bytes = ctx.graph.images.get(existing.image)
      if (bytes) ctx.graph.images.set(next.shader.image, bytes)
    }
    const paint = existing ? { ...previous, imageHash: next.shader.image } : next.paint
    const { shader } = next
    const shown = { ...paint, opacity: previous.opacity, visible: previous.visible }
    const fills = list === 'fills' ? replaceAt(node.fills, index, shown) : node.fills
    // A stroke keeps its weight and geometry; only its paint changes.
    const strokes =
      list === 'strokes'
        ? node.strokes.map((item, at) =>
            at === index ? { ...pick(item, STROKE_FIELDS), ...shown } : item
          )
        : node.strokes
    nodes.updateNodeWithUndo(nodeId, {
      [list]: list === 'fills' ? fills : strokes,
      pluginData: withShaderPaints(node, [...fills, ...strokes], [shader])
    })
  }

  /**
   * Makes paint `index` of `list` on each of `nodeIds` draw `preset`, as one undo step: a shader
   * paint keeps its image and takes the new preset, any other paint becomes a new shader paint.
   * Frames are drawn once the edit settles.
   */
  function setShaderPaint(
    nodeIds: readonly string[],
    list: ShaderPaintList,
    index: number,
    preset: ShaderPreset
  ): void {
    ctx.undo.beginBatch('Set shader')
    try {
      for (const id of nodeIds) setNodeShader(id, list, index, preset)
    } finally {
      ctx.undo.commitBatch()
    }
  }

  return { setShaderPaint }
}
