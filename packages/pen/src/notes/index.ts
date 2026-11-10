import type { SceneNode } from '@open-pencil/scene-graph'
import { tryParseColor } from '@open-pencil/scene-graph/color'
import { initializeNote, noteBody } from '@open-pencil/scene-graph/generated'
import { recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { PenImportDiagnostic } from '../compatibility'
import { parseSize } from '../layout'
import type { Build } from '../nodes'
import type { PenOverride, PenNode, PenDocument } from '../schema'
import { bindIfVar, isVarRef } from '../variables'

const NOTE_FIELDS = new Set([
  'id',
  'type',
  'name',
  'reusable',
  'context',
  'x',
  'y',
  'width',
  'height',
  'color',
  'content',
  'enabled',
  'opacity',
  'rotation',
  'flipX',
  'flipY',
  'layoutPosition',
  'effect',
  'theme'
])

/** Refuse unqualified Note variants before building any graph, rather than flattening them. */
export function inspectNote(
  node: PenOverride,
  document: PenDocument,
  options: { path: string }
): PenImportDiagnostic[] {
  if (node.type !== 'note') return []
  const problems: string[] = []
  if (document.version !== '2.22')
    problems.push('Only the measured 2.22 Note contract is supported.')
  const unsupported = Object.keys(node).filter((key) => !NOTE_FIELDS.has(key))
  if (unsupported.length) problems.push(`Unqualified Note fields: ${unsupported.join(', ')}.`)
  if (isVarRef(node.content)) problems.push('Variable Note content is not yet supported.')
  problems.push(...noteColorProblems(node, document))
  for (const axis of ['width', 'height'] as const) {
    if (typeof node[axis] === 'string' && parseSize(node[axis], 0).sizing !== 'FILL')
      problems.push(`Variable or keyword Note ${axis} is not yet supported.`)
    if (typeof node[axis] === 'number' && !Number.isFinite(node[axis]))
      problems.push(`Note ${axis} must be finite.`)
  }
  return problems.map((message) => ({
    code: 'unsupported-node',
    path: options.path,
    nodeId: node.id,
    message
  }))
}

function noteColorProblems(node: PenOverride, document: PenDocument): string[] {
  const problems: string[] = []
  if (node.color !== undefined && !isVarRef(node.color) && !tryParseColor(node.color))
    problems.push('The Note color cannot be parsed.')
  if (isVarRef(node.color) && !validColorReference(node.color, document))
    problems.push('The Note color requires valid color variables and aliases.')
  return problems
}

function validColorReference(reference: string, document: PenDocument): boolean {
  const pending = [{ value: reference, exiting: false }]
  const visited = new Set<string>()
  const active = new Set<string>()
  while (pending.length) {
    const entry = pending.pop()
    if (!entry) continue
    const { value, exiting } = entry
    if (exiting) {
      active.delete(value)
      visited.add(value)
      continue
    }
    if (!isVarRef(value)) {
      if (!tryParseColor(value)) return false
      continue
    }
    if (active.has(value)) return false
    if (visited.has(value)) continue
    const values = colorVariableValues(value, document)
    if (!values) return false
    active.add(value)
    pending.push({ value, exiting: true })
    for (const item of values) pending.push({ value: item, exiting: false })
  }
  return true
}

function colorVariableValues(reference: string, document: PenDocument): string[] | undefined {
  const variable = document.variables?.[reference.slice(1)]
  if (variable?.type !== 'color') return undefined
  const values = Array.isArray(variable.value)
    ? variable.value.map((entry) => entry.value)
    : [variable.value]
  if (!values.length || !values.every((entry): entry is string => typeof entry === 'string'))
    return undefined
  return values
}

export function readNote(node: SceneNode, pen: PenNode, build: Build): void {
  let color: Color | undefined
  if (pen.color !== undefined)
    color = isVarRef(pen.color)
      ? build.ctx.resolveColor(pen.color)
      : (tryParseColor(pen.color) ?? undefined)
  initializeNote(build.graph, node, {
    definition: { width: pen.width, height: pen.height },
    content: pen.content ?? '',
    color,
    body: build.graph.getChildren(node.id).find((child) => child.type === 'TEXT')
  })
  bindIfVar(node, 'fills/0/color', pen.color, build.ctx)
}

export function claimNoteContent(node: SceneNode, override: PenOverride, build: Build): void {
  if (!Object.hasOwn(override, 'content')) return
  const body = noteBody(build.graph, node)
  if (body) recordInstanceOverride(build.graph, body.id, ['text'])
}
