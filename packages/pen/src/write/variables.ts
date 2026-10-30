import * as v from 'valibot'

import type {
  SceneGraph,
  SceneNode,
  VariableValue,
  Variable,
  VariableCollection
} from '@open-pencil/scene-graph'
import { colorToHex8 } from '@open-pencil/scene-graph/color'
import { paintBindingTarget } from '@open-pencil/scene-graph/variables'

import {
  penMeshPaintSchema,
  type PenPaint,
  type PenDocument,
  type PenNode,
  type PenVariableScalar
} from '../schema'
import type { PenExportDiagnostic } from './diagnostics'

const FIELDS: Record<string, string> = {
  visible: 'enabled',
  opacity: 'opacity',
  width: 'width',
  height: 'height',
  itemSpacing: 'gap',
  cornerRadius: 'cornerRadius',
  strokeWeight: 'strokeWidth',
  fontFamily: 'fontFamily',
  fontSize: 'fontSize'
}
const SIDES = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']

function hasCollectionMetadata(collection: VariableCollection): boolean {
  return !!(
    collection.key ||
    collection.version ||
    collection.modeAttribute ||
    collection.pluginData?.length ||
    collection.modes.some((mode) => mode.condition)
  )
}

function hasVariableMetadata(variable: Variable): boolean {
  return !!(
    variable.description ||
    variable.hiddenFromPublishing ||
    variable.key ||
    variable.version ||
    variable.expressions ||
    variable.codeSyntax ||
    variable.pluginData?.length ||
    (variable.unit && variable.unit !== 'none') ||
    variable.scopes?.some((scope) => scope !== 'ALL_SCOPES')
  )
}

function writeMeshColorReference(
  paint: PenPaint | undefined,
  index: number | undefined,
  ref: string
): boolean {
  if (index === undefined) return false
  const mesh = v.safeParse(penMeshPaintSchema, paint)
  if (
    !mesh.success ||
    mesh.output.colors?.[index] === undefined ||
    !paint ||
    typeof paint === 'string'
  )
    return false
  mesh.output.colors[index] = ref
  paint.colors = mesh.output.colors
  return true
}

/** Native collections become independent .pen theme axes; aliases remain variable references. */
export function writeVariables(graph: SceneGraph, diagnostics: PenExportDiagnostic[]) {
  const themes: NonNullable<PenDocument['themes']> = {}
  const variables: NonNullable<PenDocument['variables']> = {}
  const names = new Map<string, string>()
  const axes = new Map<string, { axis: string; modes: Map<string, string> }>()
  const usedNames = new Set<string>()
  const usedAxes = new Set<string>()
  const problem = (path: string, message: string, nodeId?: string) =>
    diagnostics.push({ path, message, nodeId })
  const unique = (base: string, used: Set<string>) => {
    let name = base
    let suffix = 2
    while (used.has(name)) name = `${base}_${suffix++}`
    used.add(name)
    return name
  }
  for (const collection of graph.variableCollections.values()) {
    const axis = unique(collection.name || 'Theme', usedAxes)
    const usedModes = new Set<string>()
    const ordered = [...collection.modes].sort(
      (a, b) =>
        Number(b.modeId === collection.defaultModeId) -
        Number(a.modeId === collection.defaultModeId)
    )
    const modes = new Map(
      ordered.map((mode) => [mode.modeId, unique(mode.name || 'Default', usedModes)])
    )
    axes.set(collection.id, { axis, modes })
    if (collection.modes.length > 1) themes[axis] = [...modes.values()]
    if (hasCollectionMetadata(collection))
      problem(
        `/variables/collections/${collection.id}`,
        'Library, conditional, attribute or plugin metadata on variable collections is not supported.'
      )
  }
  for (const variable of graph.variables.values())
    names.set(variable.id, unique(variable.name || 'Variable', usedNames))

  function value(raw: VariableValue | undefined, path: string): PenVariableScalar {
    if (typeof raw === 'string' && raw.startsWith('$') && raw.length > 1) {
      problem(
        path,
        'Literal strings beginning with $ would be read as variable references; use a different literal or keep the .fig original.'
      )
      return ''
    }
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw
    if (raw && 'r' in raw) return colorToHex8(raw)
    if (raw && 'aliasId' in raw) {
      const name = names.get(raw.aliasId)
      if (name) return `$${name}`
    }
    problem(
      path,
      'Missing values, unresolved aliases and variable expressions cannot be represented.'
    )
    return ''
  }
  for (const variable of graph.variables.values()) {
    const name = names.get(variable.id)
    const collection = graph.variableCollections.get(variable.collectionId)
    const axis = axes.get(variable.collectionId)
    if (!name || !collection || !axis) {
      problem(`/variables/${variable.id}`, 'The variable has no valid collection.')
      continue
    }
    if (hasVariableMetadata(variable))
      problem(
        `/variables/${name}`,
        'Variable publishing, units, scopes, code or expression metadata is not supported.'
      )
    const type = variable.type === 'FLOAT' ? 'number' : variable.type.toLowerCase()
    variables[name] = {
      type,
      value:
        axis.modes.size > 1
          ? [...axis.modes].map(([id, mode]) => ({
              value: value(variable.valuesByMode[id], `/variables/${name}/${mode}`),
              theme: { [axis.axis]: mode }
            }))
          : value(variable.valuesByMode[collection.defaultModeId], `/variables/${name}`)
    }
  }

  function theme(
    modes: Record<string, string>,
    path: string,
    nodeId: string
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [collectionId, modeId] of Object.entries(modes)) {
      const axis = axes.get(collectionId)
      const mode = axis?.modes.get(modeId)
      if (!axis || !mode)
        problem(path, 'A theme override references a missing collection or mode.', nodeId)
      else if (axis.modes.size > 1) result[axis.axis] = mode
    }
    return result
  }
  function applyPaintBinding(
    node: SceneNode,
    pen: PenNode,
    field: string,
    ref: string,
    path: string
  ) {
    const target = paintBindingTarget(field)
    const paints = target?.list === 'fills' ? pen.fill : pen.stroke
    const paint = target && Array.isArray(paints) ? paints[target.index] : undefined
    if (target?.colorIndex !== undefined) {
      if (!writeMeshColorReference(paint, target.colorIndex, ref))
        problem(
          `${path}/boundVariables/${field}`,
          'A mesh color binding no longer names a mesh vertex.',
          node.id
        )
      return
    }
    if (paint && typeof paint === 'object' && paint.type === 'color') {
      const source = target?.list === 'fills' ? node.fills : node.strokes
      const original = target ? source[target.index] : undefined
      if (original && Math.abs(original.opacity - original.color.a) > 1e-8) {
        problem(
          `${path}/boundVariables/${field}`,
          'Bound color with independent paint opacity cannot be preserved by .pen color references.',
          node.id
        )
      }
      paint.color = ref
    } else
      problem(
        `${path}/boundVariables/${field}`,
        `Binding ${field} is not supported by the .pen reader.`,
        node.id
      )
  }

  function apply(node: SceneNode, pen: PenNode, path: string, topLevel: boolean) {
    const root = graph.getNode(graph.rootId)
    const page = node.parentId ? graph.getNode(node.parentId) : undefined
    const modes = topLevel
      ? {
          ...Object.fromEntries([...graph.activeMode].filter(([id]) => axes.has(id))),
          ...root?.variableModes,
          ...page?.variableModes,
          ...node.variableModes
        }
      : node.variableModes
    const selected = theme(modes, `${path}/theme`, node.id)
    if (Object.keys(selected).length) pen.theme = selected
    for (const [field, variableId] of Object.entries(node.boundVariables)) {
      const name = names.get(variableId)
      if (!name) {
        problem(
          `${path}/boundVariables/${field}`,
          'The binding references a missing variable.',
          node.id
        )
        continue
      }
      const ref = `$${name}`
      if (FIELDS[field]) pen[FIELDS[field]] = ref
      else if (SIDES.includes(field) && Array.isArray(pen.padding))
        pen.padding[SIDES.indexOf(field)] = ref
      else if (CORNERS.includes(field) && Array.isArray(pen.cornerRadius))
        pen.cornerRadius[CORNERS.indexOf(field)] = ref
      else applyPaintBinding(node, pen, field, ref, path)
    }
  }
  return { themes, variables, apply }
}
