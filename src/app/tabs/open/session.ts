import type { DocumentSourceIdentity } from '@/app/document/io/types'
import type { EditorPreparationHandle as DocumentLoadSession } from '@/app/editor/preparation/types'
import type { EditorStore } from '@/app/editor/session'
import {
  activeTab,
  activeTabId,
  activateTab,
  createTab,
  getTabForStore,
  removeTab,
  tabsRef,
  type Tab
} from '@/app/tabs/lifecycle'

/**
 * A tab a document opens in: a new one, or an untouched empty design in front; never Home. `from`
 * is the tab in front when the open began, which comes back to the front if the open fails.
 */
export type OpeningTab = { store: EditorStore; created: boolean; from: Tab | undefined }

export function reusableTabStore(): OpeningTab {
  const current = activeTab.value
  const source = current?.store.getSourceIdentity()
  const isUntouched = current?.kind === 'document' && isUntouchedDocument(current, source)
  if (current && isUntouched) return { store: current.store, created: false, from: current }
  return { store: createTab().store, created: true, from: current }
}

/**
 * After a document failed to open, a tab opened for it closes and the tab in front before it, such
 * as Home, comes back; an empty design it reused stays. `keepRecovery` leaves the recovery copy,
 * as a failed restore must: that copy is the work being restored.
 */
export async function releaseOpeningTab(
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

function isUntouchedDocument(current: Tab, source: DocumentSourceIdentity | undefined) {
  return (
    current.store.state.documentName === 'Untitled' &&
    !current.store.undo.canUndo &&
    current.store.getStorageBinding() === null &&
    source?.path === null &&
    source.handle === null
  )
}

export function failPreparation(
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
