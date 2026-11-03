import { computed, ref } from 'vue'

import { MAX_BROWSER_HISTORY_ENTRIES, parseBrowserHistory, recordBrowserHistory } from './model'
import type { BrowserHistoryEntry, CompletedBrowserVisit } from './schema'
import { browserHistoryURL } from './url'

interface HistoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
const STORAGE_KEY = 'open-pen:browser-history'

export function createBrowserHistoryState(
  storage: () => HistoryStorage,
  clearVisits: (url?: string) => Promise<number>
) {
  const entries = ref<readonly BrowserHistoryEntry[]>([])
  const error = ref('')
  const pending = ref(false)
  let generation = 0
  const removed = new Map<string, number>()
  const waiting = new Map<string, CompletedBrowserVisit>()

  function refresh() {
    try {
      entries.value = parseBrowserHistory(storage().getItem(STORAGE_KEY) ?? '[]')
    } catch {
      error.value = 'Browsing history could not be read on this device.'
    }
  }
  function commit(next: readonly BrowserHistoryEntry[]): boolean {
    try {
      const target = storage()
      if (next.length) target.setItem(STORAGE_KEY, JSON.stringify(next))
      else target.removeItem(STORAGE_KEY)
      // Keep a failed deletion visible and retryable before changing the in-memory list.
      entries.value = next
      error.value = ''
      return true
    } catch {
      error.value = 'The history change could not be saved on this device.'
      return false
    }
  }
  function remember(visit: CompletedBrowserVisit) {
    if (visit.generation < generation) return
    if (pending.value) {
      let url: string
      try {
        url = browserHistoryURL(visit.url)
      } catch {
        return
      }
      if (visit.generation < (waiting.get(url)?.generation ?? 0)) return
      waiting.delete(url)
      waiting.set(url, { ...visit, url })
      if (waiting.size > MAX_BROWSER_HISTORY_ENTRIES) {
        let oldest: CompletedBrowserVisit | undefined
        for (const candidate of waiting.values()) {
          if (!oldest || candidate.generation < oldest.generation) oldest = candidate
        }
        if (oldest) waiting.delete(oldest.url)
      }
      return
    }
    const next = recordBrowserHistory(entries.value, visit.url, Date.now())
    if (next === entries.value) return
    const url = next[0]?.url
    if (url && visit.generation >= (removed.get(url) ?? 0)) commit(next)
  }
  async function change(url?: string): Promise<boolean> {
    if (pending.value) return false
    pending.value = true
    try {
      const target = url === undefined ? undefined : browserHistoryURL(url)
      const nextGeneration = await clearVisits(target)
      if (target === undefined) {
        generation = Math.max(generation, nextGeneration)
        removed.clear()
      } else {
        removed.set(target, Math.max(removed.get(target) ?? 0, nextGeneration))
      }
      return commit(
        target === undefined ? [] : entries.value.filter((entry) => entry.url !== target)
      )
    } catch {
      error.value = 'Browsing history could not be changed. Try again.'
      return false
    } finally {
      const failure = error.value
      pending.value = false
      const visits = [...waiting.values()].sort((a, b) => a.generation - b.generation)
      for (const visit of visits) remember(visit)
      waiting.clear()
      if (failure) error.value = failure
    }
  }
  refresh()
  return {
    entries: computed(() => entries.value),
    error,
    pending,
    refresh,
    remember,
    remove: (url: string) => change(url),
    clear: () => change()
  }
}
