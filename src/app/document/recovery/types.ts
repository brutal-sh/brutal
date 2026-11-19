import type * as v from 'valibot'

import type { recoveryFileSourceSchema } from '@/app/document/recovery/schema'

export type RecoveryFileSource = v.InferOutput<typeof recoveryFileSourceSchema>

export interface RecoverySnapshotMeta {
  id: string
  documentName: string
  updatedAt: string
  byteLength: number
  formatVersion: 1
  source?: RecoveryFileSource
  retainedOnClose?: true
}

export interface RecoverySnapshot extends RecoverySnapshotMeta {
  figBytes: Uint8Array
}

export interface RecoverySnapshotInput {
  source?: RecoveryFileSource
  id: string
  documentName: string
  figBytes: Uint8Array
}

export interface RecoveryStore {
  list(): Promise<RecoverySnapshotMeta[]>
  read(id: string): Promise<RecoverySnapshot | null>
  write(input: RecoverySnapshotInput): Promise<RecoverySnapshotMeta>
  retain(id: string): Promise<boolean>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export interface DocumentRecoveryOptions {
  state: { documentName: string }
  /** The document's content revision; rendering and layout do not advance it. */
  version: () => number
  buildFigFile: () => Promise<Uint8Array> | Uint8Array
  hasWritableSource: () => boolean
  /** Confirmed local-file identity; absent for drafts and managed/provisional targets. */
  getSource?: () => RecoveryFileSource | null
  hasUnsavedChanges?: () => boolean
  isEnabled?: () => boolean
  store?: RecoveryStore
  recoveryId?: string
}

export interface DocumentRecoveryController {
  getRecoveryId(): string
  adoptRecoverySnapshot(id: string): Promise<void>
  getRecoveryCloseVersion(): number | null
  retainOnClose(version: number): Promise<boolean>
  persistNow(): Promise<void>
  markProtectedVersion(version: number): Promise<void>
  discardRecovery(): Promise<void>
  disposeRecovery(): void
}
