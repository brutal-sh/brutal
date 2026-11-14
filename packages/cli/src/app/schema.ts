import * as v from 'valibot'

import type { AppTarget } from './target'

export const appTargetSchema = v.object({
  documentId: v.string(),
  documentName: v.string(),
  path: v.optional(v.string()),
  pageId: v.string(),
  pageName: v.string()
}) satisfies v.GenericSchema<unknown, AppTarget>

export const appResponseSchema = v.object({
  ok: v.boolean(),
  result: v.optional(v.unknown()),
  target: v.optional(appTargetSchema),
  error: v.optional(v.string())
})

export const appErrorSchema = v.object({ error: v.optional(v.string()) })
