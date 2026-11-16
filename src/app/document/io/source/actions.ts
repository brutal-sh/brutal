import {
  createSourceIdentityActions,
  restoreRecoverySource
} from '@/app/document/io/source/identity'
import { createSourceContext, disposeSource } from '@/app/document/io/source/runtime'
import { createSourceExternalSaves } from '@/app/document/io/source/save/external'
import { createSourceAutosave, createSourceFileSaves } from '@/app/document/io/source/save/local'
import type { DocumentSourceOptions } from '@/app/document/io/source/types'

export { createDocumentSourceState } from '@/app/document/io/source/state'

export function createDocumentSourceActions(options: DocumentSourceOptions) {
  const context = createSourceContext(options)
  const fileSaves = createSourceFileSaves(context)
  const saving = { ...context, fileSaves }
  const autosave = createSourceAutosave(saving)
  return {
    ...createSourceIdentityActions(context),
    ...createSourceExternalSaves(saving),
    disposeDocumentIO: () => disposeSource(context, autosave),
    saveFigFile: (beforeWrite?: () => void) =>
      context.queue.serialize(() =>
        beforeWrite
          ? context.queue.track(() => fileSaves.saveFigFile(beforeWrite))
          : context.queue.userSave(fileSaves.saveFigFile)
      ),
    saveFigFileAs: () =>
      context.queue.serialize(() => context.queue.userSave(fileSaves.saveFigFileAs)),
    lastSaveFailed: context.queue.lastFailure,
    savePermissionFailure: context.queue.permissionFailure,
    dismissSavePermissionFailure: context.queue.dismissPermissionFailure,
    hasUnsavedChanges: context.changes.hasUnsavedChanges,
    captureVersion: context.changes.capture,
    markDocumentChanged: context.changes.markChanged,
    adoptChanges: context.changes.adopt,
    getStorageBinding: context.options.getStorageBinding,
    getRecoveryId: () => context.recovery.getRecoveryId(),
    adoptRecoverySnapshot: (id: string, source?: unknown) => {
      if (source !== undefined) restoreRecoverySource(context, source)
      context.changes.markChanged()
      return context.recovery.adoptRecoverySnapshot(id)
    },
    persistRecoveryNow: () => context.recovery.persistNow(),
    discardRecovery: () => context.recovery.discardRecovery()
  }
}
