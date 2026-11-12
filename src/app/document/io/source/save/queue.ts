import { shallowRef } from 'vue'

import type { createDocumentChanges } from '@/app/document/io/changes'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

export function createSourceSaveQueue(
  changes: ReturnType<typeof createDocumentChanges>,
  afterSave: () => Promise<void>
) {
  const lastFailure = shallowRef(false)
  let pendingSave: Promise<boolean> | null = null
  let disposed = false

  function serialize(operation: () => Promise<boolean>): Promise<boolean> {
    const run = () => (disposed ? Promise.resolve(false) : operation())
    // Start an idle save immediately, preserving the file picker's user activation.
    const result = pendingSave ? pendingSave.then(run, run) : run()
    pendingSave = result
    const settled = () => {
      if (pendingSave === result) pendingSave = null
    }
    void result.then(settled, settled)
    return result
  }

  async function track(save: () => Promise<boolean>) {
    const revision = changes.capture()
    const saved = await save()
    if (saved) {
      changes.markSaved(revision)
      await afterSave()
    }
    return saved
  }

  async function userSave(save: () => Promise<boolean>) {
    lastFailure.value = false
    try {
      return await track(save)
    } catch (error) {
      lastFailure.value = true
      toast.error(
        notificationMessages.get().operationFailed({
          error: error instanceof Error ? error.message : String(error)
        })
      )
      return false
    }
  }

  return {
    serialize,
    track,
    userSave,
    lastFailure,
    dispose: () => {
      disposed = true
    }
  }
}
