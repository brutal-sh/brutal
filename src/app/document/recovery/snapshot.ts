import { markRecoveryProtected } from '@/app/document/recovery/lifecycle'
import type { RecoveryRuntime } from '@/app/document/recovery/runtime'

function isActiveGeneration(runtime: RecoveryRuntime, generation: number): boolean {
  return !runtime.disposed && generation === runtime.lifecycleGeneration
}

async function runWrites(runtime: RecoveryRuntime, generation: number): Promise<void> {
  if (!isActiveGeneration(runtime, generation) || !runtime.isEnabled()) return
  if (runtime.hasWritableSource() || runtime.requestedVersion === runtime.protectedVersion) return
  const version = runtime.requestedVersion
  const bytes = await runtime.buildFigFile()
  if (
    generation !== runtime.lifecycleGeneration ||
    runtime.hasWritableSource() ||
    !runtime.isEnabled()
  )
    return
  await runtime.store.write({
    id: runtime.id,
    documentName: runtime.state.documentName,
    figBytes: bytes
  })
  runtime.persistedVersion = version
  if (generation !== runtime.lifecycleGeneration) return
  runtime.protectedVersion = version
  if (runtime.requestedVersion !== version) await runWrites(runtime, generation)
}

export async function persistRecovery(runtime: RecoveryRuntime): Promise<void> {
  await runtime.cleanup
  if (runtime.disposed || runtime.hasWritableSource() || !runtime.isEnabled()) return
  runtime.requestedVersion = runtime.version()
  if (!runtime.hasUnsavedChanges()) {
    await markRecoveryProtected(runtime, runtime.requestedVersion)
    // A new edit may arrive while the old snapshot is being removed.
    if (runtime.hasUnsavedChanges()) await persistRecovery(runtime)
    return
  }
  if (runtime.requestedVersion === runtime.protectedVersion) return
  if (!runtime.writing) {
    const generation = runtime.lifecycleGeneration
    runtime.writing = runWrites(runtime, generation).finally(() => {
      runtime.writing = null
    })
  }
  await runtime.writing
}
