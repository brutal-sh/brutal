import { shallowRef, computed, triggerRef } from 'vue'

import type { SceneGraph } from '@open-pencil/scene-graph'
import { randomHex } from '@open-pencil/scene-graph/random'

import { setOpenPencilStore } from '@/app/browser-bridge'
import { confirmDocumentClose } from '@/app/document/close/controller'
import { requestDocumentClose } from '@/app/document/close/prompt'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore, type EditorStore } from '@/app/editor/session'

import { stopWatchingOpenedFigCover } from './open/cover'

export type TabKind = 'home' | 'document'

export interface Tab {
  id: string
  store: EditorStore
  kind: TabKind
}

function generateTabId(): string {
  return `tab-${randomHex(16)}`
}

export const tabsRef = shallowRef<Tab[]>([])
export const activeTabId = shallowRef('')

export const activeTab = computed(() => tabsRef.value.find((t) => t.id === activeTabId.value))

export const allTabs = computed(() =>
  tabsRef.value.map((t) => ({
    id: t.id,
    name: t.store.state.documentName,
    isHome: t.kind === 'home',
    isDirty: t.kind === 'document' && t.store.hasUnsavedChanges(),
    isPreparing: t.store.state.preparation !== null,
    preparationProgress: t.store.state.preparation?.progress ?? null,
    isActive: t.id === activeTabId.value
  }))
)

export function getActiveStore(): EditorStore {
  const tab = tabsRef.value.find((t) => t.id === activeTabId.value)
  if (!tab) throw new Error('No active tab')
  return tab.store
}

export function getActiveTabId(): string {
  return activeTabId.value
}

export function getTabById(tabId: string): Tab | undefined {
  return tabsRef.value.find((tab) => tab.id === tabId)
}

export function getTabForStore(store: EditorStore): Tab | undefined {
  return tabsRef.value.find((tab) => tab.store === store)
}

export function getTabsSnapshot(): Tab[] {
  return [...tabsRef.value]
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const s = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: s, kind: 'document' }
  tabsRef.value = [...tabsRef.value, tab]
  activateTab(tab)
  return tab
}

/**
 * Shows Home, the one tab pinned first that never closes and never turns into a design, as in
 * Figma's desktop app; it is made the first time it is asked for.
 */
export function createHomeTab(): Tab {
  const existing = tabsRef.value.find((tab) => tab.kind === 'home')
  if (existing) {
    activateTab(existing)
    return existing
  }
  const tab: Tab = { id: generateTabId(), store: createEditorStore(), kind: 'home' }
  tabsRef.value = [tab, ...tabsRef.value]
  activateTab(tab)
  return tab
}

export function showNewTab(): void {
  createHomeTab()
}

/** `tabs` with Home first: as they are when it is, with their Home moved there, or `home()` added. */
export function withHomePinned(tabs: readonly Tab[], home: () => Tab): readonly Tab[] {
  if (tabs[0]?.kind === 'home') return tabs
  const existing = tabs.find((tab) => tab.kind === 'home')
  return existing ? [existing, ...tabs.filter((tab) => tab !== existing)] : [home(), ...tabs]
}

/** Pins Home first when it is missing, leaving the tab in front where it is. */
export function ensureHomeTab(): void {
  const pinned = withHomePinned(tabsRef.value, () => ({
    id: generateTabId(),
    store: createEditorStore(),
    kind: 'home'
  }))
  if (pinned !== tabsRef.value) tabsRef.value = [...pinned]
}

export function activateTab(tab: Tab) {
  const previous = tabsRef.value.find((candidate) => candidate.id === activeTabId.value)
  previous?.store.setSnapGuides([])
  previous?.store.setLayoutInsertIndicator(null)
  previous?.store.setDropTarget(null)
  activeTabId.value = tab.id
  setActiveEditorStore(tab.store)
  triggerRef(tabsRef)
  setOpenPencilStore(tab.store)
}

/** Activates the tab. False when no tab carries that id, so callers can tell a no-op apart. */
export function switchTab(tabId: string): boolean {
  const tab = tabsRef.value.find((t) => t.id === tabId)
  if (!tab) return false
  activateTab(tab)
  return true
}

/**
 * Activates the tab `step` places from the one in front, wrapping around the ends, as Figma's
 * ⌃Tab and ⌃⇧Tab do; Home counts, so the tab after the last is Home.
 */
export function switchAdjacentTab(step: 1 | -1): void {
  const tabs = tabsRef.value
  if (tabs.length < 2) return
  const index = tabs.findIndex((tab) => tab.id === activeTabId.value)
  activateTab(tabs[(index + step + tabs.length) % tabs.length])
}

/** Window menu navigation wraps between documents; Home is outside that sequence. */
export function switchAdjacentDocumentTab(step: 1 | -1): void {
  const documents = tabsRef.value.filter((tab) => tab.kind === 'document')
  if (!documents.length) return
  const index = documents.findIndex((tab) => tab.id === activeTabId.value)
  let next = (index + step + documents.length) % documents.length
  if (index === -1) next = step === 1 ? 0 : documents.length - 1
  activateTab(documents[next])
}

export function selectDocumentTab(index: number | 'last'): void {
  const documents = tabsRef.value.filter((tab) => tab.kind === 'document')
  const tab = index === 'last' ? documents.at(-1) : documents[index]
  if (tab) activateTab(tab)
}

export function moveActiveTab(step: 1 | -1): void {
  const tabs = [...tabsRef.value]
  const index = tabs.findIndex((tab) => tab.id === activeTabId.value)
  const neighborIndex = index + step
  if (index === -1 || neighborIndex < 0 || neighborIndex >= tabs.length) return
  const tab = tabs[index]
  const neighbor = tabs[neighborIndex]
  if (tab.kind !== 'document' || neighbor.kind !== 'document') return
  tabs[index] = neighbor
  tabs[neighborIndex] = tab
  tabsRef.value = tabs
}

function disposeTabStore(store: EditorStore): void {
  stopWatchingOpenedFigCover(store)
  store.preparationController.dispose()
  store.dispose()
}

/**
 * Close a tab, asking whether to save unsaved changes. Pass `unsaved` to decide without
 * asking, as automation must: nobody may be there to answer.
 */
export async function closeTab(tabId: string, unsaved?: 'save' | 'discard'): Promise<void> {
  const idx = tabsRef.value.findIndex((t) => t.id === tabId)
  if (idx === -1) return

  const closingTab = tabsRef.value[idx]
  if (closingTab.kind === 'home') return
  const choice = unsaved
    ? await confirmDocumentClose(closingTab.store, async () => unsaved)
    : await requestDocumentClose(closingTab.store, closingTab.store.state.documentName)
  if (choice === 'cancel') return
  if (choice === 'discard') await closingTab.store.discardRecovery()
  else await closingTab.store.persistRecoveryNow()
  if (!tabsRef.value.includes(closingTab)) return
  if (choice !== 'discard' && closingTab.store.hasUnsavedChanges()) return
  removeTab(closingTab)
}

/** Takes a tab out of the window and disposes its store, showing a neighbour or a new Home. */
export function removeTab(closingTab: Tab): void {
  const idx = tabsRef.value.indexOf(closingTab)
  if (idx === -1) return
  const wasActive = activeTabId.value === closingTab.id
  disposeTabStore(closingTab.store)
  tabsRef.value = tabsRef.value.filter((t) => t !== closingTab)

  if (tabsRef.value.length === 0) {
    createHomeTab()
    return
  }

  if (wasActive) {
    const newIdx = Math.min(idx, tabsRef.value.length - 1)
    activateTab(tabsRef.value[newIdx])
  }
}

export function tabCount(): number {
  return tabsRef.value.length
}
