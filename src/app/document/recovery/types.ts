export interface RecoverySnapshotMeta {
  id: string
  documentName: string
  updatedAt: string
  byteLength: number
  formatVersion: 1
}

export interface RecoverySnapshot extends RecoverySnapshotMeta {
  figBytes: Uint8Array
}

export interface RecoverySnapshotInput {
  id: string
  documentName: string
  figBytes: Uint8Array
}

export interface RecoveryStore {
  list(): Promise<RecoverySnapshotMeta[]>
  read(id: string): Promise<RecoverySnapshot | null>
  write(input: RecoverySnapshotInput): Promise<RecoverySnapshotMeta>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export interface DocumentRecoveryOptions {
  state: { documentName: string }
  /** The document's content revision; rendering and layout do not advance it. */
  version: () => number
  buildFigFile: () => Promise<Uint8Array> | Uint8Array
  hasWritableSource: () => boolean
  hasUnsavedChanges?: () => boolean
  isEnabled?: () => boolean
  store?: RecoveryStore
  recoveryId?: string
}

export interface DocumentRecoveryController {
  getRecoveryId(): string
  adoptRecoverySnapshot(id: string): Promise<void>
  persistNow(): Promise<void>
  markProtectedVersion(version: number): Promise<void>
  discardRecovery(): Promise<void>
  disposeRecovery(): void
}
