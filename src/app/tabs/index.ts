import { filename } from 'pathe/utils'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { figThumbnailPageId, populateFigPage } from '@open-pencil/core/io/formats/fig'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { describeDiagnosticError, recordStorageFailure } from '@/app/diagnostics'
import { viewDiagnosticsAction } from '@/app/diagnostics/view'
import { confirmAllDocuments } from '@/app/document/close/all'
import { documentAssetReader } from '@/app/document/io/assets'
import { yieldToUI } from '@/app/document/io/browser'
import { readFigDocument } from '@/app/document/io/fig'
import { applyImportedDocument } from '@/app/document/io/imported-document'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { getRecoveryStore, type RecoverySnapshotMeta } from '@/app/document/recovery'
import { appIcons } from '@/app/editor/icons/provider'
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
import { createDeferred } from '@/app/runtime/deferred'
import { toast } from '@/app/shell/ui'
import { createFileOpenCoordinator } from '@/app/tabs/open/coordinator'
import { findTabByFileIdentity } from '@/app/tabs/open/identity'
import { readStorageDocument } from '@/app/tabs/open/storage'

import {
  activeTab,
  allTabs,
  getActiveStore,
  getActiveTabId,
  getTabById,
  getTabForStore,
  getTabsSnapshot,
  createTab,
  createHomeTab,
  switchTab,
  closeTab,
  tabCount,
  tabsRef,
  activeTabId,
  activateTab,
  removeTab
} from './lifecycle'
import type { Tab } from './lifecycle'
import { cacheOpenedFigCover, watchOpenedFigCover } from './open/cover'

export {
  activeTab,
  allTabs,
  getActiveStore,
  getActiveTabId,
  getTabById,
  getTabForStore,
  getTabsSnapshot,
  createTab,
  createHomeTab,
  showNewTab,
  withHomePinned,
  ensureHomeTab,
  switchTab,
  switchAdjacentTab,
  switchAdjacentDocumentTab,
  selectDocumentTab,
  moveActiveTab,
  closeTab,
  tabCount
} from './lifecycle'
export type { Tab, TabKind } from './lifecycle'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const fileOpenCoordinator = createFileOpenCoordinator()

function isDOMImportFile(file: File): boolean {
  return /\.(html?|xhtml)$/i.test(file.name)
}

/**
 * A tab a document opens in: a new one, or an untouched empty design in front; never Home. `from`
 * is the tab in front when the open began, which comes back to the front if the open fails.
 */
type OpeningTab = { store: EditorStore; created: boolean; from: Tab | undefined }

function reusableTabStore(): OpeningTab {
  const current = activeTab.value
  const source = current?.store.getSourceIdentity()
  const isUntouched =
    current?.kind === 'document' &&
    current.store.state.documentName === 'Untitled' &&
    !current.store.undo.canUndo &&
    current.store.getStorageBinding() === null &&
    source?.path === null &&
    source.handle === null
  if (current && isUntouched) return { store: current.store, created: false, from: current }
  return { store: createTab().store, created: true, from: current }
}

/**
 * After a document failed to open, a tab opened for it closes and the tab in front before it, such
 * as Home, comes back; an empty design it reused stays. `keepRecovery` leaves the recovery copy,
 * as a failed restore must: that copy is the work being restored.
 */
async function releaseOpeningTab(
  opening: OpeningTab,
  { keepRecovery = false }: { keepRecovery?: boolean } = {}
): Promise<void> {
  if (!opening.created) return
  const tab = getTabForStore(opening.store)
  if (!tab) return
  // The tab goes even when the recovery copy stays behind, which the next start offers again;
  // the open's own error is the one to report.
  if (!keepRecovery) await discardFailedRecovery(tab.store)
  const wasActive = activeTabId.value === tab.id
  removeTab(tab)
  if (wasActive && opening.from && tabsRef.value.includes(opening.from)) activateTab(opening.from)
}

async function discardFailedRecovery(store: EditorStore): Promise<void> {
  await store.discardRecovery().catch((error: unknown) => {
    console.warn(
      '[Tabs] Failed to discard the recovery copy of a document that failed to open',
      error
    )
  })
}

async function readFigForTab(file: File, signal?: AbortSignal): Promise<SceneGraph> {
  const imported = await readFigDocument(file, signal)
  const firstPageId = imported.getPages()[0]?.id
  const layOut = (pageId: string) =>
    imported.applyDerivedLayoutDuring(() => computeAllLayouts(imported, pageId))
  if (firstPageId) layOut(firstPageId)
  const thumbnailPageId = figThumbnailPageId(imported.getPages())
  if (thumbnailPageId && thumbnailPageId !== firstPageId) {
    populateFigPage(imported, thumbnailPageId)
    layOut(thumbnailPageId)
  }
  return imported
}

async function showImportedGraph(
  store: EditorStore,
  graph: SceneGraph,
  prepare?: () => void | Promise<void>,
  load?: DocumentLoadSession
): Promise<void> {
  load?.update({ phase: 'materializing', detail: store.state.documentName })
  await applyImportedDocument(store, graph, load)
  load?.signal.throwIfAborted()
  await prepare?.()
  load?.signal.throwIfAborted()
  const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
  load?.update({ phase: 'populating-page', detail: store.graph.getNode(pageId)?.name ?? null })
  await store.switchPage(pageId, { preparation: load })
  load?.signal.throwIfAborted()
  load?.update({ phase: 'preparing-render', detail: store.state.documentName })
  await store.fitCurrentPageToViewport()
}

function findStorageTab(target: StorageDocumentBinding): Tab | undefined {
  return tabsRef.value.find((tab) => {
    const binding = tab.store.getStorageBinding()
    return binding !== null && sameStorageDocument(binding, target)
  })
}

function failPreparation(
  load: DocumentLoadSession,
  code: 'read-failed' | 'decode-failed',
  error: unknown
): void {
  if (load.signal.aborted) return
  load.fail({
    code,
    message: error instanceof Error ? error.message : String(error),
    retryable: true
  })
}

/** A `.fig` file named after its document, holding a copy of the bytes. */
function figFile(bytes: Uint8Array, name: string): File {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new File([copy.buffer], `${name}.fig`, { type: 'application/octet-stream' })
}

async function showStorageDocument(
  store: EditorStore,
  binding: StorageDocumentBinding,
  document: StorageDocument,
  load: DocumentLoadSession,
  given?: Uint8Array
): Promise<void> {
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
 * Reads a `.fig` file's bytes as a tab opens them, laid out and ready to show, for an editor of
 * its own such as an earlier version's preview.
 */
export function readFigBytes(
  bytes: Uint8Array,
  name: string,
  signal?: AbortSignal
): Promise<SceneGraph> {
  return readFigForTab(figFile(bytes, name), signal)
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
    await showStorageDocument(
      store,
      binding,
      { id: binding.documentId, name, updatedAt: new Date().toISOString() },
      load,
      bytes
    )
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
    await showStorageDocument(store, binding, document, load)
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

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<EditorStore> {
  const identity: DocumentSourceIdentity = {
    handle: handle ?? null,
    path: path ?? null
  }
  const decision = await fileOpenCoordinator.decide(async () => {
    const pending = await fileOpenCoordinator.findPending(identity)
    if (pending) {
      const tab = getTabForStore(pending.store)
      if (tab) switchTab(tab.id)
      return { kind: 'pending' as const, completion: pending.completion, store: pending.store }
    }

    const existing = await findTabByFileIdentity(tabsRef.value, identity)
    if (existing) {
      switchTab(existing.id)
      if (path?.toLowerCase().endsWith('.fig')) {
        watchOpenedFigCover(path, existing.store)
        void cacheOpenedFigCover(path, existing.store).catch((error) => {
          console.warn('[Recent files] Failed to cache the thumbnail', error)
        })
      }
      return { kind: 'existing' as const, store: existing.store }
    }

    const opening = reusableTabStore()
    const { store } = opening
    store.state.documentName = filename(file.name) ?? file.name
    const load = store.preparationController.begin({
      kind: isDOMImportFile(file) ? 'dom-import' : 'document-open',
      subject: file.name
    })

    const completion = createDeferred<undefined>()
    void completion.promise.catch(() => undefined)
    const pendingOpen = { completion: completion.promise, identity, store }
    fileOpenCoordinator.add(pendingOpen)
    return { kind: 'owner' as const, completion, pendingOpen, store, opening, load }
  })

  if (decision.kind === 'existing') return decision.store
  if (decision.kind === 'pending') {
    await decision.completion
    return decision.store
  }

  const { completion, pendingOpen, store, opening, load } = decision
  let succeeded = false
  try {
    if (isDOMImportFile(file)) {
      await store.openDOMFile(file, { handle, path, preparation: load })
      completion.resolve(undefined)
      succeeded = true
      return store
    }

    await yieldToUI()
    load.update({ phase: 'reading', detail: file.name })
    const isFig = file.name.toLowerCase().endsWith('.fig')
    let imported: SceneGraph
    let sourceFormat: string
    if (isFig) {
      load.update({ phase: 'decoding', detail: file.name })
      imported = await readFigForTab(file, load.signal)
      sourceFormat = 'fig'
    } else {
      const result = await io.readDocument(
        {
          name: file.name,
          mimeType: file.type || undefined,
          data: new Uint8Array(await file.arrayBuffer()),
          readAsset: documentAssetReader(path)
        },
        { icons: appIcons }
      )
      imported = result.graph
      sourceFormat = result.sourceFormat
    }

    await showImportedGraph(
      store,
      imported,
      () => {
        store.setDocumentSource(file.name, sourceFormat, handle, path)
        if (isFig && path) watchOpenedFigCover(path, store)
      },
      load
    )
    if (isFig && path) {
      void cacheOpenedFigCover(path, store).catch((error) => {
        console.warn('[Recent files] Failed to cache the thumbnail', error)
      })
    }
    completion.resolve(undefined)
    succeeded = true
    return store
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    completion.reject(error)
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
    fileOpenCoordinator.remove(pendingOpen)
  }
}

export async function listRecoverySnapshots(): Promise<RecoverySnapshotMeta[]> {
  return getRecoveryStore().list()
}

export async function discardRecoverySnapshot(id: string): Promise<void> {
  await getRecoveryStore().remove(id)
}

export async function restoreRecoverySnapshot(id: string): Promise<void> {
  const snapshot = await getRecoveryStore().read(id)
  if (!snapshot) throw new Error('Recovery snapshot is no longer available')

  const opening = reusableTabStore()
  const { store } = opening
  const load = store.preparationController.begin({
    kind: 'recovery-restore',
    subject: snapshot.documentName
  })
  let succeeded = false
  try {
    load.update({ phase: 'reading', detail: snapshot.documentName })
    const fileBytes = new Uint8Array(snapshot.figBytes)
    const file = new File([fileBytes.buffer], `${snapshot.documentName}.fig`, {
      type: 'application/octet-stream'
    })
    load.update({ phase: 'decoding', detail: snapshot.documentName })
    const imported = await readFigForTab(file, load.signal)

    await showImportedGraph(
      store,
      imported,
      async () => {
        store.state.documentName = snapshot.documentName
        await store.adoptRecoverySnapshot(id)
      },
      load
    )
    succeeded = true
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    await releaseOpeningTab(opening, { keepRecovery: true })
    throw error
  } finally {
    if (succeeded) load.complete()
  }
}

export function prepareForClose(): Promise<boolean> {
  return confirmAllDocuments(() =>
    tabsRef.value.filter((tab) => tab.kind === 'document').map((tab) => tab.store)
  )
}

export async function prepareForReload(): Promise<void> {
  await Promise.all(tabsRef.value.map((tab) => tab.store.persistRecoveryNow()))
}

export function useTabsStore() {
  return {
    tabs: allTabs,
    activeTabId,
    createHomeTab,
    createTab,
    switchTab,
    closeTab,
    getActiveTabId,
    getTabById,
    getTabForStore,
    getTabsSnapshot,
    openFileInNewTab,
    openStorageDocumentInNewTab,
    listRecoverySnapshots,
    restoreRecoverySnapshot,
    discardRecoverySnapshot,
    prepareForReload,
    getActiveStore,
    tabCount
  }
}
