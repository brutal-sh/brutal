import type { RecoveryRuntime } from '@/app/document/recovery/runtime'
import { persistRecovery } from '@/app/document/recovery/snapshot'

export function getRecoveryCloseVersion(runtime: RecoveryRuntime): number | null {
  return runtime.adopted &&
    !runtime.disposed &&
    runtime.isEnabled() &&
    runtime.hasUnsavedChanges() &&
    runtime.getSource() !== null
    ? runtime.version()
    : null
}

export async function retainRecoveryOnClose(
  runtime: RecoveryRuntime,
  version: number
): Promise<boolean> {
  if (getRecoveryCloseVersion(runtime) !== version) return false
  const { id, lifecycleGeneration } = runtime
  const identity = runtime.getSource()?.identity
  const isCurrent = () =>
    runtime.id === id &&
    runtime.lifecycleGeneration === lifecycleGeneration &&
    runtime.getSource()?.identity === identity &&
    getRecoveryCloseVersion(runtime) === version &&
    runtime.persistedVersion === version

  await persistRecovery(runtime)
  if (!isCurrent()) return false
  const retained = await runtime.store.retain(id)
  return retained && isCurrent()
}
