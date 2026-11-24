import * as v from 'valibot'

import {
  AI_PROVIDERS,
  CONSENT_SOURCES,
  DOCUMENT_FORMATS,
  LOCALES,
  appVersionSchema,
  buildSchema
} from '../contract/schema'

export const BRUTAL_USAGE_ORIGIN = 'https://usage.brutal.sh/telemetry'

const BRUTAL_DOCUMENT_FORMATS = [...DOCUMENT_FORMATS, 'brut'] as const
const PING_STEPS = ['1', '2', '3-4', '5-8', '9-16', '17-32', '33-64', '65+'] as const
const PING_STEP_STARTS = [1, 2, 3, 5, 9, 17, 33, 65] as const
const CAMPAIGN_PLACEMENTS = [
  'prompt',
  'settings-cloud',
  'settings-models',
  'settings-integrations',
  'settings-usage',
  'share'
] as const

export function brutalPingStep(day: number) {
  const step = Math.max(
    0,
    PING_STEP_STARTS.findLastIndex((start) => start <= day)
  )
  return { pingDays: PING_STEPS[step], enteredStep: PING_STEP_STARTS[step] === day }
}

const campaignFields = {
  campaign: v.literal('donation'),
  placement: v.picklist(CAMPAIGN_PLACEMENTS)
}

const eventSchema = v.variant('name', [
  v.strictObject({
    name: v.literal('app_opened'),
    locale: v.picklist([...LOCALES, 'ar', 'pt-BR'])
  }),
  v.strictObject({
    name: v.literal('document_opened'),
    format: v.picklist(BRUTAL_DOCUMENT_FORMATS)
  }),
  v.strictObject({
    name: v.literal('document_exported'),
    format: v.picklist(BRUTAL_DOCUMENT_FORMATS)
  }),
  v.strictObject({
    name: v.literal('ai_reply_finished'),
    provider: v.picklist([...AI_PROVIDERS, 'acp:antigravity', 'acp:cursor', 'acp:grok-build'])
  }),
  v.strictObject({ name: v.literal('usage_stats_enabled'), source: v.picklist(CONSENT_SOURCES) }),
  v.strictObject({
    name: v.literal('donate_clicked'),
    source: v.picklist(['prompt', 'menu', 'settings'])
  }),
  v.strictObject({ name: v.literal('campaign_shown'), ...campaignFields }),
  v.strictObject({ name: v.literal('campaign_dismissed'), ...campaignFields }),
  v.strictObject({ name: v.literal('campaign_acted'), ...campaignFields })
])

const legacyEventSchema = v.variant('name', [
  v.strictObject({ name: v.literal('app_opened') }),
  v.strictObject({
    name: v.literal('document_opened'),
    format: v.picklist(BRUTAL_DOCUMENT_FORMATS)
  }),
  v.strictObject({
    name: v.literal('document_exported'),
    format: v.picklist(BRUTAL_DOCUMENT_FORMATS)
  }),
  v.strictObject({ name: v.literal('ai_reply_finished') })
])

const pingEventSchema = v.strictObject({
  name: v.literal('daily_ping'),
  usageStats: v.literal('granted'),
  pingDays: v.picklist(PING_STEPS),
  enteredStep: v.boolean()
})

const buildDimensionsSchema = v.omit(buildSchema, ['version'])

// Seven bound values per event, under D1's 100-parameter limit.
export const BRUTAL_BATCH_LIMIT = 14
const LEGACY_BATCH_LIMIT = 20

// Older beta builds still send the same four events without build fields or an install ID.
export const brutalUsageBatchSchema = v.union([
  v.strictObject({
    version: appVersionSchema,
    events: v.pipe(v.array(legacyEventSchema), v.minLength(1), v.maxLength(LEGACY_BATCH_LIMIT))
  }),
  v.strictObject({
    version: appVersionSchema,
    build: buildDimensionsSchema,
    installId: v.pipe(v.string(), v.regex(/^[0-9a-f]{32}$/)),
    events: v.pipe(v.array(eventSchema), v.minLength(1), v.maxLength(BRUTAL_BATCH_LIMIT))
  }),
  v.strictObject({
    version: appVersionSchema,
    build: buildDimensionsSchema,
    events: v.tuple([pingEventSchema])
  })
])

export type BrutalUsageBatch = v.InferOutput<typeof brutalUsageBatchSchema>
export type BrutalUsageEvent = v.InferOutput<typeof eventSchema>
