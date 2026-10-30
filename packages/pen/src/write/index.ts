import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { colorToHex8 } from '@open-pencil/scene-graph/color'
import { getNodeLocalMatrix } from '@open-pencil/scene-graph/coordinate'
import { layoutSizing } from '@open-pencil/scene-graph/layout'
import Matrix from '@open-pencil/scene-graph/matrix'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData } from '@open-pencil/scene-graph/plugin-data'
import { textLengthPixels } from '@open-pencil/scene-graph/text'
import { vectorNetworkPaths } from '@open-pencil/scene-graph/vector-network'

import type { PenDocument, PenEffect, PenNode } from '../schema'
import {
  documentDiagnostics,
  nodeDiagnostics,
  PenExportError,
  type PenExportDiagnostic
} from './diagnostics'
import { writeInstance } from './instances'
import { writePaints } from './paints'
import { createSlotWriter } from './slots'
import { writeVariables } from './variables'

const TYPES: Partial<Record<SceneNode['type'], string>> = {
  FRAME: 'frame',
  COMPONENT: 'frame',
  RECTANGLE: 'rectangle',
  ROUNDED_RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  POLYGON: 'polygon',
  GROUP: 'group',
  TEXT: 'text',
  VECTOR: 'path'
}
const ALIGN = {
  MIN: 'start',
  CENTER: 'center',
  MAX: 'end',
  SPACE_BETWEEN: 'space_between',
  STRETCH: 'start'
} as const
const TEXT_GROWTH = {
  WIDTH_AND_HEIGHT: 'auto',
  HEIGHT: 'fixed-width',
  NONE: 'fixed-width-height',
  TRUNCATE: 'fixed-width-height'
} as const
const CAPS = { NONE: 'butt', ROUND: 'round', SQUARE: 'square' } as const
const STROKE_ALIGNMENT = { INSIDE: 'inner', CENTER: 'center', OUTSIDE: 'outer' } as const

/**
 * A bounded editable .pen 2.21 interchange document, not a native save replacement.
 * Throws structured diagnostics before returning any output if content is unsupported.
 */
export function writePenDocument(graph: SceneGraph): PenDocument {
  const diagnostics = documentDiagnostics(graph)
  const slots = createSlotWriter(graph, diagnostics)
  const variableContext = writeVariables(graph, diagnostics)
  const add = (node: SceneNode, path: string, message: string) =>
    diagnostics.push({ nodeId: node.id, path, message })

  const paints = (node: SceneNode, fills: SceneNode['fills'], path: string) =>
    writePaints(graph, fills, path, (at, message) => add(node, at, message))

  function effects(node: SceneNode, path: string): PenEffect[] {
    return node.effects.flatMap<PenEffect>((effect, index) => {
      const at = `${path}/${index}`
      if (effect.spread !== 0)
        add(node, `${at}/spread`, 'Shadow spread is not supported by .pen 2.21.')
      if (effect.blendMode && effect.blendMode !== 'NORMAL')
        add(node, `${at}/blendMode`, 'Only normal effect blending is supported.')
      if (effect.showShadowBehindNode === false)
        add(node, `${at}/showShadowBehindNode`, 'Hidden shadows behind nodes are not supported.')
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
        return [
          {
            type: 'shadow',
            shadowType: effect.type === 'INNER_SHADOW' ? 'inner' : 'outer',
            color: colorToHex8(effect.color),
            offset: { ...effect.offset },
            blur: effect.radius,
            enabled: effect.visible
          }
        ]
      if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR')
        return [
          {
            type: effect.type === 'LAYER_BLUR' ? 'blur' : 'background_blur',
            radius: effect.radius,
            enabled: effect.visible
          }
        ]
      add(node, at, `${effect.type} effects are not supported.`)
      return []
    })
  }

  function size(node: SceneNode, axis: 'HORIZONTAL' | 'VERTICAL'): number | string {
    const value = axis === 'HORIZONTAL' ? node.width : node.height
    const sizing = layoutSizing(graph, node, axis)
    if (sizing === 'FILL') return `fill_container(${value})`
    if (sizing === 'HUG') return `fit_content(${value})`
    return value
  }

  function writeStroke(node: SceneNode, result: PenNode, path: string) {
    if (node.strokes.length) {
      const first = node.strokes[0]
      const cap = first.cap ?? node.strokeCap
      const join = first.join ?? node.strokeJoin
      if (!(cap in CAPS)) add(node, `${path}/strokeCap`, `Stroke cap ${cap} is not supported.`)
      for (const [index, stroke] of node.strokes.entries()) {
        if (
          stroke.weight !== first.weight ||
          stroke.align !== first.align ||
          (stroke.cap ?? node.strokeCap) !== cap ||
          (stroke.join ?? node.strokeJoin) !== join
        )
          add(node, `${path}/strokes/${index}`, 'All stroke paints must share the same geometry.')
        if (stroke.dashPattern?.length)
          add(node, `${path}/strokes/${index}/dashPattern`, 'Dashed strokes are not supported.')
      }
      result.stroke = paints(node, node.strokes, `${path}/strokes`)
      result.strokeWidth = node.independentStrokeWeights
        ? {
            top: node.borderTopWeight,
            right: node.borderRightWeight,
            bottom: node.borderBottomWeight,
            left: node.borderLeftWeight
          }
        : first.weight
      result.strokeAlignment = STROKE_ALIGNMENT[first.align]
      result.strokeLinecap = cap in CAPS ? CAPS[cap as keyof typeof CAPS] : 'butt'
      result.strokeLinejoin = join.toLowerCase()
    }
  }

  function writeText(node: SceneNode, result: PenNode) {
    if (node.type === 'TEXT') {
      Object.assign(result, {
        content: node.text,
        fontFamily: node.fontFamily,
        fontSize: node.fontSize,
        fontWeight: node.fontWeight,
        fontStyle: node.italic ? 'italic' : 'normal',
        textAlign:
          node.textAlignHorizontal === 'JUSTIFIED'
            ? 'justify'
            : node.textAlignHorizontal.toLowerCase(),
        textAlignVertical:
          node.textAlignVertical === 'CENTER' ? 'middle' : node.textAlignVertical.toLowerCase(),
        textGrowth: TEXT_GROWTH[node.textAutoResize],
        letterSpacing: textLengthPixels(node.letterSpacing, node.fontSize)
      })
      if (node.lineHeight)
        result.lineHeight = textLengthPixels(node.lineHeight, node.fontSize) / node.fontSize
    }
  }

  function writeVector(node: SceneNode, result: PenNode, path: string) {
    if (node.type === 'VECTOR') {
      if (!node.vectorNetwork) add(node, `${path}/vectorNetwork`, 'Vector geometry is missing.')
      else {
        const paths = vectorNetworkPaths(node.vectorNetwork)
        const rules = new Set(
          paths.filter((p) => p.windingRule !== 'NONE').map((p) => p.windingRule)
        )
        if (rules.size > 1)
          add(
            node,
            `${path}/vectorNetwork`,
            'Mixed winding rules cannot be represented by one .pen path.'
          )
        result.geometry = paths.map((p) => p.data).join(' ')
        result.fillRule = rules.has('EVENODD') ? 'evenodd' : 'nonzero'
        result.viewBox = [0, 0, node.width, node.height]
      }
    }
  }

  function properties(
    node: SceneNode,
    path: string,
    topLevel = false,
    copy = false,
    ownedSlotContent = false
  ): PenNode {
    const handled = new Set(slots.handled(node))
    // Owned slot content may be cloned through a containing component. A plain layer's
    // componentId is copy provenance, not an instance link; the serialized layer is now owned.
    if (ownedSlotContent && node.type !== 'INSTANCE') handled.add('componentId')
    diagnostics.push(...nodeDiagnostics(node, path, copy, handled))
    const type = node.type === 'INSTANCE' ? 'frame' : TYPES[node.type]
    if (!type)
      add(
        node,
        `${path}/type`,
        `${node.type} nodes are not supported. Detach or convert a copy before exporting.`
      )
    const [x, y] = Matrix.mapPoints(getNodeLocalMatrix(node), [0, 0])
    const result: PenNode = {
      id: node.id,
      name: node.name,
      context: readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext),
      type: type ?? 'frame',
      x,
      y,
      width: size(node, 'HORIZONTAL'),
      height: size(node, 'VERTICAL'),
      rotation: node.rotation * (node.flipX !== node.flipY ? 1 : -1),
      flipX: node.flipX,
      flipY: node.flipY,
      enabled: node.visible,
      opacity: node.opacity,
      fill: paints(node, node.fills, `${path}/fills`),
      stroke: [],
      effect: effects(node, `${path}/effects`),
      cornerRadius: node.independentCorners
        ? [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius]
        : node.cornerRadius,
      layout: node.layoutMode.toLowerCase(),
      layoutPosition: node.layoutPositioning.toLowerCase(),
      gap: node.itemSpacing,
      padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft],
      justifyContent: ALIGN[node.primaryAxisAlign],
      alignItems: node.counterAxisAlign === 'BASELINE' ? 'start' : ALIGN[node.counterAxisAlign],
      layoutIncludeStroke: node.strokesIncludedInLayout,
      clip: node.clipsContent
    }
    if (node.type === 'COMPONENT') result.reusable = true
    if (!copy && slots.suggestions(node)) result.slot = slots.suggestions(node)
    writeStroke(node, result, path)
    if (node.type === 'POLYGON') result.polygonCount = node.pointCount
    if (node.type === 'ELLIPSE' && node.arcData) {
      result.startAngle = (-node.arcData.startingAngle * 180) / Math.PI
      result.sweepAngle = (-(node.arcData.endingAngle - node.arcData.startingAngle) * 180) / Math.PI
      result.innerRadius = node.arcData.innerRadius
    }
    writeText(node, result)
    writeVector(node, result, path)
    variableContext.apply(node, result, path, topLevel)
    return result
  }

  function write(
    node: SceneNode,
    path: string,
    topLevel = false,
    ownedSlotContent = false
  ): PenNode {
    if (node.id.includes('/'))
      add(node, `${path}/id`, 'IDs containing / cannot be written as .pen node IDs.')
    if (ownedSlotContent && node.type === 'COMPONENT')
      add(
        node,
        `${path}/reusable`,
        'Component definitions inside owned slot content are not supported. Insert an instance instead.'
      )
    if (node.type === 'INSTANCE')
      return writeInstance(graph, node, path, topLevel, properties, diagnostics, (child, at) =>
        write(child, at, false, true)
      )
    const result = properties(node, path, topLevel, false, ownedSlotContent)
    if (node.childIds.length)
      result.children = graph
        .getChildren(node.id)
        .map((child, index) => write(child, `${path}/children/${index}`, false, ownedSlotContent))
    return result
  }

  const page = graph.getPages().at(0)
  const children = page
    ? graph.getChildren(page.id).map((node, index) => write(node, `/children/${index}`, true))
    : []
  const document: PenDocument = {
    version: '2.21',
    themes: variableContext.themes,
    variables: variableContext.variables,
    children
  }
  inspectNumbers(document, '', diagnostics)
  if (diagnostics.length) throw new PenExportError(diagnostics)
  return document
}

function inspectNumbers(value: unknown, path: string, diagnostics: PenExportDiagnostic[]): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    diagnostics.push({ path, message: 'Non-finite numbers cannot be represented in .pen JSON.' })
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value))
      inspectNumbers(child, `${path}/${key}`, diagnostics)
  }
}

export function writePenFile(graph: SceneGraph): string {
  return `${JSON.stringify(writePenDocument(graph), null, 2)}\n`
}

export { PenExportError, type PenExportDiagnostic }
