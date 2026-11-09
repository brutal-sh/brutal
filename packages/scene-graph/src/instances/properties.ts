import { isEqual } from 'es-toolkit/predicate'

import { copyEffects, copyFills, copyStrokes, copyStyleRuns } from '../copy'
import { syncNoteFields } from '../generated/notes/instances'
import type { SceneGraph } from '../graph'
import { scaleNodeChanges } from '../scaling/node'
import { syncScriptFields, SCRIPT_INPUT_BINDING_PREFIX } from '../scripts/model'
import { hasShaderPaint, withSyncedShaderPaints } from '../shaders/model'
import type { SceneNode } from '../types'
import { scaleVariableBindingUnits } from '../variables/units'
import { remeasureChangedText, type SyncedPlacement } from './content-size'
import { INSTANCE_SYNC_FIELD_OWNERS, INSTANCE_SYNC_FIELDS } from './fields'
import { bindingOverrideField, overriddenBindingField } from './overrides'
import { PLACEMENT_FIELDS, placedByConstraints } from './placement'
import { followVectorGeometry } from './vector-geometry'

function setSceneProp<K extends keyof SceneNode>(
  target: Partial<SceneNode>,
  key: K,
  value: SceneNode[K]
): void {
  target[key] = value
}

export function copyProp(
  target: Partial<SceneNode> | SceneNode,
  source: SceneNode,
  key: keyof SceneNode
): void {
  if (key === 'fills') {
    setSceneProp(target, key, copyFills(source.fills))
  } else if (key === 'strokes') {
    setSceneProp(target, key, copyStrokes(source.strokes))
  } else if (key === 'effects') {
    setSceneProp(target, key, copyEffects(source.effects))
  } else if (key === 'styleRuns') {
    setSceneProp(target, key, copyStyleRuns(source.styleRuns))
  } else if (key === 'boundVariables') {
    // Shallow copy the binding map — values are variable IDs (strings), not objects
    setSceneProp(target, key, { ...source.boundVariables })
    setSceneProp(target, 'variableBindingScales', { ...source.variableBindingScales })
  } else if (key === 'variableModes') {
    setSceneProp(target, key, { ...source.variableModes })
  } else if (key === 'gridPosition') {
    // Shallow copy the grid position object — all fields are primitives
    setSceneProp(target, key, source.gridPosition ? { ...source.gridPosition } : null)
  } else if (key === 'targetAspectRatio') {
    setSceneProp(target, key, source.targetAspectRatio ? { ...source.targetAspectRatio } : null)
  } else {
    const value = source[key]
    setSceneProp(target, key, Array.isArray(value) ? structuredClone(value) : value)
  }
}

export function bindingProtection(scopes: ReadonlySet<string>[]): (field: string) => boolean {
  const fields = new Set<string>()
  for (const scope of scopes) {
    const perField = [...scope].some((field) => overriddenBindingField(field) !== null)
    for (const field of scope) {
      if (field !== 'boundVariables' || !perField) fields.add(field)
    }
  }
  return (field) => fields.has(field)
}

export function syncBindingFields(
  target: SceneNode,
  source: SceneNode,
  updates: Partial<SceneNode>,
  protectedField: (field: string) => boolean
): void {
  if (protectedField('boundVariables')) return
  const bindings = { ...source.boundVariables }
  const scales = { ...source.variableBindingScales }
  for (const field of new Set([
    ...Object.keys(source.boundVariables),
    ...Object.keys(target.boundVariables),
    ...Object.keys(target.variableBindingScales)
  ])) {
    if (
      !protectedField(bindingOverrideField(field)) &&
      !(field.startsWith(SCRIPT_INPUT_BINDING_PREFIX) && protectedField('script/inputs'))
    )
      continue
    if (!Object.hasOwn(target.boundVariables, field)) Reflect.deleteProperty(bindings, field)
    else bindings[field] = target.boundVariables[field]
    if (target.variableBindingScales[field] === undefined) Reflect.deleteProperty(scales, field)
    else scales[field] = target.variableBindingScales[field]
  }
  updates.boundVariables = bindings
  updates.variableBindingScales = scales
}

export function isProtectedSyncField(
  node: SceneNode,
  key: string,
  protectedField: (field: string) => boolean
): boolean {
  return (
    protectedField(key) ||
    (key in node.boundVariables &&
      (protectedField('boundVariables') || protectedField(bindingOverrideField(key))))
  )
}

export function sourceInTargetCoordinates(source: SceneNode, targetScale: number): SceneNode {
  const factor = targetScale / source.componentScale
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('Invalid component coordinate scale')
  if (factor === 1) return source
  return {
    ...source,
    ...scaleNodeChanges(source, factor, true),
    ...scaleVariableBindingUnits(source, factor)
  }
}

interface SyncedFieldsInput {
  compParent: SceneNode
  instParent: SceneNode
  /** The component's coordinates in the copy's. */
  factor: number
  /** Fields the copy keeps: overridden, bound, or driven by a property. */
  skip: (key: string) => boolean
}

function followPaints(
  updates: Partial<SceneNode>,
  copy: SceneNode,
  source: SceneNode,
  skip: SyncedFieldsInput['skip']
) {
  if (updates.fills)
    updates.fillStyleId = skip('fillStyleId') ? copy.fillStyleId : source.fillStyleId
  if (hasShaderPaint(copy) || hasShaderPaint(source))
    updates.pluginData = withSyncedShaderPaints(copy, source, {
      fills: skip('fills') ? undefined : (updates.fills ?? copy.fills),
      strokes: skip('strokes') ? undefined : (updates.strokes ?? copy.strokes)
    })
}

/** The fields a copy takes from its component's layer, placed in the copy's parent. */
export function copySyncedFields(
  updates: Partial<SceneNode>,
  copy: SceneNode,
  source: SceneNode,
  { compParent, instParent, factor, skip }: SyncedFieldsInput
): SyncedPlacement {
  // In an auto layout flow the layout places the copy, as it placed the component's layer.
  const placedByLayout = instParent.layoutMode !== 'NONE' && source.layoutPositioning !== 'ABSOLUTE'
  const placed = placedByLayout
    ? source
    : placedByConstraints(source, compParent, instParent, factor)
  for (const key of INSTANCE_SYNC_FIELDS) {
    if (key === 'boundVariables') continue
    if (placedByLayout && (key === 'x' || key === 'y')) continue
    if (skip(key)) continue
    const owner = INSTANCE_SYNC_FIELD_OWNERS[key]
    if (owner && skip(owner)) continue
    const from = PLACEMENT_FIELDS.has(key) ? placed : source
    // Most fields already match: comparing first spares cloning them for nothing.
    if (isEqual(copy[key], from[key])) continue
    copyProp(updates, from, key)
  }
  followPaints(updates, copy, source, skip)
  syncScriptFields(copy, source, updates, skip)
  syncNoteFields(copy, source, updates, skip)
  followVectorGeometry(updates, copy, source)
  remeasureChangedText(updates, copy)
  return { placed, x: !placedByLayout && !skip('x'), y: !placedByLayout && !skip('y') }
}

export function updateSyncedProps(
  graph: SceneGraph,
  target: SceneNode,
  updates: Partial<SceneNode>
): void {
  const changed = Object.fromEntries(
    Object.entries(updates).filter(
      ([key, value]) => !isEqual(target[key as keyof SceneNode], value)
    )
  ) as Partial<SceneNode>
  if (changed.fills && updates.fillStyleId !== undefined) changed.fillStyleId = updates.fillStyleId
  if (Object.keys(changed).length) graph.updateNode(target.id, changed)
}
