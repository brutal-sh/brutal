import { compact, uniqBy } from 'es-toolkit/array'
import * as v from 'valibot'

import { previewURL } from '../schema'
import { browserHistorySchema, type BrowserHistoryEntry } from './schema'

export const MAX_BROWSER_HISTORY_ENTRIES = 50

export function parseBrowserHistory(text: string): BrowserHistoryEntry[] {
  const result = v.safeParse(v.pipe(v.string(), v.parseJson(), browserHistorySchema), text)
  return result.success
    ? uniqBy(compact(result.output), (entry) => entry.url).slice(0, MAX_BROWSER_HISTORY_ENTRIES)
    : []
}

export function recordBrowserHistory(
  entries: readonly BrowserHistoryEntry[],
  input: string,
  visitedAt: number
): readonly BrowserHistoryEntry[] {
  let url: string
  try {
    url = previewURL(input)
  } catch {
    return entries
  }
  if (entries[0]?.url === url) return entries
  return uniqBy([{ url, visitedAt }, ...entries], (entry) => entry.url).slice(
    0,
    MAX_BROWSER_HISTORY_ENTRIES
  )
}
