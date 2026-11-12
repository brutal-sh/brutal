export interface PenImportDiagnostic {
  code:
    | 'unsupported-version'
    | 'unsupported-node'
    | 'unsupported-paint'
    | 'unsupported-effect'
    | 'unsupported-blend'
    | 'unsupported-import'
    | 'unsupported-font'
    | 'unsupported-slot'
    | 'unsupported-component'
  /** JSON Pointer into the source document. */
  path: string
  nodeId?: string
  message: string
}

export type DiagnosticReporter = (
  code: PenImportDiagnostic['code'],
  path: string,
  message: string,
  nodeId?: string
) => void

export interface NodeLocation {
  path: string
  nodeId?: string
  inComponent: boolean
  override: boolean
}

export const pointerKey = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')
