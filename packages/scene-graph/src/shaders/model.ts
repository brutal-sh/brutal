import { sha1 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

import { TRANSPARENT } from '../constants'
import type { SceneGraph } from '../graph'
import { readAllPluginData, withAllPluginData } from '../plugin-data/field'
import { OPEN_PENCIL_PLUGIN_DATA } from '../plugin-data/fields'
import { randomHex } from '../random'
import type { Fill, SceneNode } from '../types'
import { fragmentShaderOf } from './fragment'
import type { ShaderPaint, ShaderPreset } from './schema'

/** What shader paints read of a node. */
type ShaderNode = Pick<SceneNode, 'fills' | 'strokes' | 'pluginData'>

/** Every shader a node's fills and strokes draw, whether or not a paint still shows it. */
export function readShaderPaints(node: Pick<SceneNode, 'pluginData'>): ShaderPaint[] {
  return readAllPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.shader)
}

/**
 * The shader a fill or stroke of `node` draws: an image paint whose image is a shader's frame.
 * Null for any other paint, including one whose image was replaced, which then draws as the
 * image it holds.
 */
export function shaderOfPaint(
  node: Pick<SceneNode, 'pluginData'>,
  paint: Fill
): ShaderPaint | null {
  if (paint.type !== 'IMAGE' || !paint.imageHash) return null
  return readShaderPaints(node).find((shader) => shader.image === paint.imageHash) ?? null
}

/** Whether any paint of `node` draws a shader. */
export function hasShaderPaint(node: ShaderNode): boolean {
  return [...node.fills, ...node.strokes].some((paint) => shaderOfPaint(node, paint) !== null)
}

/** A copied paint follows its source shader; overridden paint lists keep their own metadata. */
export function withSyncedShaderPaints(
  target: ShaderNode,
  source: ShaderNode,
  changes: Partial<Pick<SceneNode, 'fills' | 'strokes'>>
): SceneNode['pluginData'] {
  const fills = changes.fills ?? target.fills
  const strokes = changes.strokes ?? target.strokes
  const shaders = [
    ...fills.map((paint) => shaderOfPaint(changes.fills ? source : target, paint)),
    ...strokes.map((paint) => shaderOfPaint(changes.strokes ? source : target, paint))
  ].filter((shader) => shader !== null)
  return withShaderPaints(
    { pluginData: withAllPluginData(target.pluginData, OPEN_PENCIL_PLUGIN_DATA.shader, []) },
    [...fills, ...strokes],
    shaders
  )
}

/**
 * The node's plugin data with `shaders` set by their image, keeping only shaders a fill or
 * stroke of `paints` still shows, so removing or replacing a paint leaves no entry behind.
 */
export function withShaderPaints(
  node: Pick<SceneNode, 'pluginData'>,
  paints: readonly Fill[],
  shaders: readonly ShaderPaint[] = []
): SceneNode['pluginData'] {
  const shown = new Set(
    paints.flatMap((paint) => (paint.type === 'IMAGE' && paint.imageHash ? [paint.imageHash] : []))
  )
  const byImage = new Map(readShaderPaints(node).map((shader) => [shader.image, shader]))
  for (const shader of shaders) byImage.set(shader.image, shader)
  return withAllPluginData(
    node.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.shader,
    [...byImage.values()].filter((shader) => shown.has(shader.image))
  )
}

/**
 * A new paint that draws `preset`, and the shader entry it shows. Its image names a frame not yet
 * rendered, unique to this paint, so no other paint's entry claims it until the frame is drawn.
 */
export function createShaderPaint(preset: ShaderPreset): {
  paint: Fill
  shader: ShaderPaint
} {
  const image = randomHex(20)
  return {
    paint: {
      type: 'IMAGE',
      color: TRANSPARENT,
      opacity: 1,
      visible: true,
      imageHash: image,
      imageScaleMode: 'FILL'
    },
    shader: { image, preset: structuredClone(preset) }
  }
}

/** A short key that tells one preset from another, which a rendered frame records. */
export function shaderPresetKey(preset: ShaderPreset): string {
  return bytesToHex(sha1(utf8ToBytes(JSON.stringify(preset))))
}

/**
 * Whether a shader's frame was rendered for its preset at the size `node` has now, so undoing a
 * preset change after reopening the document does not keep a frame of the newer preset.
 */
export function isShaderFrameCurrent(
  shader: ShaderPaint,
  size: { width: number; height: number }
): boolean {
  const { frame } = shader
  return (
    frame !== undefined &&
    frame.preset === shaderPresetKey(shader.preset) &&
    Math.round(frame.width) === Math.round(size.width) &&
    Math.round(frame.height) === Math.round(size.height)
  )
}

/** A source-only or stale GLSL paint cannot silently turn into empty exported artwork. */
export function assertFragmentPaintFrame(
  graph: Pick<SceneGraph, 'images'>,
  node: SceneNode,
  paint: Fill
) {
  if (!node.visible || node.opacity <= 0 || !paint.visible || paint.opacity <= 0) return
  const shader = shaderOfPaint(node, paint)
  const fragment = shader && fragmentShaderOf(shader.preset)
  if (!shader || !fragment || (!fragment.source && !fragment.url)) return
  if (!graph.images.get(shader.image)?.length || !isShaderFrameCurrent(shader, node))
    throw new Error(
      'Render the GLSL shader before exporting. Choose or reload its source in the editor.'
    )
}

export function assertFragmentFrames(graph: SceneGraph, nodeIds: readonly string[]) {
  const pending = [...nodeIds]
  const seen = new Set<string>()
  for (const id of pending) {
    if (seen.has(id)) continue
    seen.add(id)
    const node = graph.getNode(id)
    if (!node?.visible || node.opacity <= 0) continue
    for (const paint of [...node.fills, ...node.strokes])
      assertFragmentPaintFrame(graph, node, paint)
    pending.push(...node.childIds)
  }
}
