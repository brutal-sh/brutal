import { designMessageWithImageFindings } from '@/app/ai/attachment/image/analyze'
import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import {
  imageDraftPresentations,
  preparedImagePresentations
} from '@/app/ai/attachment/image/presentation'
import { snapshotNodes } from '@/app/ai/attachment/node/snapshot'
import {
  deleteMessageAttachments,
  setMessageAttachments
} from '@/app/ai/attachment/presentation/store'
import { textPresentations } from '@/app/ai/attachment/text/presentation'
import { setVisibleMessageText } from '@/app/ai/chat/presentation'
import { prepareSubmittedImages } from '@/app/ai/chat/submission/images'
import type { ChatInstance, ChatSubmission } from '@/app/ai/chat/submission/types'
import type { useUndoRecords } from '@/app/ai/reply/undo'
import type { EditorStore } from '@/app/editor/active-store'

interface AttachmentSendContext {
  editor: EditorStore
  isCurrent: () => boolean
  withTurn: ReturnType<typeof useUndoRecords>['withTurn']
}

function showAttachments(
  context: AttachmentSendContext,
  currentChat: ChatInstance,
  submission: ChatSubmission
) {
  const messageId = crypto.randomUUID()
  const editor = context.editor
  const nodeAttachments = [
    ...snapshotNodes(editor, messageId, submission.nodes),
    ...textPresentations(messageId, submission.files ?? [])
  ]
  currentChat.messages = [
    ...currentChat.messages,
    {
      id: messageId,
      role: 'user',
      parts: [{ type: 'text', text: submission.modelText }]
    }
  ]
  setVisibleMessageText(messageId, submission.displayText)
  const draftImages = imageDraftPresentations(messageId, submission.images)
  setMessageAttachments(messageId, [...nodeAttachments, ...draftImages])
  return { messageId, nodeAttachments }
}

export async function sendAttachments(
  context: AttachmentSendContext,
  currentChat: ChatInstance,
  submission: ChatSubmission,
  dispatch: () => void
): Promise<void> {
  const { messageId, nodeAttachments } = showAttachments(context, currentChat, submission)
  // The message previews its images from their files; the composer's previews go once sent.
  const send = () => {
    dispatch()
    for (const image of submission.images) revokeImagePreviewURL(image.previewURL)
  }

  if (submission.images.length === 0) {
    send()
    await context.withTurn(currentChat, () =>
      currentChat.sendMessage({ messageId, text: submission.modelText }).catch(() => undefined)
    )
    return
  }

  const images = await prepareSubmittedImages(
    context.editor,
    submission.modelText,
    submission.images
  ).catch((error: unknown) => {
    currentChat.messages = currentChat.messages.filter((message) => message.id !== messageId)
    deleteMessageAttachments(messageId)
    throw error
  })
  const { prepared: preparedImages, findings } = images
  if (!context.isCurrent()) return

  const normalizedImages = preparedImagePresentations(messageId, submission.images, preparedImages)
  setMessageAttachments(messageId, [...nodeAttachments, ...normalizedImages])
  send()
  await context.withTurn(currentChat, () =>
    currentChat
      .sendMessage({
        messageId,
        text: designMessageWithImageFindings(
          submission.modelText,
          submission.images.map((image) => image.file.name),
          findings
        )
      })
      .catch(() => undefined)
  )
}
