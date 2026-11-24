import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'

import {
  BRUTAL_BATCH_LIMIT,
  brutalPingStep,
  type BrutalUsageBatch,
  type BrutalUsageEvent
} from '@open-pencil/feedback/brutal/schema'
import {
  DOCUMENT_FORMATS,
  USAGE_BATCH_LIMIT,
  type DocumentFormat,
  type Build,
  type Ping,
  type UsageBatch,
  type UsageEvent
} from '@open-pencil/feedback/contract'

import type { SharingPreferences } from '@/app/settings/preferences/store'

import type { SharingState } from './state'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type FlushOptions = { keepalive?: boolean }
type BrutalDocumentEvent = {
  name: 'document_opened' | 'document_exported'
  format: 'brut'
}
type QueuedUsageEvent = UsageEvent | BrutalDocumentEvent

/** A usage event as callers report it; the time is added when it is recorded. */
export type UsageEventInput = DistributiveOmit<UsageEvent, 'timestamp'>

export interface SharingClientOptions {
  /** Whether this build may send anything at all. */
  enabled: boolean
  preferences: () => SharingPreferences
  state: Ref<SharingState>
  build: () => Promise<Build>
  disabledByEnvironment: () => Promise<boolean>
  /** Sends to the feedback service and reports whether each request was accepted. */
  send:
    | {
        ping: (ping: Ping) => Promise<boolean>
        ingest: (batch: UsageBatch, options: FlushOptions) => Promise<boolean>
      }
    | {
        version: string
        /** Snapshotted with the queued batch so settings changes cannot reroute it. */
        aggregate: (batch: BrutalUsageBatch, options: FlushOptions) => Promise<boolean>
      }
  now?: () => Date
}

const FLUSH_DELAY_MS = 5_000
const FLUSH_MAX_WAIT_MS = 30_000

const isDocumentFormat = (format: string): format is DocumentFormat =>
  (DOCUMENT_FORMATS as readonly string[]).includes(format)

function aggregateEvent(event: QueuedUsageEvent): BrutalUsageEvent {
  if (!('timestamp' in event)) return event
  const { timestamp: _timestamp, ...dimensions } = event
  return dimensions
}

function buildDimensions({ platform, arch, app, browser }: Build) {
  return { platform, arch, app, browser }
}

export function createSharingClient(options: SharingClientOptions) {
  const now = options.now ?? (() => new Date())
  const { send } = options
  const pending: QueuedUsageEvent[] = []
  let countedBrutalLaunch = false
  let usageConsentRevision = 0
  let brutalPingInFlight = false

  function canShareUsage(): boolean {
    return (
      options.enabled &&
      ('aggregate' in send
        ? options.preferences().brutalDetailedUsageStats === 'granted'
        : options.preferences().usageStats === 'granted' && options.state.value.installId !== null)
    )
  }

  /**
   * Sends today's anonymous ping unless this install already did, the person turned it off, or
   * the build or environment sends nothing. A failed ping is retried on the next check.
   */
  async function sendDailyPing(): Promise<void> {
    const day = now().toISOString().slice(0, 10)
    if ('aggregate' in send) {
      if (!canShareUsage() || brutalPingInFlight || options.state.value.brutalLastPingDay === day)
        return
      const { aggregate, version } = send
      const revision = usageConsentRevision
      brutalPingInFlight = true
      try {
        if (await options.disabledByEnvironment()) return
        const build = buildDimensions(await options.build())
        if (revision !== usageConsentRevision || !canShareUsage()) return
        const pingCount = (options.state.value.brutalPingCount ?? 0) + 1
        if (
          (await aggregate(
            {
              version,
              build,
              events: [{ name: 'daily_ping', usageStats: 'granted', ...brutalPingStep(pingCount) }]
            },
            {}
          )) &&
          revision === usageConsentRevision
        ) {
          options.state.value = {
            ...options.state.value,
            brutalLastPingDay: day,
            brutalPingCount: pingCount
          }
        }
      } finally {
        brutalPingInFlight = false
      }
      return
    }
    if (!options.enabled || !options.preferences().dailyPing) return
    if (options.state.value.lastPingDay === day) return
    if (await options.disabledByEnvironment()) return
    const build = await options.build()
    // The person may have turned the ping off while the checks above were pending.
    const { dailyPing, usageStats } = options.preferences()
    if (!dailyPing) return
    const ping: Ping = { ...build, usageStats }
    if (await send.ping(ping)) {
      options.state.value = { ...options.state.value, lastPingDay: day }
    }
  }

  /** Sends what is queued; events that fail to send are dropped rather than piling up. */
  async function flushUsage(flush: FlushOptions = {}): Promise<void> {
    if ('aggregate' in send) {
      if (!pending.length) return
      const { aggregate, version } = send
      const queued = pending.splice(0)
      const consentRevision = usageConsentRevision
      if (await options.disabledByEnvironment()) return
      const build = buildDimensions(await options.build())
      while (queued.length) {
        if (consentRevision !== usageConsentRevision || !canShareUsage()) return
        const events = queued.splice(0, BRUTAL_BATCH_LIMIT).map(aggregateEvent)
        const installId = options.state.value.brutalInstallId ?? undefined
        if (installId) await aggregate({ version, build, installId, events }, flush)
      }
      return
    }
    if (await options.disabledByEnvironment()) {
      pending.length = 0
      return
    }
    while (pending.length > 0) {
      const build = await options.build()
      // Read after every wait, so stopping takes effect before the next request goes out.
      const installId = options.state.value.installId
      if (!canShareUsage() || !installId) {
        pending.length = 0
        return
      }
      const events = pending
        .splice(0, USAGE_BATCH_LIMIT)
        .filter((event): event is UsageEvent => 'timestamp' in event)
      const batch: UsageBatch = { ...build, installId, events }
      await send.ingest(batch, flush)
    }
  }

  const scheduleFlush = useDebounceFn(() => flushUsage(), FLUSH_DELAY_MS, {
    maxWait: FLUSH_MAX_WAIT_MS
  })

  function queueUsage(event: QueuedUsageEvent): void {
    pending.push(event)
    void scheduleFlush()
  }

  /** Records a usage event when the person agreed to share usage stats. */
  function trackUsage(event: UsageEventInput): void {
    if (!canShareUsage()) return
    if ('aggregate' in send && event.name === 'app_opened') {
      if (countedBrutalLaunch) return
      countedBrutalLaunch = true
    }
    queueUsage({ ...event, timestamp: now().toISOString() })
  }

  /** Reports only allowlisted file formats. .brut uses its own label on Brutal's receiver. */
  function trackDocumentFormat(name: 'document_opened' | 'document_exported', format: string) {
    if (format === 'brut') {
      if ('aggregate' in send && canShareUsage()) queueUsage({ name, format })
      return
    }
    if (isDocumentFormat(format)) trackUsage({ name, format })
  }

  return {
    sendDailyPing,
    flushUsage,
    trackUsage,
    trackDocumentFormat,
    /** Forgets queued events, for when the person stops sharing. */
    discardPendingUsage: () => {
      usageConsentRevision++
      pending.length = 0
    }
  }
}

export type SharingClient = ReturnType<typeof createSharingClient>
