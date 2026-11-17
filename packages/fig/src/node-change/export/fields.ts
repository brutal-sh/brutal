import { effectiveFigmaRawNodeFields } from '#fig/source-metadata'

import type { LayoutGrid, SceneNode } from '@open-pencil/scene-graph'
import { DEFAULT_STROKE_WEIGHT } from '@open-pencil/scene-graph/constants'
import { hasIconFills } from '@open-pencil/scene-graph/icons'
import { layoutGridCount } from '@open-pencil/scene-graph/layout'

import { exportCanvasGuides } from '../canvas-guides'
import {
  applyMeshPaintsPluginData,
  applyShaderPaintsPluginData,
  applyIconFillsPluginData,
  mergePluginData
} from '../plugin-data'
import {
  createFillPaints,
  exportedStyleReference,
  type KiwiNodeChange,
  type SceneNodeToKiwiContext
} from './context'
import { exportedNode } from './resolved-bindings'
import { applyStrokeGeometry } from './stroke'
import { serializeText } from './text'
import { applyVariableModes } from './variables'

const SUPPORTED_NORMALIZED_EFFECT_TYPES = new Set([
  'DROP_SHADOW',
  'INNER_SHADOW',
  'LAYER_BLUR',
  'BACKGROUND_BLUR',
  'FOREGROUND_BLUR'
])

function hasRawUnsupportedEffects(node: SceneNode): boolean {
  const effects = effectiveFigmaRawNodeFields(node).effects
  return (
    Array.isArray(effects) &&
    effects.some(
      (effect) =>
        effect &&
        typeof effect === 'object' &&
        'type' in effect &&
        !SUPPORTED_NORMALIZED_EFFECT_TYPES.has(String(effect.type))
    )
  )
}

function layoutGridAxis(grid: LayoutGrid): 'X' | 'Y' {
  const rows = grid.pattern === 'ROWS' || (grid.pattern !== 'COLUMNS' && grid.axis === 'Y')
  return rows ? 'Y' : 'X'
}

function layoutGridSectionSize(grid: LayoutGrid): number {
  return grid.sectionSize ?? (grid.pattern === 'GRID' ? 10 : 0)
}

/**
 * A layout guide as the archive stores it: stripes along an axis or a grid, whichever shape it was
 * given in, Figma's plugin names (`COLUMNS`, `count`, `alignment`) or the archive's own.
 */
function kiwiLayoutGrid(grid: LayoutGrid): LayoutGrid {
  return {
    type: grid.type ?? grid.alignment ?? 'STRETCH',
    axis: layoutGridAxis(grid),
    visible: grid.visible ?? true,
    numSections: layoutGridCount(grid),
    offset: grid.offset ?? 0,
    // Figma's new grid is 10 px, the size the plugin API reports for one without a size.
    sectionSize: layoutGridSectionSize(grid),
    gutterSize: grid.gutterSize ?? 0,
    color: grid.color ?? { r: 1, g: 0, b: 0, a: 0.1 },
    pattern: grid.pattern === 'GRID' ? 'GRID' : 'STRIPES'
  }
}

function applySharedStyleProps(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  const reference = (id: string) => exportedStyleReference(context, id)
  if (node.fillStyleId) nc.styleIdForFill = reference(node.fillStyleId)
  if (node.strokeStyleId) nc.styleIdForStrokeFill = reference(node.strokeStyleId)
  if (node.textStyleId) nc.styleIdForText = reference(node.textStyleId)
  if (node.effectStyleId) nc.styleIdForEffect = reference(node.effectStyleId)
  if (node.gridStyleId) nc.styleIdForGrid = reference(node.gridStyleId)
  if (node.layoutGrids.length > 0) nc.layoutGrids = node.layoutGrids.map(kiwiLayoutGrid)
  if (node.guides.length > 0) nc.guides = exportCanvasGuides(node.guides)
}

function applyShapeConstraints(node: SceneNode, nc: KiwiNodeChange): void {
  if (node.horizontalConstraint !== 'MIN') nc.horizontalConstraint = node.horizontalConstraint
  if (node.verticalConstraint !== 'MIN') nc.verticalConstraint = node.verticalConstraint
  if (node.arcData) {
    nc.arcData = {
      startingAngle: node.arcData.startingAngle,
      endingAngle: node.arcData.endingAngle,
      innerRadius: node.arcData.innerRadius
    }
  }
  if (!node.autoRename) nc.autoRename = false
}

export function applyNodeVisualProps(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  applyStrokeGeometry(node, nc)
  if (node.fills.length > 0 && !hasIconFills(node)) nc.fillPaints = createFillPaints(context, node)

  context.serializeCornerRadii(node, nc)
  // Figma draws a polygon or star from its count and inner scale; its clipboard has no geometry.
  if (node.type === 'POLYGON' || node.type === 'STAR') nc.count = node.pointCount
  if (node.type === 'STAR') nc.starInnerScale = node.starInnerRadius

  if (node.effects.length > 0 && !hasRawUnsupportedEffects(node)) {
    nc.effects = node.effects.map((effect) => ({
      type: effect.type === 'LAYER_BLUR' ? 'FOREGROUND_BLUR' : effect.type,
      color: context.safeColor(effect.color),
      offset: effect.offset,
      radius: effect.radius,
      spread: effect.spread,
      visible: effect.visible,
      blendMode: effect.blendMode ?? 'NORMAL',
      showShadowBehindNode: effect.showShadowBehindNode
    }))
  }

  if (node.type === 'TEXT') serializeText(context, node, nc)

  if (node.type !== 'VECTOR') nc.frameMaskDisabled = !node.clipsContent
  applySharedStyleProps(context, node, nc)
  applyShapeConstraints(node, nc)
}

/**
 * The node a record is written from. Serializing writes plugin data onto the node it is given,
 * and the export reads the live document, so each record gets a copy that lives only while it is
 * written, carrying any plugin data the export renamed.
 */
export function nodeToSerialize(context: SceneNodeToKiwiContext, source: SceneNode): SceneNode {
  const resolved = exportedNode(context, source)
  return {
    ...resolved,
    pluginData: context.pluginDataOverrides?.get(source.id) ?? resolved.pluginData
  }
}

/** Stroke geometry and lock state, which a layer's record and its instance claims both write. */
export function applyNodeStateProps(node: SceneNode, nc: KiwiNodeChange): void {
  // With strokes, their geometry is the node's. Without, the node keeps its own weight and
  // alignment, written when set or when the source file carried them.
  if (node.strokes.length > 0) {
    nc.strokeWeight = node.strokes[0].weight
    nc.strokeAlign = node.strokes[0].align
  } else {
    const rawNodeFields = effectiveFigmaRawNodeFields(node)
    if (node.strokeWeight !== DEFAULT_STROKE_WEIGHT || 'strokeWeight' in rawNodeFields) {
      nc.strokeWeight = node.strokeWeight
    }
    // Kiwi reads a missing alignment as centered.
    if (node.strokeAlign !== 'CENTER' || 'strokeAlign' in rawNodeFields) {
      nc.strokeAlign = node.strokeAlign
    }
  }
  if (node.locked) nc.locked = true
}

/**
 * The style fields of a layer as its own record writes them, for the instance override claims
 * that carry them. Text is written without derived glyphs: a claim never carries them.
 */
export function overridableNodeFields(
  context: SceneNodeToKiwiContext,
  source: SceneNode
): KiwiNodeChange {
  const node = nodeToSerialize(context, source)
  const nc: KiwiNodeChange = {}
  if (node.blendMode !== 'PASS_THROUGH') nc.blendMode = node.blendMode
  applyNodeStateProps(node, nc)
  applyNodeVisualProps({ ...context, fontDigestMap: undefined }, node, nc)
  context.serializeLayoutProps(node, nc)
  applyVariableModes(context, node, nc)
  context.serializeVariableBindings(node, nc, context.graph, context.varIdToGuid)
  applyMeshPaintsPluginData(node)
  applyShaderPaintsPluginData(node, context.graph.images)
  applyIconFillsPluginData(node, context.graph.images)
  // An empty list clears inherited mesh metadata when this occurrence changes to a solid.
  nc.pluginData = mergePluginData(node.pluginData)
  return nc
}
