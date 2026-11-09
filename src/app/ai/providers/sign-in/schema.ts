import * as v from 'valibot'

/** Native loopback results follow the shell's state check; browser callbacks may also mismatch. */
export const loopbackOutcomeSchema = v.variant('kind', [
  v.object({ kind: v.literal('code'), code: v.string() }),
  v.object({ kind: v.picklist(['denied', 'expired', 'cancelled']) })
])
