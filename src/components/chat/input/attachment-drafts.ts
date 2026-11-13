import { computed, ref, type Ref } from 'vue'

import { isSVGFile } from '@open-pencil/scene-graph/images'

import {
  createImagePreviewURL,
  isAttachableImageFile,
  rasterizeSVGAttachment,
  revokeImagePreviewURL,
  validateImageAttachmentFile
} from '@/app/ai/attachment/image/prepare'
import { MAX_IMAGE_ATTACHMENTS, type ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import { prepareTextAttachment } from '@/app/ai/attachment/text/prepare'
import type { TextAttachmentDraft } from '@/app/ai/attachment/text/types'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'

interface DraftState {
  images: Ref<ImageAttachmentDraft[]>
  textFiles: Ref<TextAttachmentDraft[]>
  pending: Ref<number>
  generation: number
  reportError: (message: string) => void
}

async function addFile(state: DraftState, file: File, generation: number): Promise<void> {
  if (!isAttachableImageFile(file)) {
    const prepared = await prepareTextAttachment(file)
    if (generation === state.generation) state.textFiles.value.push(prepared)
    return
  }
  const image = isSVGFile(file) ? await rasterizeSVGAttachment(file) : file
  if (generation !== state.generation) return
  if (state.images.value.length >= MAX_IMAGE_ATTACHMENTS) {
    state.reportError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`)
    return
  }
  const error = validateImageAttachmentFile(image)
  if (error) state.reportError(error)
  else
    state.images.value.push({
      file: image,
      previewURL: createImagePreviewURL(image)
    })
}

async function addFiles(state: DraftState, files: File[]): Promise<void> {
  const generation = state.generation
  state.pending.value++
  try {
    for (const file of files) {
      if (generation !== state.generation) return
      try {
        await addFile(state, file, generation)
      } catch (error) {
        if (generation === state.generation) {
          state.reportError(error instanceof Error ? error.message : String(error))
        }
      }
    }
  } finally {
    state.pending.value--
  }
}

function takeDraft(state: DraftState) {
  state.generation++
  const draft = { images: state.images.value, files: state.textFiles.value }
  state.images.value = []
  state.textFiles.value = []
  return draft
}

function clearDraft(state: DraftState): void {
  const draft = takeDraft(state)
  for (const image of draft.images) revokeImagePreviewURL(image.previewURL)
}

function restoreDraft(state: DraftState, submission: ChatSubmission): void {
  state.images.value = [...submission.images, ...state.images.value]
  state.textFiles.value = [...(submission.files ?? []), ...state.textFiles.value]
}

function removeImage(state: DraftState, index: number): void {
  revokeImagePreviewURL(state.images.value[index].previewURL)
  state.images.value.splice(index, 1)
}

export function createAttachmentDrafts(reportError: DraftState['reportError']) {
  const state: DraftState = {
    images: ref([]),
    textFiles: ref([]),
    pending: ref(0),
    generation: 0,
    reportError
  }
  return {
    images: state.images,
    textFiles: state.textFiles,
    preparing: computed(() => state.pending.value > 0),
    addFiles: (files: File[]) => addFiles(state, files),
    take: () => takeDraft(state),
    clear: () => clearDraft(state),
    restore: (submission: ChatSubmission) => restoreDraft(state, submission),
    removeImage: (index: number) => removeImage(state, index),
    removeTextFile: (index: number) => state.textFiles.value.splice(index, 1)
  }
}
