import * as v from 'valibot'

export const automationTargetEntries = {
  document_id: v.optional(
    v.pipe(v.string(), v.description('Optional Brutal document/tab ID to target'))
  ),
  page_id: v.optional(
    v.pipe(v.string(), v.description('Optional page ID to target within the document'))
  )
}

export const recentFilesResultSchema = v.object({
  files: v.array(v.object({ path: v.string(), name: v.string(), updated_at: v.string() }))
})
