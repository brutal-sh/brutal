import { mapBlendMode } from './paints'
import type { PenDocument, PenOverride, PenPaints } from './schema'

export interface PenImportDiagnostic {
  code:
    | 'unsupported-version'
    | 'unsupported-node'
    | 'unsupported-paint'
    | 'unsupported-effect'
    | 'unsupported-blend'
    | 'unsupported-import'
    | 'unsupported-slot'
    | 'unsupported-component'
  /** JSON Pointer into the source document. */
  path: string
  nodeId?: string
  message: string
}

const NODE_TYPES = new Set([
  'frame',
  'rectangle',
  'ellipse',
  'polygon',
  'group',
  'text',
  'icon_font',
  'path',
  'icon',
  'ref'
])
const GRADIENT_TYPES = new Set(['linear', 'radial', 'angular'])
const EFFECT_TYPES = new Set(['blur', 'background_blur', 'shadow'])
const MAX_ERROR_DETAILS = 8

const pointerKey = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')

/** Known conversion losses; an empty result is not a claim of complete format fidelity. */
export function inspectPenCompatibility(doc: PenDocument): PenImportDiagnostic[] {
  const diagnostics: PenImportDiagnostic[] = []
  const add = (code: PenImportDiagnostic['code'], path: string, message: string, nodeId?: string) =>
    diagnostics.push({ code, path, message, ...(nodeId === undefined ? {} : { nodeId }) })

  if (doc.version !== undefined) {
    const parts = /^(\d+)(?:\.(\d+))?$/.exec(doc.version)
    const major = Number(parts?.[1])
    const minor = Number(parts?.[2] ?? 0)
    if (!parts || major > 2 || (major === 2 && minor > 21)) {
      add(
        'unsupported-version',
        '/version',
        `Schema ${doc.version} is not supported; the reader targets 2.21 and legacy forms.`
      )
    }
  }
  for (const alias of Object.keys(doc.imports ?? {})) {
    add(
      'unsupported-import',
      `/imports/${pointerKey(alias)}`,
      'Imported .pen libraries are not resolved.'
    )
  }

  function blend(value: string | undefined, path: string, nodeId?: string) {
    if (value !== undefined && typeof mapBlendMode(value) !== 'string') {
      add('unsupported-blend', path, `Blend mode ${value} would be replaced with normal.`, nodeId)
    }
  }

  function paints(value: PenPaints | undefined, path: string, nodeId?: string) {
    if (value === undefined) return
    const list = Array.isArray(value) ? value : [value]
    list.forEach((paint, index) => {
      if (typeof paint === 'string') return
      const at = Array.isArray(value) ? `${path}/${index}` : path
      const supported =
        paint.type === 'color' ||
        paint.type === 'image' ||
        (paint.type === 'gradient' && GRADIENT_TYPES.has(String(paint.gradientType ?? 'linear')))
      if (!supported) {
        add(
          'unsupported-paint',
          at,
          `Paint ${paint.type} would be omitted or cannot be rendered.`,
          nodeId
        )
      }
      blend(paint.blendMode, `${at}/blendMode`, nodeId)
    })
  }

  function visit(node: PenOverride, path: string, inheritedId?: string) {
    const nodeId = node.id ?? inheritedId
    if (node.type !== undefined && !NODE_TYPES.has(node.type)) {
      add(
        'unsupported-node',
        `${path}/type`,
        `Node type ${node.type} has no equivalent editor behavior.`,
        nodeId
      )
    }
    if (node.reusable && node.type !== 'frame') {
      add(
        'unsupported-component',
        `${path}/reusable`,
        'Only frame components retain linked instances; this component would become plain copies.',
        nodeId
      )
    }
    if (Array.isArray(node.slot)) {
      add('unsupported-slot', `${path}/slot`, 'Pen slot semantics are not imported.', nodeId)
    }
    paints(node.fill, `${path}/fill`, nodeId)
    const stroke = node.stroke
    if (
      stroke !== undefined &&
      !(typeof stroke === 'object' && !Array.isArray(stroke) && 'thickness' in stroke)
    ) {
      paints(stroke, `${path}/stroke`, nodeId)
    }
    const effects =
      node.effect === undefined ? [] : Array.isArray(node.effect) ? node.effect : [node.effect]
    effects.forEach((effect, index) => {
      const at = Array.isArray(node.effect) ? `${path}/effect/${index}` : `${path}/effect`
      if (!EFFECT_TYPES.has(effect.type)) {
        add('unsupported-effect', at, `Effect ${effect.type} would be omitted.`, nodeId)
      }
      blend(effect.blendMode, `${at}/blendMode`, nodeId)
    })
    node.children?.forEach((child, index) => visit(child, `${path}/children/${index}`))
    for (const [key, override] of Object.entries(node.descendants ?? {})) {
      visit(override, `${path}/descendants/${pointerKey(key)}`, nodeId)
    }
  }

  doc.children.forEach((node, index) => visit(node, `/children/${index}`))
  return diagnostics
}

export class PenImportError extends Error {
  readonly code = 'pen-import-loss'

  constructor(readonly diagnostics: readonly PenImportDiagnostic[]) {
    const details = diagnostics
      .slice(0, MAX_ERROR_DETAILS)
      .map((item) => `${item.path}: ${item.message}`)
    const remaining = diagnostics.length - details.length
    super(
      `Cannot import .pen without losing content. ${details.join(' ')}${remaining > 0 ? ` ${remaining} more issue(s).` : ''} Keep the original file; convert unsupported content in a copy before importing.`
    )
    this.name = 'PenImportError'
  }
}

/** Refuse known lossy conversions before creating any graph or loading external assets. */
export function assertPenCompatible(doc: PenDocument): void {
  const diagnostics = inspectPenCompatibility(doc)
  if (diagnostics.length > 0) throw new PenImportError(diagnostics)
}
