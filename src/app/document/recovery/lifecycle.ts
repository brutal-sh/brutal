import type { RecoveryRuntime } from '@/app/document/recovery/runtime'

async function invalidateActiveWrite(runtime: RecoveryRuntime): Promise<void> {
  runtime.lifecycleGeneration++
  await Promise.all([runtime.writing, runtime.cleanup])
}

export async function markRecoveryProtected(
  runtime: RecoveryRuntime,
  version: number
): Promise<void> {
  await invalidateActiveWrite(runtime)
  runtime.protectedVersion = version
  runtime.requestedVersion = runtime.version()
  if (runtime.persistedVersion == null || runtime.persistedVersion <= version) {
    await runtime.store.remove(runtime.id)
    runtime.persistedVersion = null
  }
}

export async function adoptRecovery(runtime: RecoveryRuntime, nextId: string): Promise<void> {
  const previousId = runtime.id
  await invalidateActiveWrite(runtime)
  runtime.id = nextId
  const version = runtime.version()
  runtime.protectedVersion = version
  runtime.persistedVersion = version
  runtime.requestedVersion = version
  runtime.disposed = false
  if (previousId !== nextId) await runtime.store.remove(previousId)
}

export async function discardRecovery(runtime: RecoveryRuntime): Promise<void> {
  await invalidateActiveWrite(runtime)
  runtime.protectedVersion = runtime.version()
  runtime.persistedVersion = null
  runtime.requestedVersion = runtime.version()
  await runtime.store.remove(runtime.id)
}

export function disableRecovery(runtime: RecoveryRuntime): void {
  runtime.lifecycleGeneration++
  const cleanupGeneration = runtime.lifecycleGeneration
  const snapshotId = runtime.id
  runtime.requestedVersion = runtime.version()
  runtime.protectedVersion = runtime.version()
  const activeWrite = runtime.writing
  runtime.cleanup = runtime.cleanup
    .then(async () => {
      await activeWrite
      await runtime.store.remove(snapshotId)
      if (cleanupGeneration === runtime.lifecycleGeneration) runtime.persistedVersion = null
      return undefined
    })
    .catch((error) => console.warn('[Recovery] Failed to disable recovery:', error))
}
