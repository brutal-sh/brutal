import { isEqual, omit } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'
import {
  noteBody,
  noteOfNode,
  noteForeground,
  NOTE_FRAME_STYLE,
  NOTE_TEXT_STYLE,
  type NoteDefinition
} from '@open-pencil/scene-graph/generated'
import { authoredLayoutSizing } from '@open-pencil/scene-graph/layout'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

import { parseSize } from '../layout'
import type { PenNode } from '../schema'
import { isVarRef } from '../variables'
import { nodeDiagnostics, type PenExportDiagnostic } from './diagnostics'

const DERIVED_FIELDS = [
  'fill',
  'stroke',
  'cornerRadius',
  'layout',
  'gap',
  'padding',
  'justifyContent',
  'alignItems',
  'layoutIncludeStroke',
  'clip'
] as const
const BODY_CONTENT_FIELDS = new Set<keyof SceneNode>([
  'id',
  'parentId',
  'name',
  'text',
  'width',
  'height',
  'fills',
  'source',
  'derivedLayout',
  'textPicture',
  'derivedTextGlyphs',
  'derivedTextHeight'
])

function inspectBody(body: SceneNode, path: string, copy: boolean): PenExportDiagnostic[] {
  const problems = nodeDiagnostics(body, path, copy)
  const defaults = { ...createDefaultNode(() => body.id, 'TEXT'), ...NOTE_TEXT_STYLE }
  for (const field of Object.keys(defaults) as (keyof SceneNode)[]) {
    if (
      !BODY_CONTENT_FIELDS.has(field) &&
      !(copy && field === 'componentId') &&
      !isEqual(body[field], defaults[field])
    )
      problems.push({
        nodeId: body.id,
        path: `${path}/${field}`,
        message: 'A Note cannot retain custom body styling or metadata.'
      })
  }
  return problems
}

/** Emit the Note's authored values; its generated text layer never leaks into the file. */
export function finishNote(
  graph: SceneGraph,
  node: SceneNode,
  result: PenNode,
  diagnostics: PenExportDiagnostic[]
): PenNode {
  const definition = noteOfNode(node)
  if (!definition) return result
  const path = `/nodes/${node.id}`
  const problem = (message: string) => diagnostics.push({ nodeId: node.id, path, message })
  inspectFrame(graph, node, definition, problem)
  finishNoteBody(graph, node, result, diagnostics)
  finishNoteColor(result, problem)
  for (const [dimension, axis] of [
    ['width', 'HORIZONTAL'],
    ['height', 'VERTICAL']
  ] as const) {
    const authored = definition[dimension]
    if (authoredLayoutSizing(graph, node, axis) === 'FILL') {
      result[dimension] =
        typeof authored === 'number'
          ? `fill_container(${authored})`
          : (authored ?? result[dimension])
    } else result[dimension] = typeof authored === 'string' ? node[dimension] : authored
  }
  return { ...omit(result, DERIVED_FIELDS), id: result.id, type: result.type }
}

function finishNoteBody(
  graph: SceneGraph,
  node: SceneNode,
  result: PenNode,
  diagnostics: PenExportDiagnostic[]
): void {
  const path = `/nodes/${node.id}`
  const problem = (message: string) => diagnostics.push({ nodeId: node.id, path, message })
  const body = noteBody(graph, node)
  const background = (resolvedPaintBindings(graph, node).fills ?? node.fills).at(0)
  if (!body) problem('The Note must have exactly one generated text body.')
  else {
    const copy =
      node.type === 'INSTANCE' ||
      !!(node.parentId && graph.closest(node.parentId, (parent) => parent.type === 'INSTANCE'))
    diagnostics.push(...inspectBody(body, `${path}/content`, copy))
    result.content = body.text
    if (background && !isEqual(body.fills, [colorToFill(noteForeground(background.color))]))
      problem('Custom Note body paints cannot be preserved.')
    if (isVarRef(body.text)) problem('Variable-looking Note content is not yet supported.')
  }
}

function finishNoteColor(result: PenNode, problem: (message: string) => unknown): void {
  const paint = Array.isArray(result.fill) ? result.fill[0] : result.fill
  if (typeof paint === 'string') result.color = paint
  else if (paint?.type === 'color' && typeof paint.color === 'string') result.color = paint.color
  else problem('The Note background color cannot be written.')
}

function inspectFrame(
  graph: SceneGraph,
  node: SceneNode,
  definition: NoteDefinition,
  problem: (message: string) => unknown
): void {
  inspectNoteBackground(node, problem)
  for (const field of Object.keys(NOTE_FRAME_STYLE) as (keyof typeof NOTE_FRAME_STYLE)[]) {
    if (!isEqual(node[field], NOTE_FRAME_STYLE[field]))
      problem(`Custom Note ${field} cannot be preserved.`)
  }
  inspectNoteDimensions(graph, node, definition, problem)
  if (node.fills[0]?.blendMode && !['NORMAL', 'PASS_THROUGH'].includes(node.fills[0].blendMode))
    problem('Custom Note background blending cannot be preserved.')
}

function inspectNoteBackground(node: SceneNode, problem: (message: string) => unknown): void {
  const fill = node.fills.at(0)
  if (node.fills.length !== 1 || fill?.type !== 'SOLID' || !fill.visible)
    problem('A Note requires one visible solid background color.')
}

function unsupportedNoteDimension(value: NoteDefinition['width']): boolean {
  return typeof value === 'string' && parseSize(value, 0).sizing !== 'FILL'
}

function inspectNoteDimensions(
  graph: SceneGraph,
  node: SceneNode,
  definition: NoteDefinition,
  problem: (message: string) => unknown
): void {
  if (
    unsupportedNoteDimension(definition.width) ||
    unsupportedNoteDimension(definition.height) ||
    node.boundVariables.width ||
    node.boundVariables.height
  )
    problem('Variable or Hug Note dimensions are not yet supported.')
  if (
    authoredLayoutSizing(graph, node, 'HORIZONTAL') === 'HUG' ||
    authoredLayoutSizing(graph, node, 'VERTICAL') === 'HUG'
  )
    problem('Hug Note sizing cannot yet be preserved.')
}
