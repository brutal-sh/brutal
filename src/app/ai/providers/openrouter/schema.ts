import * as v from 'valibot'

export const loopbackOutcomeSchema = v.variant('kind', [
  v.object({ kind: v.literal('code'), code: v.string() }),
  v.object({ kind: v.picklist(['denied', 'expired', 'cancelled']) })
])

export const loopbackURLSchema = v.pipe(
  v.string(),
  v.url(),
  v.regex(/^http:\/\/localhost:[1-9]\d*\/auth\/callback$/)
)
