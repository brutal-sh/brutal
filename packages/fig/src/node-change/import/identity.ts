import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type { NodeType } from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA } from '@open-pencil/scene-graph/plugin-data'

import { readNodeChangePluginData } from '../plugin-data'

const NODE_TYPE_MAP: Record<string, NodeType | 'DOCUMENT' | 'VARIABLE'> = {
  DOCUMENT: 'DOCUMENT',
  VARIABLE: 'VARIABLE',
  CANVAS: 'CANVAS',
  FRAME: 'FRAME',
  RECTANGLE: 'RECTANGLE',
  ROUNDED_RECTANGLE: 'ROUNDED_RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  TEXT: 'TEXT',
  LINE: 'LINE',
  STAR: 'STAR',
  REGULAR_POLYGON: 'POLYGON',
  VECTOR: 'VECTOR',
  BOOLEAN_OPERATION: 'BOOLEAN_OPERATION',
  GROUP: 'GROUP',
  SECTION: 'SECTION',
  COMPONENT: 'COMPONENT',
  COMPONENT_SET: 'COMPONENT_SET',
  INSTANCE: 'INSTANCE',
  SYMBOL: 'COMPONENT',
  CONNECTOR: 'CONNECTOR',
  SHAPE_WITH_TEXT: 'SHAPE_WITH_TEXT',
  STICKY: 'STICKY',
  // Map to TEXT while retaining a format-neutral text path for rendering/editing.
  TEXT_PATH: 'TEXT'
}

export function mapNodeType(type?: string): NodeType | 'DOCUMENT' | 'VARIABLE' {
  if (type) return NODE_TYPE_MAP[type] ?? 'RECTANGLE'
  return 'RECTANGLE'
}
export function resolveNodeType(nc: NodeChange): NodeType | 'DOCUMENT' | 'VARIABLE' {
  const nodeType = mapNodeType(nc.type)
  if (
    (nodeType === 'FRAME' && isComponentSet(nc)) ||
    readNodeChangePluginData(nc, OPEN_PENCIL_PLUGIN_DATA.nodeType) === 'COMPONENT_SET'
  ) {
    return 'COMPONENT_SET'
  }
  // Figma stores plain groups as FRAME node-changes flagged with resizeToFit.
  // Auto-layout "hug" frames instead use stackPrimarySizing/stackCounterSizing and
  // always carry a stackMode, so guard on the absence of auto-layout — a real group
  // never has one. This keeps component-sets and auto-layout frames from being
  // misclassified as groups.
  if (
    nodeType === 'FRAME' &&
    nc.resizeToFit === true &&
    (nc.stackMode === undefined || nc.stackMode === 'NONE')
  ) {
    return 'GROUP'
  }
  return nodeType
}
function isComponentSet(nc: NodeChange): boolean {
  const defs = nc.componentPropDefs as Array<{ type?: string }> | undefined
  if (!defs?.length) return false
  return defs.some((d) => d.type === 'VARIANT')
}
