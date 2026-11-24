import { describe, expect, test } from 'bun:test'

import { ref } from 'vue'

import type { BrutalUsageBatch } from '@open-pencil/feedback/brutal/schema'
import type { Build } from '@open-pencil/feedback/contract'

import { createDeferred } from '@/app/runtime/deferred'
import type { SharingPreferences } from '@/app/settings/preferences/store'
import { createSharingClient, type SharingClientOptions } from '@/app/telemetry/client'
import type { SharingState } from '@/app/telemetry/state'

const BUILD: Build = {
  version: '0.16.0',
  platform: 'linux',
  arch: 'x64',
  app: 'desktop',
  browser: 'unknown'
}
const INSTALL_ID = '0123456789abcdef0123456789abcdef'
const BUILD_DETAILS = {
  platform: BUILD.platform,
  arch: BUILD.arch,
  app: BUILD.app,
  browser: BUILD.browser
}

function setup(overrides: Partial<SharingClientOptions> = {}) {
  const posts: { route: string; body: unknown; keepalive?: boolean }[] = []
  const preferences = ref<SharingPreferences>({ dailyPing: true, usageStats: 'unset' })
  const state = ref<SharingState>({ installId: null, lastPingDay: null })
  const clock = { now: new Date('2026-10-12T09:00:00.000Z') }
  let accept = true
  const client = createSharingClient({
    enabled: true,
    preferences: () => preferences.value,
    state,
    build: async () => BUILD,
    disabledByEnvironment: async () => false,
    send: {
      async ping(body) {
        posts.push({ route: '/ping', body, keepalive: undefined })
        return accept
      },
      async ingest(body, { keepalive }) {
        posts.push({ route: '/ingest', body, keepalive })
        return accept
      }
    },
    now: () => clock.now,
    ...overrides
  })
  return {
    client,
    posts,
    preferences,
    state,
    clock,
    rejectPosts: () => {
      accept = false
    },
    acceptPosts: () => {
      accept = true
    }
  }
}

function sharingUsage(context: ReturnType<typeof setup>) {
  context.preferences.value = { ...context.preferences.value, usageStats: 'granted' }
  context.state.value = { ...context.state.value, installId: INSTALL_ID }
}

describe('daily ping', () => {
  test('sends only the build, once a day', async () => {
    const context = setup()

    await context.client.sendDailyPing()
    await context.client.sendDailyPing()
    context.clock.now = new Date('2026-10-13T01:00:00.000Z')
    await context.client.sendDailyPing()

    const ping = { ...BUILD, usageStats: 'unset' }
    expect(context.posts).toEqual([
      { route: '/ping', body: ping, keepalive: undefined },
      { route: '/ping', body: ping, keepalive: undefined }
    ])
    expect(context.state.value.lastPingDay).toBe('2026-10-13')
  })

  test('reports how the install answered the usage stats question', async () => {
    const context = setup()
    context.preferences.value = { ...context.preferences.value, usageStats: 'denied' }
    await context.client.sendDailyPing()

    expect(context.posts).toEqual([
      { route: '/ping', body: { ...BUILD, usageStats: 'denied' }, keepalive: undefined }
    ])
  })

  test('tries again on the next check when a ping fails', async () => {
    const context = setup()
    context.rejectPosts()
    await context.client.sendDailyPing()
    expect(context.state.value.lastPingDay).toBeNull()

    context.acceptPosts()
    await context.client.sendDailyPing()
    expect(context.posts).toHaveLength(2)
    expect(context.state.value.lastPingDay).toBe('2026-10-12')
  })

  test('sends no ping when it is turned off while the build is being read', async () => {
    const build = createDeferred<Build>()
    const context = setup({ build: () => build.promise })
    const pinging = context.client.sendDailyPing()
    await Promise.resolve()
    context.preferences.value = { ...context.preferences.value, dailyPing: false }
    build.resolve(BUILD)
    await pinging

    expect(context.posts).toEqual([])
  })

  test('sends nothing when turned off, from a build that may not send, or when the environment says so', async () => {
    const off = setup()
    off.preferences.value = { ...off.preferences.value, dailyPing: false }
    await off.client.sendDailyPing()

    const unofficial = setup({ enabled: false })
    await unofficial.client.sendDailyPing()

    const environment = setup({ disabledByEnvironment: async () => true })
    await environment.client.sendDailyPing()

    expect([...off.posts, ...unofficial.posts, ...environment.posts]).toEqual([])
  })
})

describe('usage stats', () => {
  test('keeps queued Brutal events on their original route when QA mode changes', async () => {
    const environment = createDeferred<boolean>()
    const delivered: { qa: boolean; events: BrutalUsageBatch['events'] }[] = []
    let qa = true
    const context = setup({
      disabledByEnvironment: () => environment.promise,
      send: {
        version: '0.16.0-beta.22',
        get aggregate() {
          const route = qa
          return async ({ events }: BrutalUsageBatch) => {
            delivered.push({ qa: route, events })
            return true
          }
        }
      }
    })
    context.preferences.value = {
      ...context.preferences.value,
      brutalDetailedUsageStats: 'granted'
    }
    context.state.value.brutalInstallId = INSTALL_ID
    context.client.trackDocumentFormat('document_opened', 'brut')
    const qaFlush = context.client.flushUsage()
    qa = false
    context.client.trackDocumentFormat('document_exported', 'png')
    const regularFlush = context.client.flushUsage()
    environment.resolve(false)
    await Promise.all([qaFlush, regularFlush])
    expect(delivered).toEqual([
      { qa: true, events: [{ name: 'document_opened', format: 'brut' }] },
      { qa: false, events: [{ name: 'document_exported', format: 'png' }] }
    ])
  })

  test('expanded Brutal sharing requires fresh consent and sends allowlisted dimensions', async () => {
    const aggregate: BrutalUsageBatch[] = []
    const context = setup({
      send: {
        version: '0.16.0-beta.16',
        async aggregate(batch) {
          aggregate.push(batch)
          return true
        }
      }
    })
    sharingUsage(context)
    context.preferences.value.brutalUsageStats = 'granted'
    context.client.trackUsage({ name: 'app_opened', locale: 'en' })
    await context.client.sendDailyPing()
    await context.client.flushUsage()
    expect(aggregate).toEqual([])

    context.preferences.value.brutalDetailedUsageStats = 'granted'
    context.state.value.brutalInstallId = INSTALL_ID
    context.client.trackUsage({ name: 'usage_stats_enabled', source: 'welcome' })
    context.client.trackUsage({ name: 'app_opened', locale: 'es' })
    context.client.trackDocumentFormat('document_opened', 'brut')
    context.client.trackDocumentFormat('document_opened', 'pen')
    context.client.trackDocumentFormat('document_exported', 'svg')
    context.client.trackUsage({ name: 'ai_reply_finished', provider: 'acp:codex' })
    await context.client.flushUsage()
    expect(aggregate).toEqual([
      {
        version: '0.16.0-beta.16',
        build: BUILD_DETAILS,
        installId: INSTALL_ID,
        events: [
          { name: 'usage_stats_enabled', source: 'welcome' },
          { name: 'app_opened', locale: 'es' },
          { name: 'document_opened', format: 'brut' },
          { name: 'document_opened', format: 'pen' },
          { name: 'document_exported', format: 'svg' },
          { name: 'ai_reply_finished', provider: 'acp:codex' }
        ]
      }
    ])

    context.client.trackDocumentFormat('document_exported', 'png')
    context.preferences.value.brutalDetailedUsageStats = 'denied'
    await context.client.flushUsage()
    await context.client.sendDailyPing()
    expect(aggregate).toHaveLength(1)
  })

  test('Brutal sends one anonymous daily activity ping per UTC day after opt-in', async () => {
    const sent: BrutalUsageBatch[] = []
    const version = '0.16.0-beta.23'
    const context = setup({
      send: {
        version,
        async aggregate(batch) {
          sent.push(batch)
          return true
        }
      }
    })
    context.preferences.value.brutalDetailedUsageStats = 'denied'
    await context.client.sendDailyPing()
    expect(sent).toEqual([])

    context.preferences.value.brutalDetailedUsageStats = 'granted'
    context.state.value.brutalInstallId = INSTALL_ID
    await Promise.all([context.client.sendDailyPing(), context.client.sendDailyPing()])
    await context.client.sendDailyPing()
    context.clock.now = new Date('2026-10-13T01:00:00.000Z')
    await context.client.sendDailyPing()

    expect(sent).toEqual(
      (['1', '2'] as const).map((pingDays) => ({
        version,
        build: BUILD_DETAILS,
        events: [{ name: 'daily_ping', pingDays, enteredStep: true, usageStats: 'granted' }]
      }))
    )
    expect(context.state.value.brutalLastPingDay).toBe('2026-10-13')
  })

  test('records nothing until the person agrees', async () => {
    const context = setup()
    context.client.trackUsage({ name: 'app_opened', locale: 'en' })
    sharingUsage(context)
    await context.client.flushUsage()

    expect(context.posts).toEqual([])
  })

  test('sends recorded events with the build and the random install ID', async () => {
    const context = setup()
    sharingUsage(context)
    context.client.trackUsage({ name: 'app_opened', locale: 'fr' })
    context.client.trackDocumentFormat('document_exported', 'svg')
    await context.client.flushUsage({ keepalive: true })

    expect(context.posts).toEqual([
      {
        route: '/ingest',
        keepalive: true,
        body: {
          ...BUILD,
          installId: INSTALL_ID,
          events: [
            { name: 'app_opened', locale: 'fr', timestamp: '2026-10-12T09:00:00.000Z' },
            { name: 'document_exported', format: 'svg', timestamp: '2026-10-12T09:00:00.000Z' }
          ]
        }
      }
    ])
  })

  test('leaves out file formats that are not on the shared list', async () => {
    const context = setup()
    sharingUsage(context)
    context.client.trackDocumentFormat('document_opened', 'sketch')
    context.client.trackDocumentFormat('document_opened', 'brut')
    await context.client.flushUsage()

    expect(context.posts).toEqual([])
  })

  test('sends long queues in batches the service accepts', async () => {
    const context = setup()
    sharingUsage(context)
    for (let index = 0; index < 120; index += 1) {
      context.client.trackUsage({ name: 'document_opened', format: 'fig' })
    }
    await context.client.flushUsage()

    expect(
      context.posts.map(({ body }) =>
        typeof body === 'object' && body !== null && 'events' in body && Array.isArray(body.events)
          ? body.events.length
          : 0
      )
    ).toEqual([50, 50, 20])
  })

  test('sends nothing when the person stops sharing while a batch is being prepared', async () => {
    const build = createDeferred<Build>()
    const context = setup({ build: () => build.promise })
    sharingUsage(context)
    context.client.trackUsage({ name: 'app_opened', locale: 'en' })
    const flushing = context.client.flushUsage()
    await Promise.resolve()
    context.preferences.value = { ...context.preferences.value, usageStats: 'denied' }
    build.resolve(BUILD)
    await flushing

    expect(context.posts).toEqual([])
  })

  test('drops what is queued when the person stops sharing before it is sent', async () => {
    const context = setup()
    sharingUsage(context)
    context.client.trackUsage({ name: 'app_opened', locale: 'en' })
    context.preferences.value = { ...context.preferences.value, usageStats: 'denied' }
    await context.client.flushUsage()

    context.preferences.value = { ...context.preferences.value, usageStats: 'granted' }
    await context.client.flushUsage()

    expect(context.posts).toEqual([])
  })
})
