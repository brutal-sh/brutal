import { getRecoveryStore } from '@/app/document/recovery/store'
import type { DocumentRecoveryOptions, RecoveryStore } from '@/app/document/recovery/types'
import { createCanvasId } from '@/app/storage/id'

export type RecoveryRuntime = Omit<Required<DocumentRecoveryOptions>, 'store' | 'recoveryId'> & {
  store: RecoveryStore
  id: string
  protectedVersion: number
  persistedVersion: number | null
  requestedVersion: number
  lifecycleGeneration: number
  writing: Promise<void> | null
  cleanup: Promise<void>
  disposed: boolean
}

export function createRecoveryRuntime(options: DocumentRecoveryOptions): RecoveryRuntime {
  const store = options.store ?? getRecoveryStore()
  const id = options.recoveryId ?? createCanvasId()
  const version = options.version()
  return {
    state: options.state,
    version: options.version,
    buildFigFile: options.buildFigFile,
    hasWritableSource: options.hasWritableSource,
    getSource: options.getSource ?? (() => null),
    hasUnsavedChanges: options.hasUnsavedChanges ?? (() => true),
    isEnabled: options.isEnabled ?? (() => true),
    store,
    id,
    protectedVersion: version,
    persistedVersion: null,
    requestedVersion: version,
    lifecycleGeneration: 0,
    writing: null,
    cleanup: Promise.resolve(),
    disposed: false
  }
}

export function hasManagedRecoverySource(runtime: RecoveryRuntime): boolean {
  return runtime.hasWritableSource() && runtime.getSource() === null
}
