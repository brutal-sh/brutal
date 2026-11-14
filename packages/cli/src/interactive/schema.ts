import * as v from 'valibot'

import type { AutomationDocumentSummary } from '@open-pencil/core/rpc'

const documentSchema = v.object({
  id: v.string(),
  name: v.string(),
  path: v.optional(v.string()),
  active: v.boolean(),
  current_page_id: v.string(),
  current_page_name: v.string(),
  pages: v.array(v.object({ id: v.string(), name: v.string() }))
}) satisfies v.GenericSchema<unknown, AutomationDocumentSummary>

export const documentsSchema = v.object({
  documents: v.array(documentSchema),
  unique_document_ids: v.literal(true)
})
