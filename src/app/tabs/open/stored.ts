import { describeDiagnosticError, recordStorageFailure } from '@/app/diagnostics'
import { viewDiagnosticsAction } from '@/app/diagnostics/view'
import type { EditorPreparationHandle as DocumentLoadSession } from '@/app/editor/preparation/types'
import type { EditorStore } from '@/app/editor/session'
import { notificationMessages } from '@/app/i18n/notifications'
import {
  activeStorageProviderID,
  sameStorageDocument,
  storageLocationOf,
  type StorageDocument,
  type StorageDocumentBinding,
  type StorageLocation
} from '@/app/integrations/storage'
import { rememberRecentStorageDocument } from '@/app/recent-files'
import { toast } from '@/app/shell/ui'
import { switchTab, tabsRef, type Tab } from '@/app/tabs/lifecycle'
import { figFile, readFigForTab, showImportedGraph } from '@/app/tabs/open/imported'
import { failPreparation, reusableTabStore, releaseOpeningTab } from '@/app/tabs/open/session'
import { readStorageDocument } from '@/app/tabs/open/storage'

function findStorageTab(target: StorageDocumentBinding): Tab | undefined {
  return tabsRef.value.find((tab) => {
    const binding = tab.store.getStorageBinding()
    return binding !== null && sameStorageDocument(binding, target)
  })
}

interface StorageOpening {
  store: EditorStore
  binding: StorageDocumentBinding
  document: StorageDocument
  load: DocumentLoadSession
  given?: Uint8Array
}

async function showStorageDocument({
  store,
  binding,
  document,
  load,
  given
}: StorageOpening): Promise<void> {
  const bytes = given ?? (await readStorageDocument(binding, document, load))
  const file = figFile(bytes, document.name)
  load.update({ phase: 'decoding', detail: document.name })
  const imported = await readFigForTab(file, load.signal)
  await showImportedGraph(
    store,
    imported,
    () => store.setStorageDocumentSource(binding, document.name),
    load
  )
}

/**
 * Shows what this device now holds for a tab's stored document, as after a conflict, or `bytes`
 * just taken from its storage.
 */
export async function reloadStorageDocumentInTab(
  store: EditorStore,
  bytes?: Uint8Array
): Promise<void> {
  const binding = store.getStorageBinding()
  if (!binding) return
  const name = store.state.documentName
  const load = store.preparationController.begin({ kind: 'storage-open', subject: name })
  try {
    await showStorageDocument({
      store,
      binding,
      document: { id: binding.documentId, name, updatedAt: new Date().toISOString() },
      load,
      given: bytes
    })
    load.complete()
  } catch (error) {
    failPreparation(load, 'read-failed', error)
    throw error
  }
}

export async function openStorageDocumentInNewTab(
  document: StorageDocument,
  location: StorageLocation = { providerId: activeStorageProviderID.value }
): Promise<EditorStore> {
  const binding: StorageDocumentBinding = {
    ...storageLocationOf(location),
    documentId: document.id
  }
  const existing = findStorageTab(binding)
  if (existing) {
    switchTab(existing.id)
    rememberRecentStorageDocument(binding, document.name)
    return existing.store
  }

  const opening = reusableTabStore()
  const { store } = opening
  store.state.documentName = document.name
  const load = store.preparationController.begin({
    kind: 'storage-open',
    subject: document.name
  })
  let succeeded = false
  try {
    await showStorageDocument({ store, binding, document, load })
    rememberRecentStorageDocument(binding, document.name)
    succeeded = true
  } catch (error) {
    if (!load.signal.aborted) {
      const diagnostic = describeDiagnosticError(error)
      load.fail({
        code: 'read-failed',
        message: error instanceof Error ? error.message : String(error),
        retryable: diagnostic.retryable ?? true
      })
      recordStorageFailure({ operation: 'download', ...diagnostic })
      toast.error(
        notificationMessages.get().openFileFailed({
          name: document.name,
          error: error instanceof Error ? error.message : String(error)
        }),
        viewDiagnosticsAction()
      )
    }
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
  }
  return store
}
