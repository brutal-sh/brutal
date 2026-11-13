import { snapshotNodes } from '@/app/ai/attachment/node/snapshot'
import { setMessageAttachments } from '@/app/ai/attachment/presentation/store'
import { appendSkillContext } from '@/app/ai/chat/context'
import { setVisibleMessageText } from '@/app/ai/chat/presentation'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import { chatToResend } from '@/app/ai/chat/submission/resend'
import type {
  ChatInstance,
  SubmissionOptions,
  SubmissionUndo
} from '@/app/ai/chat/submission/types'
import { restoreTurn, revertTurn } from '@/app/ai/reply/turns'
import { invokedSkill } from '@/app/ai/skills/invoke'

interface ActionContext {
  options: SubmissionOptions
  readyChat: () => ChatInstance | null
  undone: SubmissionUndo
}

async function restore(context: ActionContext, messageId: string): Promise<void> {
  const { options, readyChat } = context
  if (!readyChat() || !restoreTurn(messageId)) return
  await options.flush?.().catch(() => undefined)
}

async function revert(context: ActionContext, messageId: string): Promise<void> {
  const { options, readyChat } = context
  if (!readyChat() || !revertTurn(messageId)) return
  await options.flush?.().catch(() => undefined)
}

async function regenerate(context: ActionContext): Promise<void> {
  const { options, readyChat, undone } = context
  const { withTurn } = undone
  const currentChat = await chatToResend(options, readyChat())
  const last = currentChat?.messages.at(-1)
  if (!currentChat || !last) return
  options.clearFailure()
  if (last.role === 'assistant') revertTurn(last.id)
  try {
    await withTurn(currentChat, () =>
      currentChat.regenerate({ messageId: last.id }).catch(() => undefined)
    )
  } finally {
    await options.flush?.().catch(() => undefined)
  }
}

async function resend(context: ActionContext, messageId: string, text: string): Promise<void> {
  const { options, readyChat, undone } = context
  const { withTurn } = undone
  const currentChat = await chatToResend(options, readyChat())
  const trimmed = text.trim()
  if (!currentChat || !trimmed) return
  const index = currentChat.messages.findIndex((message) => message.id === messageId)
  const later = currentChat.messages.slice(index + 1)
  if (index === -1 || later.some((message) => message.role === 'user')) return
  options.clearFailure()
  for (const message of later) if (message.role === 'assistant') revertTurn(message.id)
  // Replies after the edited message are replaced; what it reported needs a new report.
  const note = undone.note(trimmed, currentChat.messages.slice(0, index))
  const skill = await invokedSkill(trimmed)
  setVisibleMessageText(messageId, trimmed)
  // The layers the edited text mentions replace the previews the message showed.
  const editor = options.getEditor()
  setMessageAttachments(
    messageId,
    snapshotNodes(editor, messageId, mentionedNodes(editor.graph, trimmed))
  )
  try {
    await withTurn(currentChat, () =>
      currentChat
        .sendMessage({ messageId, text: appendSkillContext(note.text, skill) })
        .catch(() => undefined)
    )
    undone.reported(currentChat, note.reports, messageId)
  } finally {
    await options.flush?.().catch(() => undefined)
  }
}

export function createHistoryActions(context: ActionContext) {
  return {
    restore: (id: string) => restore(context, id),
    revert: (id: string) => revert(context, id),
    regenerate: () => regenerate(context),
    resend: (id: string, text: string) => resend(context, id, text)
  }
}
