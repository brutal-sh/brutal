import { validateRecoveryFileSource } from '@/app/document/io/source/recovery'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { getRecoveryStore } from '@/app/document/recovery'
import type { RecoverySnapshot, RecoverySnapshotMeta } from '@/app/document/recovery/types'
import type { EditorPreparationHandle } from '@/app/editor/preparation/types'
import type { EditorStore } from '@/app/editor/session'
import { getTabForStore, switchTab, tabsRef } from '@/app/tabs/lifecycle'
import { fileOpenCoordinator } from '@/app/tabs/open/coordinator'
import { fileIdentitiesMatch, hasFileIdentity } from '@/app/tabs/open/identity'
import { readFigBytes, showImportedGraph } from '@/app/tabs/open/imported'
import {
  failPreparation,
  reusableTabStore,
  releaseOpeningTab,
  type OpeningTab
} from '@/app/tabs/open/session'

export async function listRecoverySnapshots(): Promise<RecoverySnapshotMeta[]> {
  return getRecoveryStore().list()
}

export async function discardRecoverySnapshot(id: string): Promise<void> {
  await getRecoveryStore().remove(id)
}

export async function findRetainedRecovery(
  identity: DocumentSourceIdentity
): Promise<RecoverySnapshot | null> {
  if (!hasFileIdentity(identity)) return null
  const store = getRecoveryStore()
  for (const metadata of await store.list()) {
    if (metadata.retainedOnClose !== true || !metadata.source) continue
    if (!(await fileIdentitiesMatch(metadata.source.identity, identity))) continue
    const backup = await store.read(metadata.id)
    if (!backup) throw new Error('The retained backup could not be read.')
    if (
      backup.retainedOnClose === true &&
      backup.source &&
      (await fileIdentitiesMatch(backup.source.identity, identity))
    )
      return backup
  }
  return null
}

export async function showRecoverySnapshot(
  store: EditorStore,
  load: EditorPreparationHandle,
  snapshot: RecoverySnapshot
): Promise<void> {
  const source = snapshot.source === undefined ? null : validateRecoveryFileSource(snapshot.source)
  load.update({ phase: 'reading', detail: snapshot.documentName })
  load.update({ phase: 'decoding', detail: snapshot.documentName })
  const imported = await readFigBytes(snapshot.figBytes, snapshot.documentName, load.signal)
  await showImportedGraph(
    store,
    imported,
    async () => {
      store.state.documentName = snapshot.documentName
      await store.adoptRecoverySnapshot(snapshot.id, source ?? undefined)
    },
    load
  )
}

async function restoreInTab(opening: OpeningTab, snapshot: RecoverySnapshot) {
  const { store } = opening
  const load = store.preparationController.begin({
    kind: 'recovery-restore',
    subject: snapshot.documentName
  })
  let succeeded = false
  try {
    await showRecoverySnapshot(store, load, snapshot)
    succeeded = true
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    await releaseOpeningTab(opening, { keepRecovery: true })
    throw error
  } finally {
    if (succeeded) load.complete()
  }
}

async function restoreRetainedSnapshot(
  snapshot: RecoverySnapshot,
  identity: DocumentSourceIdentity
): Promise<void> {
  const decision = await fileOpenCoordinator.decide(async () => {
    const pending = await fileOpenCoordinator.findPending(identity)
    if (pending) return { kind: 'pending' as const, pending }
    const existing = tabsRef.value.find((tab) => tab.store.getRecoveryId() === snapshot.id)
    if (existing) {
      switchTab(existing.id)
      return { kind: 'existing' as const }
    }
    const opening = reusableTabStore()
    return {
      kind: 'owner' as const,
      opening,
      ...fileOpenCoordinator.reserve(opening.store, identity)
    }
  })
  if (decision.kind === 'existing') return
  if (decision.kind === 'pending') {
    await decision.pending.completion
    const tab = getTabForStore(decision.pending.store)
    if (tab && tab.store.getRecoveryId() === snapshot.id) {
      switchTab(tab.id)
      return
    }
    return restoreRetainedSnapshot(snapshot, identity)
  }
  try {
    await restoreInTab(decision.opening, snapshot)
    decision.completion.resolve(undefined)
  } catch (error) {
    decision.completion.reject(error)
    throw error
  } finally {
    fileOpenCoordinator.remove(decision.pendingOpen)
  }
}

export async function restoreRecoverySnapshot(id: string): Promise<void> {
  const snapshot = await getRecoveryStore().read(id)
  if (!snapshot) throw new Error('Recovery snapshot is no longer available')
  if (snapshot.retainedOnClose === true && snapshot.source) {
    const source = validateRecoveryFileSource(snapshot.source)
    return restoreRetainedSnapshot(snapshot, source.identity)
  }
  return restoreInTab(reusableTabStore(), snapshot)
}
