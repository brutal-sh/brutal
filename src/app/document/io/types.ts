import type * as v from 'valibot'

import type { documentSourceIdentitySchema } from '@/app/document/io/schema'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'

export type DocumentSourceIdentity = Readonly<v.InferOutput<typeof documentSourceIdentitySchema>>

export type DocumentSourceAccess = {
  getFileHandle: () => FileSystemFileHandle | null
  setFileHandle: (handle: FileSystemFileHandle | null) => void
  getFilePath: () => string | null
  setFilePath: (path: string | null) => void
  getDownloadName: () => string | null
  setDownloadName: (name: string | null) => void
  getStorageBinding: () => StorageDocumentBinding | null
  setStorageBinding: (binding: StorageDocumentBinding | null) => void
  /** Whether saving writes in place rather than asking for a location. */
  hasWritableSource: () => boolean
  setSourceIdentity: (identity: DocumentSourceIdentity) => void
  getSavedVersion: () => number
  setSavedVersion: (version: number) => void
  setLastWriteTime: (time: number) => void
}

export type ViewportSize = { width: number; height: number }
