import * as v from 'valibot'

import { recoveryFileSourceSchema } from '@/app/document/recovery/schema'
import type {
  RecoveryFileSource,
  RecoverySnapshotInput,
  RecoverySnapshotMeta
} from '@/app/document/recovery/types'

export class RecoverySourceValidationError extends Error {
  override name = 'RecoverySourceValidationError'
}

export function parseRecoveryFileSource(input: unknown): RecoveryFileSource {
  const result = v.safeParse(recoveryFileSourceSchema, input)
  if (!result.success)
    throw new RecoverySourceValidationError(
      'Recovery file identity is invalid; the backup is retained.'
    )
  return result.output
}

export function createRecoveryMetadata(input: RecoverySnapshotInput): RecoverySnapshotMeta {
  return {
    id: input.id,
    documentName: input.documentName || 'Untitled',
    updatedAt: new Date().toISOString(),
    byteLength: input.figBytes.byteLength,
    formatVersion: 1,
    ...(input.source === undefined ? {} : { source: parseRecoveryFileSource(input.source) })
  }
}
