import { inspectNote } from '../notes'
import type { PenDocument, PenOverride } from '../schema'
import {
  pointerKey,
  type DiagnosticReporter,
  type NodeLocation,
  type PenImportDiagnostic
} from './diagnostics'
import { inspectGraphics } from './graphics'

const NODE_TYPES = new Set([
  'frame',
  'rectangle',
  'ellipse',
  'polygon',
  'group',
  'text',
  'icon_font',
  'path',
  'line',
  'icon',
  'ref',
  'script',
  'note'
])

interface InspectionContext {
  doc: PenDocument
  diagnostics: PenImportDiagnostic[]
  add: DiagnosticReporter
  components: Set<string>
}

function collectComponents(nodes: PenOverride[], components: Set<string>) {
  for (const node of nodes) {
    if (node.reusable && node.type === 'frame' && node.id) components.add(node.id)
    if (node.children) collectComponents(node.children, components)
  }
}

function validSlot(node: PenOverride, location: NodeLocation): boolean {
  return (
    !location.override &&
    location.inComponent &&
    node.type === 'frame' &&
    !node.reusable &&
    !node.children?.length
  )
}

function inspectSlots(node: PenOverride, location: NodeLocation, context: InspectionContext) {
  const { path, nodeId, override } = location
  const { add, components } = context
  if (Array.isArray(node.slot)) {
    if (!validSlot(node, location))
      add(
        'unsupported-slot',
        `${path}/slot`,
        'Slots must be empty frames inside a component definition.',
        nodeId
      )
    for (const [index, suggestion] of node.slot.entries()) {
      if (!components.has(suggestion))
        add(
          'unsupported-slot',
          `${path}/slot/${index}`,
          'Slot suggestions must reference a frame component in this document.',
          nodeId
        )
    }
  } else if (override && node.slot !== undefined) {
    add(
      'unsupported-slot',
      `${path}/slot`,
      'Changing slot definitions through instance overrides is not supported.',
      nodeId
    )
  }
}

function inspectNodeType(node: PenOverride, location: NodeLocation, add: DiagnosticReporter) {
  const { path, nodeId } = location
  if (node.type !== undefined && !NODE_TYPES.has(node.type))
    add(
      'unsupported-node',
      `${path}/type`,
      `Node type ${node.type} has no equivalent editor behavior.`,
      nodeId
    )
  if (node.type === 'script' && node.children?.length)
    add(
      'unsupported-node',
      `${path}/children`,
      'Script output is derived; authored children are not supported.',
      nodeId
    )
}

function inspectReusable(node: PenOverride, location: NodeLocation, add: DiagnosticReporter) {
  if (node.reusable && node.type !== 'frame' && node.type !== 'script' && node.type !== 'note') {
    add(
      'unsupported-component',
      `${location.path}/reusable`,
      'Only frame and Script components retain linked instances; this component would become plain copies.',
      location.nodeId
    )
  }
}

function visit(node: PenOverride, location: NodeLocation, context: InspectionContext) {
  const { path, inComponent, override } = location
  const nodeId = node.id ?? location.nodeId
  const current = { ...location, nodeId }
  inspectNodeType(node, current, context.add)
  context.diagnostics.push(...inspectNote(node, context.doc, { path }))
  inspectReusable(node, current, context.add)
  inspectSlots(node, current, context)
  inspectGraphics(node, current, context.add)
  const childComponent = node.type === 'ref' ? false : inComponent || !!node.reusable
  node.children?.forEach((child, index) =>
    visit(
      child,
      { path: `${path}/children/${index}`, inComponent: childComponent, override },
      context
    )
  )
  for (const [key, descendant] of Object.entries(node.descendants ?? {})) {
    visit(
      descendant,
      {
        path: `${path}/descendants/${pointerKey(key)}`,
        nodeId,
        inComponent: false,
        override: true
      },
      context
    )
  }
}

export function inspectChildren(
  doc: PenDocument,
  diagnostics: PenImportDiagnostic[],
  add: DiagnosticReporter
) {
  const components = new Set<string>()
  collectComponents(doc.children, components)
  const context = { doc, diagnostics, add, components }
  doc.children.forEach((node, index) =>
    visit(node, { path: `/children/${index}`, inComponent: false, override: false }, context)
  )
}
