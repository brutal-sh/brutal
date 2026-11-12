import type { DiagnosticReporter, PenImportDiagnostic } from './compatibility/diagnostics'
import { inspectDocument } from './compatibility/document'
import { inspectChildren } from './compatibility/nodes'
import { inspectNoteReferences } from './notes/references'
import type { PenDocument } from './schema'

export type { PenImportDiagnostic } from './compatibility/diagnostics'

const MAX_ERROR_DETAILS = 8

/** Known conversion losses; an empty result is not a claim of complete format fidelity. */
export function inspectPenCompatibility(doc: PenDocument): PenImportDiagnostic[] {
  const diagnostics: PenImportDiagnostic[] = []
  const add: DiagnosticReporter = (code, path, message, nodeId) =>
    diagnostics.push({ code, path, message, ...(nodeId === undefined ? {} : { nodeId }) })
  inspectDocument(doc, add)
  diagnostics.push(...inspectNoteReferences(doc))
  inspectChildren(doc, diagnostics, add)
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
