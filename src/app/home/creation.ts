import { shallowRef } from 'vue'

import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import type { EditorStore } from '@/app/editor/active-store'
import { createTab } from '@/app/tabs'

/** Home hands a draft to the new document's ordinary Agent submission pipeline. */
export const homeCreation = shallowRef<{ editor: EditorStore; submission: ChatSubmission } | null>(
  null
)
const browserRequests = new WeakSet<EditorStore>()

export function createHomeDesign(submission: ChatSubmission) {
  for (const image of homeCreation.value?.submission.images ?? [])
    revokeImagePreviewURL(image.previewURL)
  const tab = createTab()
  homeCreation.value = { editor: tab.store, submission }
}

export function takeHomeCreation(editor: EditorStore): ChatSubmission | null {
  const pending = homeCreation.value
  if (pending?.editor !== editor) return null
  homeCreation.value = null
  return pending.submission
}

export function createHomeBrowserDesign() {
  const tab = createTab()
  browserRequests.add(tab.store)
}

export function consumeHomeBrowserRequest(editor: EditorStore): boolean {
  return browserRequests.delete(editor)
}
