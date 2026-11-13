import { mapValues } from 'es-toolkit'

import { createIDBDiagnosticsStore, type DiagnosticsStore } from './idb'
import { scrubDiagnosticText } from './scrub'
import {
  getDiagnosticsRetention,
  isDiagnosticsEnabled,
  type DiagnosticsRetention
} from './settings'
import type { DiagnosticEvent, DiagnosticEventInput } from './types'

const MAX_MEMORY_EVENTS = 1000
let store: DiagnosticsStore | null = null
let memoryEvents: DiagnosticEvent[] = []
let pendingWrites = Promise.resolve()
const subscribers = new Set<() => void>()

const memoryStore: DiagnosticsStore = {
  async record(_event) {
    memoryEvents = memoryEvents.slice(-getDiagnosticsRetention())
  },
  async list() {
    return [...memoryEvents].reverse()
  },
  async prune(retention) {
    memoryEvents = memoryEvents.slice(-retention)
  },
  async clear() {
    memoryEvents = []
  }
}

function getStore(): DiagnosticsStore {
  if (store) return store
  if (typeof indexedDB === 'undefined') return (store = memoryStore)
  try {
    return (store = createIDBDiagnosticsStore())
  } catch {
    return (store = memoryStore)
  }
}

function notify(): void {
  for (const subscriber of subscribers) subscriber()
}

const ERROR_DETAIL_FIELDS = new Set(['errorName', 'errorCode', 'message', 'stack', 'info'])

// Free-text errors need scrubbing; model identifiers and correlation metadata stay exact.
function scrubEventErrorDetails(event: DiagnosticEvent): DiagnosticEvent {
  return {
    ...event,
    attributes: mapValues(event.attributes, (value, key) =>
      ERROR_DETAIL_FIELDS.has(key) && typeof value === 'string' ? scrubDiagnosticText(value) : value
    )
  }
}

function makeEvent(input: DiagnosticEventInput): DiagnosticEvent {
  return scrubEventErrorDetails({
    ...input,
    id: crypto.randomUUID(),
    timestamp: input.timestamp ?? Date.now()
  })
}

function enqueue(operation: () => Promise<void>): void {
  pendingWrites = pendingWrites.then(operation).catch((error: unknown) => {
    console.warn('[Diagnostics] Failed to persist event; using memory fallback:', error)
    store = memoryStore
  })
}

export function recordDiagnostic(input: DiagnosticEventInput): void {
  if (!isDiagnosticsEnabled()) return
  const event = makeEvent(input)
  memoryEvents = [...memoryEvents, event].slice(
    -Math.min(getDiagnosticsRetention(), MAX_MEMORY_EVENTS)
  )
  enqueue(() => getStore().record(event))
  notify()
}

export const diagnostics = {
  recent(): DiagnosticEvent[] {
    return [...memoryEvents].reverse()
  },
  subscribe(listener: () => void): () => void {
    subscribers.add(listener)
    return () => subscribers.delete(listener)
  },
  async list(): Promise<DiagnosticEvent[]> {
    await pendingWrites
    return store === memoryStore ? memoryStore.list() : getStore().list()
  },
  /** The stored events, after `environment`, the context a report needs to reproduce them. */
  async export(environment: Record<string, unknown> = {}): Promise<string> {
    return JSON.stringify(
      { environment, events: (await this.list()).map(scrubEventErrorDetails) },
      null,
      2
    )
  },
  async prune(retention: DiagnosticsRetention): Promise<void> {
    memoryEvents = memoryEvents.slice(-retention)
    enqueue(() => getStore().prune(retention))
    await pendingWrites
    notify()
  },
  async clear(): Promise<void> {
    memoryEvents = []
    enqueue(() => getStore().clear())
    await pendingWrites
    notify()
  }
}
