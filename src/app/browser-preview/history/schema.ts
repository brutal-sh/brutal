import * as v from 'valibot'

import { previewURL } from '../schema'

export const browserHistoryEntrySchema = v.object({
  url: v.pipe(
    v.string(),
    v.check((url) => {
      try {
        return previewURL(url) === url
      } catch {
        return false
      }
    })
  ),
  visitedAt: v.pipe(v.number(), v.finite(), v.minValue(0))
})

export type BrowserHistoryEntry = v.InferOutput<typeof browserHistoryEntrySchema>

export const browserHistorySchema = v.array(
  v.fallback(v.optional(browserHistoryEntrySchema), undefined)
)

export const browserHistoryGenerationSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(Number.MAX_SAFE_INTEGER)
)
export const completedBrowserVisitSchema = v.object({
  url: v.string(),
  generation: browserHistoryGenerationSchema
})
export type CompletedBrowserVisit = v.InferOutput<typeof completedBrowserVisitSchema>
