import type { DocumentSourceOptions } from '@/app/document/io/source/types'
import { parseRecoveryFileSource } from '@/app/document/recovery/metadata'
import type { RecoveryFileSource } from '@/app/document/recovery/types'
import { isTauri } from '@/app/tauri/env'

export function getRecoveryFileSource(
  options: DocumentSourceOptions,
  getNativeHash?: (path: string) => string | undefined
): RecoveryFileSource | null {
  if (options.getStorageBinding()) return null
  const identity = options.getSourceIdentity()
  const handle = options.getFileHandle()
  const path = options.getFilePath()
  const confirmedHandle = handle !== null && handle === identity.handle
  const confirmedPath = isTauri() && path !== null && path === identity.path
  if (!confirmedHandle && !confirmedPath) return null
  const fileName = options.getDownloadName()
  if (fileName === null) return null
  const nativeHash = confirmedPath ? getNativeHash?.(path) : undefined
  return { fileName, identity, ...(nativeHash === undefined ? {} : { nativeHash }) }
}

export function validateRecoveryFileSource(input: unknown): RecoveryFileSource {
  const source = parseRecoveryFileSource(input)
  if (source.identity.path !== null && !isTauri())
    throw new Error('A desktop file backup must be restored in the desktop app.')
  return source
}
