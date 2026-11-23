import * as v from 'valibot'

import { DOCUMENT_FORMATS, appVersionSchema } from '../contract/schema'

export const BRUTAL_USAGE_ORIGIN = 'https://brutal.sh/usage-stats'

const eventSchema = v.variant('name', [
  v.strictObject({ name: v.literal('app_opened') }),
  v.strictObject({
    name: v.literal('document_opened'),
    format: v.picklist(DOCUMENT_FORMATS)
  }),
  v.strictObject({
    name: v.literal('document_exported'),
    format: v.picklist(DOCUMENT_FORMATS)
  }),
  v.strictObject({ name: v.literal('ai_reply_finished') })
])

// Five bound values per event, under D1's 100-parameter limit.
export const BRUTAL_BATCH_LIMIT = 20

export const brutalUsageBatchSchema = v.strictObject({
  version: appVersionSchema,
  events: v.pipe(v.array(eventSchema), v.minLength(1), v.maxLength(BRUTAL_BATCH_LIMIT))
})

export type BrutalUsageBatch = v.InferOutput<typeof brutalUsageBatchSchema>
