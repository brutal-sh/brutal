import type { ScriptInput } from '@open-pencil/core/scripts/header'

import type { evaluateCanvasScript } from '@/app/document/scripts/evaluate'
import type { loadCanvasScriptSource } from '@/app/document/scripts/source'

export interface ScriptRuntimeState {
  loading: boolean
  definitions: ScriptInput[]
  error?: string
}
export interface ScriptRun {
  controller: AbortController
  timer?: ReturnType<typeof setTimeout>
  key: string
}

export interface ScriptSource {
  source?: string
  promise?: Promise<string>
  stop?: () => void
  version: number
}
export interface ScriptRuntimeOptions {
  getDocumentPath: () => string | null
  adoptChanges<T>(apply: () => T): T
  loadSource?: typeof loadCanvasScriptSource
  evaluate?: typeof evaluateCanvasScript
  watchSource?: (path: string, changed: () => void) => Promise<() => void>
}
