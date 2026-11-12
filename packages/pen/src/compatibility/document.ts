import type { PenDocument } from '../schema'
import { pointerKey, type DiagnosticReporter } from './diagnostics'

function inspectVersion(version: string | undefined, add: DiagnosticReporter): void {
  if (version !== undefined) {
    const parts = /^(\d+)(?:\.(\d+))?$/.exec(version)
    const major = Number(parts?.[1])
    const minor = Number(parts?.[2] ?? 0)
    if (!parts || major > 2 || (major === 2 && minor > 22)) {
      add(
        'unsupported-version',
        '/version',
        `Schema ${version} is not supported; the reader targets 2.22 and legacy forms.`
      )
    }
  }
}

export function inspectDocument(doc: PenDocument, add: DiagnosticReporter): void {
  inspectVersion(doc.version, add)
  for (const alias of Object.keys(doc.imports ?? {})) {
    add(
      'unsupported-import',
      `/imports/${pointerKey(alias)}`,
      'Imported .pen libraries are not resolved.'
    )
  }
}
