import { confirmAllDocuments } from '@/app/document/close/all'
import { openFileInNewTab } from '@/app/tabs/open/file'
import {
  listRecoverySnapshots,
  discardRecoverySnapshot,
  restoreRecoverySnapshot
} from '@/app/tabs/open/recovery'
import { openStorageDocumentInNewTab } from '@/app/tabs/open/stored'

import {
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
  activeTabId
} from './lifecycle'

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

export { openFileInNewTab } from '@/app/tabs/open/file'
export { readFigBytes } from '@/app/tabs/open/imported'
export {
  listRecoverySnapshots,
  discardRecoverySnapshot,
  restoreRecoverySnapshot
} from '@/app/tabs/open/recovery'
export { openStorageDocumentInNewTab, reloadStorageDocumentInTab } from '@/app/tabs/open/stored'

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
