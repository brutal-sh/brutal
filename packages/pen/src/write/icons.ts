import { isEqual, omit } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { iconDrawing, isIconModified, readIcon, readIconTint } from '@open-pencil/scene-graph/icons'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'
import {
  contentPluginData,
  OPEN_PENCIL_PLUGIN_DATA,
  withoutPluginData
} from '@open-pencil/scene-graph/plugin-data'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { validateVectorNetwork } from '@open-pencil/scene-graph/vector-network'

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
    node.width === 24 &&
    node.height === 24 &&
    !node.fills.length &&
    !node.strokes.length &&
    node.layoutMode === 'NONE' &&
    !node.clipsContent &&
    node.cornerRadius === 0 &&
    !node.independentCorners &&
    !Object.keys(node.boundVariables).length
  )
}

function supportedPath(path: SceneNode): boolean {
  if (
    path.type !== 'VECTOR' ||
    path.name !== 'path' ||
    path.x !== 0 ||
    path.y !== 0 ||
    path.width !== 24 ||
    path.height !== 24 ||
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
      withoutPluginData(path.pluginData, [OPEN_PENCIL_PLUGIN_DATA.iconTint])
    )
  }
  return isEqual(omit(projected, PATH_FIELDS), omit(defaults, PATH_FIELDS))
}

function uniformTint(paths: SceneNode[]): Color | undefined {
  let color: Color | undefined
  for (const path of paths) {
    if (!supportedPath(path)) return
    const tint = readIconTint(path)
    if (!path.fills.length && !path.strokes.length) return
    for (const [kind, paints] of [
      ['fill', path.fills],
      ['stroke', path.strokes]
    ] as const) {
      if (paints.length && !tint.includes(kind)) return
      for (const paint of paints) {
        if (paint.type !== 'SOLID' || !paint.visible || paint.opacity !== 1) return
        if (color && !isEqual(color, paint.color)) return
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
): { library: string; icon: string; color: Color } | undefined {
  const icon = readIcon(node)
  // shortcut: only the measured 24px Lucide path contract; extend after canonical set/size roundtrips.
  if (
    !supportedFrame(node) ||
    !icon?.name.startsWith('lucide:') ||
    icon.options !== undefined ||
    !icon.glyph ||
    !icon.drawing ||
    isIconModified(graph, node) ||
    iconDrawing(graph, node) !== icon.drawing
  )
    return
  const color = uniformTint(graph.getChildren(node.id))
  return color ? { library: 'lucide', icon: icon.name.slice('lucide:'.length), color } : undefined
}
