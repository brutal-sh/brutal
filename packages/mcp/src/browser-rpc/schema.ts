import * as v from 'valibot'

/** Any JSON object; the per-type schemas below run only once its `type` is known. */
export const browserEnvelopeSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.custom<Record<string, unknown>>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
  )
)

export const handshakeMessageSchema = v.looseObject({ token: v.optional(v.nullable(v.string())) })

export const requestMessageSchema = v.looseObject({
  type: v.literal('request'),
  id: v.pipe(v.string(), v.nonEmpty())
})

export const responseMessageSchema = v.looseObject({
  type: v.literal('response'),
  id: v.pipe(v.string(), v.nonEmpty()),
  ok: v.optional(v.boolean()),
  error: v.optional(v.string())
})
