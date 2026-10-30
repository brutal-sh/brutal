import { isEqual } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'
import {
  contentPluginData,
  hasPluginData,
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withoutPluginData
} from '@open-pencil/scene-graph/plugin-data'

export interface PenExportDiagnostic {
  nodeId?: string
  path: string
  message: string
}

export class PenExportError extends Error {
  readonly code = 'pen-export-loss'
  constructor(readonly diagnostics: readonly PenExportDiagnostic[]) {
    super(
      `Cannot export this content to .pen without losing unsupported features:\n${diagnostics
        .slice(0, 8)
        .map((d) => `${d.path}: ${d.message}`)
        .join(
          '\n'
        )}${diagnostics.length > 8 ? `\n…and ${diagnostics.length - 8} more.` : ''}\nKeep the .fig original, or simplify a copy before exporting.`
    )
    this.name = 'PenExportError'
  }
}

/** Fields represented by the writer; every other non-default content field is rejected. */
const WRITTEN = new Set<keyof SceneNode>([
  'id',
  'type',
  'name',
  'parentId',
  'childIds',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'flipX',
  'flipY',
  'visible',
  'opacity',
  'fills',
  'strokes',
  'effects',
  'cornerRadius',
  'independentCorners',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'clipsContent',
  'layoutMode',
  'primaryAxisAlign',
  'counterAxisAlign',
  'primaryAxisSizing',
  'counterAxisSizing',
  'itemSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'layoutPositioning',
  'layoutGrow',
  'layoutAlignSelf',
  'strokesIncludedInLayout',
  'strokeCap',
  'strokeJoin',
  'strokeWeight',
  'strokeAlign',
  'independentStrokeWeights',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'text',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'italic',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'letterSpacing',
  'lineHeight',
  'pointCount',
  'vectorNetwork',
  'arcData',
  'pluginData',
  'blendMode',
  'boundVariables',
  'variableModes'
])

/** Cache, provenance and editor preferences have no .pen equivalent; never authored content. */
const EDITOR_ONLY = new Set<keyof SceneNode>([
  'source',
  'derivedLayout',
  'expanded',
  'autoRename',
  'exportSettings',
  'textPicture',
  'derivedTextGlyphs',
  'derivedTextHeight',
  // The .pen text model uses the font's default optical size.
  'opticalSizeFromFontSize'
])

export function nodeDiagnostics(
  node: SceneNode,
  path: string,
  copy = false,
  handled?: ReadonlySet<keyof SceneNode>
): PenExportDiagnostic[] {
  const diagnostics: PenExportDiagnostic[] = []
  const add = (field: string, message: string) =>
    diagnostics.push({ nodeId: node.id, path: `${path}/${field}`, message })
  const defaults = createDefaultNode(() => node.id, node.type)
  for (const field of Object.keys(defaults) as (keyof SceneNode)[]) {
    if (copy && (field === 'componentId' || field === 'instanceOverrides')) continue
    if (field === 'componentId' && node.componentId === '') continue
    if (
      !handled?.has(field) &&
      !WRITTEN.has(field) &&
      !EDITOR_ONLY.has(field) &&
      !isEqual(node[field], defaults[field])
    ) {
      add(field, `The non-default ${field} property is not supported by .pen export.`)
    }
  }
  inspectPluginContent(node, add)
  inspectNodeFeatures(node, add)
  if (!copy && node.id.includes('/'))
    add('id', 'IDs containing / cannot be written as .pen node IDs.')
  return diagnostics
}

type NodeProblem = (field: string, message: string) => unknown

function inspectPluginContent(node: SceneNode, add: NodeProblem) {
  if (
    hasPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext) &&
    readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext) === undefined
  )
    add('context', 'Invalid node context metadata cannot be exported.')
  if (
    hasPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.deferredFill) &&
    readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.deferredFill) === undefined
  )
    add('sizing', 'Invalid deferred fill metadata cannot be exported.')
  if (
    hasPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.hugFallback) &&
    readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.hugFallback) === undefined
  )
    add('sizing', 'Invalid Hug fallback metadata cannot be exported.')
  if (
    contentPluginData(
      withoutPluginData(node.pluginData, [
        OPEN_PENCIL_PLUGIN_DATA.nodeContext,
        OPEN_PENCIL_PLUGIN_DATA.deferredFill,
        OPEN_PENCIL_PLUGIN_DATA.hugFallback
      ])
    ).length
  )
    add('pluginData', 'Plugin content (including shaders, icons and behaviours) is not supported.')
}

function inspectNodeFeatures(node: SceneNode, add: NodeProblem) {
  if (node.vectorNetwork && node.type !== 'VECTOR')
    add('vectorNetwork', 'Custom vector geometry on a non-vector node is not supported.')
  if (node.arcData && node.type !== 'ELLIPSE')
    add('arcData', 'Arc geometry is supported only on ellipses.')
  if (node.childIds.length && node.blendMode === 'NORMAL')
    add('blendMode', 'Isolated normal blending on containers is not supported.')
  if (!['PASS_THROUGH', 'NORMAL'].includes(node.blendMode))
    add('blendMode', `Layer blend mode ${node.blendMode} is not supported.`)
  if (node.type === 'TEXT' && node.textAutoResize === 'TRUNCATE')
    add('textAutoResize', 'Truncated text is not supported.')
  if (node.type === 'TEXT' && node.strokes.length)
    add('strokes', 'Text strokes are not supported by the .pen reader.')
  if (
    node.type === 'GROUP' &&
    (node.fills.length ||
      node.strokes.length ||
      node.effects.length ||
      node.layoutMode !== 'NONE' ||
      node.clipsContent)
  )
    add('type', 'Groups with their own paint, effects, clipping or layout are not supported.')
  inspectLayout(node, add)
}

function inspectLayout(node: SceneNode, add: NodeProblem) {
  if (!['NONE', 'HORIZONTAL', 'VERTICAL'].includes(node.layoutMode))
    add('layoutMode', 'Only horizontal and vertical stacks are supported.')
  if (!['MIN', 'CENTER', 'MAX', 'STRETCH'].includes(node.counterAxisAlign))
    add('counterAxisAlign', 'Baseline alignment is not supported.')
  if (!['AUTO', 'STRETCH'].includes(node.layoutAlignSelf))
    add('layoutAlignSelf', 'Only auto and stretch child alignment are supported.')
  if (node.layoutGrow !== 0 && node.layoutGrow !== 1)
    add('layoutGrow', 'Weighted fill sizing is not supported.')
}

export function documentDiagnostics(graph: SceneGraph): PenExportDiagnostic[] {
  const diagnostics: PenExportDiagnostic[] = []
  if (
    graph.getPages(true).filter((page) => !page.internalOnly || page.childIds.length > 0).length !==
    1
  )
    diagnostics.push({
      path: '/pages',
      message: '.pen stores one canvas. Export one page at a time.'
    })
  const root = graph.getNode(graph.rootId)
  for (const node of [root, ...graph.getPages(true)]) {
    if (!node) continue
    const path = node.id === graph.rootId ? '/document' : `/pages/${node.id}`
    if (
      node.fills.length ||
      node.strokes.length ||
      node.effects.length ||
      node.layoutMode !== 'NONE'
    )
      diagnostics.push({
        nodeId: node.id,
        path,
        message:
          'Page/document paint, effects or layout cannot be stored on the .pen canvas. Move the content into a frame.'
      })
    if (
      contentPluginData(node.pluginData).length ||
      hasPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.comments)
    )
      diagnostics.push({
        nodeId: node.id,
        path: `${path}/pluginData`,
        message: 'Document/page plugin content and comments are not supported.'
      })
  }
  if (graph.documentColorSpace !== 'srgb')
    diagnostics.push({ path: '/documentColorSpace', message: 'Only sRGB documents are supported.' })
  return diagnostics
}
