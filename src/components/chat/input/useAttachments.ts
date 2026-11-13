import { useFileDialog } from '@vueuse/core'
import { computed, onBeforeUnmount, type Ref } from 'vue'

import type { Editor } from '@open-pencil/core'

import { isAttachableImageFile } from '@/app/ai/attachment/image/prepare'
import { resolveReferencedNodes } from '@/app/ai/chat/context'
import { referenceLink } from '@/app/ai/chat/references/link'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import { createAttachmentDrafts } from '@/components/chat/input/attachment-drafts'

interface AttachmentDraftOptions {
  editor: Editor
  selectedIds: Ref<Set<string>>
  reportError: (message: string) => void
}

function useDraftFilePicker(drafts: ReturnType<typeof createAttachmentDrafts>) {
  const dialog = useFileDialog({ multiple: true, reset: true })
  async function addFiles(files: File[]): Promise<void> {
    try {
      await drafts.addFiles(files)
    } finally {
      dialog.reset()
    }
  }
  dialog.onChange((files) => {
    if (files) void addFiles([...files])
  })
  onBeforeUnmount(() => {
    drafts.clear()
    dialog.reset()
  })
  return { dialog, addFiles }
}

export function useAttachmentDrafts(options: AttachmentDraftOptions) {
  const drafts = createAttachmentDrafts(options.reportError)
  const { dialog, addFiles } = useDraftFilePicker(drafts)
  function takeSubmission(text: string): ChatSubmission {
    dialog.reset()
    return {
      modelText: text,
      displayText: text,
      ...drafts.take(),
      nodes: mentionedNodes(options.editor.graph, text)
    }
  }
  function handlePaste(event: ClipboardEvent): void {
    const files = [...(event.clipboardData?.files ?? [])].filter(isAttachableImageFile)
    if (files.length === 0) return
    event.preventDefault()
    void addFiles(files)
  }
  return {
    images: drafts.images,
    textFiles: drafts.textFiles,
    preparing: drafts.preparing,
    canMentionSelection: computed(() => options.selectedIds.value.size > 0),
    selectionMentions: () =>
      resolveReferencedNodes(options.editor.graph, [...options.selectedIds.value])
        .map((node) => `${referenceLink({ kind: 'node', id: node.id, label: node.name })} `)
        .join(''),
    openImageDialog: dialog.open,
    addFiles,
    removeImage: (index: number) => {
      drafts.removeImage(index)
      dialog.reset()
    },
    removeTextFile: drafts.removeTextFile,
    handlePaste,
    takeSubmission,
    restoreSubmission: drafts.restore
  }
}
