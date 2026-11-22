import * as v from 'valibot'

export const restartRequestSchema = v.object({ id: v.string() })
export const restartReplySchema = v.object({ id: v.string(), approved: v.boolean() })
export const deferredUpdateSchema = v.object({ version: v.string() })
