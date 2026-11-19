import { watchDebounced } from '@vueuse/core'
import { watch } from 'vue'

import {
  adoptRecovery,
  disableRecovery,
  discardRecovery,
  markRecoveryProtected
} from '@/app/document/recovery/lifecycle'
import { getRecoveryCloseVersion, retainRecoveryOnClose } from '@/app/document/recovery/retain'
import { createRecoveryRuntime, hasManagedRecoverySource } from '@/app/document/recovery/runtime'
import { persistRecovery } from '@/app/document/recovery/snapshot'
import type {
  DocumentRecoveryController,
  DocumentRecoveryOptions
} from '@/app/document/recovery/types'

export type { DocumentRecoveryController } from '@/app/document/recovery/types'

export function createDocumentRecovery(
  options: DocumentRecoveryOptions
): DocumentRecoveryController {
  const runtime = createRecoveryRuntime(options)
  const stopVersionWatch = watchDebounced(
    [runtime.version, () => hasManagedRecoverySource(runtime)],
    () => {
      void persistRecovery(runtime).catch((error) =>
        console.warn('[Recovery] Snapshot failed:', error)
      )
    },
    { debounce: 3000, maxWait: 10000 }
  )
  const stopEnabledWatch = watch(
    runtime.isEnabled,
    (enabled) => {
      if (enabled) {
        runtime.protectedVersion = runtime.version()
        runtime.requestedVersion = runtime.version()
        return
      }
      disableRecovery(runtime)
    },
    { flush: 'sync' }
  )
  return {
    getRecoveryId: () => runtime.id,
    adoptRecoverySnapshot: (id) => adoptRecovery(runtime, id),
    getRecoveryCloseVersion: () => getRecoveryCloseVersion(runtime),
    retainOnClose: (version) => retainRecoveryOnClose(runtime, version),
    persistNow: () => persistRecovery(runtime),
    markProtectedVersion: (version) => markRecoveryProtected(runtime, version),
    discardRecovery: () => discardRecovery(runtime),
    disposeRecovery() {
      runtime.disposed = true
      runtime.lifecycleGeneration++
      stopVersionWatch()
      stopEnabledWatch()
    }
  }
}
