import type { DBSchema } from 'idb'

import { createRecoveryMetadata } from '@/app/document/recovery/metadata'
import type {
  RecoverySnapshot,
  RecoverySnapshotInput,
  RecoverySnapshotMeta,
  RecoveryStore
} from '@/app/document/recovery/types'
import {
  APP_DATABASE_NAMES,
  binaryStorage,
  defineAppDatabase,
  connectAppDatabase,
  readStoredBinary,
  type StoredBinary,
  type AppDatabase
} from '@/app/storage/idb'

const recoveryDatabase = defineAppDatabase<RecoveryDatabase>({
  name: APP_DATABASE_NAMES.recovery,
  version: 1,
  callbacks: {
    upgrade(database) {
      if (!database.objectStoreNames.contains('meta'))
        database.createObjectStore('meta', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('fig')) database.createObjectStore('fig')
    }
  }
})

interface RecoveryDatabase extends DBSchema {
  meta: {
    key: string
    value: RecoverySnapshotMeta
  }
  fig: {
    key: string
    value: StoredBinary
  }
}

export function createIdbRecoveryStore(): RecoveryStore {
  const database = connectAppDatabase(recoveryDatabase)

  return {
    async list() {
      const rows = await (await database.open()).getAll('meta')
      return rows.toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },

    async read(id: string) {
      const db = await database.open()
      const transaction = db.transaction(['meta', 'fig'])
      const [metadata, stored] = await Promise.all([
        transaction.objectStore('meta').get(id),
        transaction.objectStore('fig').get(id)
      ])
      await transaction.done
      const figBytes = await readStoredBinary(stored)
      return metadata && figBytes ? ({ ...metadata, figBytes } satisfies RecoverySnapshot) : null
    },

    write: (input) => writeSnapshot(database, input),

    async remove(id: string) {
      const db = await database.open()
      const transaction = db.transaction(['meta', 'fig'], 'readwrite')
      await Promise.all([
        transaction.objectStore('meta').delete(id),
        transaction.objectStore('fig').delete(id),
        transaction.done
      ])
    },

    async clear() {
      const db = await database.open()
      const transaction = db.transaction(['meta', 'fig'], 'readwrite')
      await Promise.all([
        transaction.objectStore('meta').clear(),
        transaction.objectStore('fig').clear(),
        transaction.done
      ])
    }
  }
}

async function writeSnapshot(
  database: AppDatabase<RecoveryDatabase>,
  input: RecoverySnapshotInput
) {
  const metadata = createRecoveryMetadata(input)
  const db = await database.open()
  const storeBinary = await binaryStorage()
  const transaction = db.transaction(['meta', 'fig'], 'readwrite')
  await Promise.all([
    transaction.objectStore('meta').put(metadata),
    transaction.objectStore('fig').put(storeBinary(input.figBytes), input.id),
    transaction.done
  ])
  return metadata
}
