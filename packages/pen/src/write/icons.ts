import { isEqual, omit } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import {
  hasIconFills,
  iconDrawing,
  isIconModified,
  readIcon,
  readIconPaintSource,
  readIconTint
} from '@open-pencil/scene-graph/icons'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'
import {
  contentPluginData,
  hasPluginData,
  OPEN_PENCIL_PLUGIN_DATA,
  withoutPluginData
} from '@open-pencil/scene-graph/plugin-data'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { paintBindingTarget } from '@open-pencil/scene-graph/variables'
import { validateVectorNetwork } from '@open-pencil/scene-graph/vector-network'

import { iconFields } from '../assets'

/** Geometry is checked below; file-source provenance is not authored interchange content. */
const PATH_FIELDS = [
  'id',
  'parentId',
  'name',
  'x',
  'y',
  'width',
  'height',
  'vectorNetwork',
  'fills',
  'strokes',
  'strokeCap',
  'strokeJoin',
  'source',
  'horizontalConstraint',
  'verticalConstraint'
] as const

function supportedFrame(node: SceneNode): boolean {
  return (
    node.type === 'FRAME' &&
    !hasPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.penIconReferences) &&
    Number.isFinite(node.width) &&
    node.width > 0 &&
    Number.isFinite(node.height) &&
    node.height > 0 &&
    (hasIconFills(node) || !node.fills.length) &&
    !node.strokes.length &&
    node.layoutMode === 'NONE' &&
    !node.clipsContent &&
    node.cornerRadius === 0 &&
    !node.independentCorners &&
    Object.keys(node.boundVariables).every(
      (field) => hasIconFills(node) && paintBindingTarget(field)?.list === 'fills'
    )
  )
}

function supportedPath(path: SceneNode, frame: SceneNode): boolean {
  const size = Math.min(frame.width, frame.height)
  if (
    path.type !== 'VECTOR' ||
    path.name !== 'path' ||
    path.x !== (frame.width - size) / 2 ||
    path.y !== (frame.height - size) / 2 ||
    path.width !== size ||
    path.height !== size ||
    path.horizontalConstraint !== 'SCALE' ||
    path.verticalConstraint !== 'SCALE' ||
    !path.vectorNetwork ||
    validateVectorNetwork(path.vectorNetwork).length
  )
    return false
  const defaults = createDefaultNode(() => path.id, 'VECTOR')
  const projected = {
    ...path,
    // FIG repeats stroke weight and fills in empty defaults without adding authored content.
    strokeWeight:
      path.strokeWeight === path.strokes[0]?.weight ? defaults.strokeWeight : path.strokeWeight,
    componentId: path.componentId === '' ? defaults.componentId : path.componentId,
    derivedTextGlyphs:
      path.derivedTextGlyphs?.length === 0 ? defaults.derivedTextGlyphs : path.derivedTextGlyphs,
    pluginData: contentPluginData(
      withoutPluginData(path.pluginData, [
        OPEN_PENCIL_PLUGIN_DATA.iconTint,
        OPEN_PENCIL_PLUGIN_DATA.iconPaintSource
      ])
    )
  }
  return isEqual(omit(projected, PATH_FIELDS), omit(defaults, PATH_FIELDS))
}

function uniformTint(paths: SceneNode[], frame: SceneNode): Color | undefined {
  let color: Color | undefined
  for (const path of paths) {
    if (!supportedPath(path, frame)) return undefined
    const tint = readIconTint(path)
    if (!path.fills.length && !path.strokes.length) return undefined
    for (const [kind, paints] of [
      ['fill', path.fills],
      ['stroke', path.strokes]
    ] as const) {
      if (paints.length && !tint.includes(kind)) return undefined
      for (const paint of paints) {
        if (paint.type !== 'SOLID' || !paint.visible || paint.opacity !== 1 || paint.color.a !== 1)
          return undefined
        if (color && !isEqual(color, paint.color)) return undefined
        color = paint.color
      }
    }
  }
  return color
}

/** An icon whose name and uniform tint reproduce all omitted derived paths. */
export function iconForExport(
  graph: SceneGraph,
  node: SceneNode
): { library: string; icon: string; weight?: number; color?: Color } | undefined {
  const icon = readIcon(node)
  const fields = icon && iconFields(icon.name, icon.options)
  // shortcut: source drawings only; extend runtime resize after glyph rebasing is verified.
  if (
    !supportedFrame(node) ||
    !fields ||
    !icon.glyph ||
    !icon.drawing ||
    isIconModified(graph, node) ||
    iconDrawing(graph, node) !== icon.drawing
  )
    return undefined
  if (hasIconFills(node)) {
    const paths = graph.getChildren(node.id)
    if (
      !paths.length ||
      paths.some((path) => {
        const source = readIconPaintSource(path)
        const tint = readIconTint(path)
        return (
          !supportedPath(path, node) ||
          !source ||
          (source.fills.length > 0 && !tint.includes('fill')) ||
          (source.strokes.length > 0 && !tint.includes('stroke'))
        )
      })
    )
      return undefined
    return fields
  }
  const color = uniformTint(graph.getChildren(node.id), node)
  return color ? { ...fields, color } : undefined
}
