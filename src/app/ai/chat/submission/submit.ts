import { computed, markRaw, ref, type Ref } from 'vue'

import { withTextAttachments } from '@/app/ai/attachment/text/context'
import { appendSkillContext } from '@/app/ai/chat/context'
import { setVisibleMessageText } from '@/app/ai/chat/presentation'
import { sendAttachments } from '@/app/ai/chat/submission/attachments'
import { reportSubmissionError } from '@/app/ai/chat/submission/errors'
import type {
  ChatInstance,
  ChatSubmission,
  SubmissionOptions,
  SubmissionUndo
} from '@/app/ai/chat/submission/types'
import { invokedSkill } from '@/app/ai/skills/invoke'

interface SubmissionContext {
  options: SubmissionOptions
  undone: SubmissionUndo
  preparing: Ref<boolean>
  version: number
}

async function sendText(
  context: SubmissionContext,
  chat: ChatInstance,
  message: ChatSubmission
): Promise<void> {
  const previous = new Set(chat.messages.map((entry) => entry.id))
  await context.undone.withTurn(chat, () =>
    chat.sendMessage({ text: message.modelText }).catch(() => undefined)
  )
  const request = chat.messages.find((entry) => entry.role === 'user' && !previous.has(entry.id))
  if (request) setVisibleMessageText(request.id, message.displayText)
}

function hasFiles(submission: ChatSubmission): boolean {
  return submission.images.length > 0 || Boolean(submission.files?.length)
}

function plainSubmission(submission: ChatSubmission): boolean {
  return !hasFiles(submission) && submission.nodes.length === 0
}

function reportUnsent(context: SubmissionContext, submission: ChatSubmission): void {
  if (hasFiles(submission))
    context.options.reportError(context.options.messages.value.requestFailed)
}

async function prepareSend(
  context: SubmissionContext,
  submission: ChatSubmission,
  version: number,
  dispatch: () => void
): Promise<boolean> {
  const { options, undone } = context
  const skill = await invokedSkill(submission.displayText)
  const chat = await options.ensureChat()
  if (chat && version === context.version) options.chat.value = markRaw(chat)
  if (!chat || version !== context.version) {
    reportUnsent(context, submission)
    return false
  }
  const note = undone.note(submission.modelText, chat.messages)
  const message = {
    ...submission,
    modelText: withTextAttachments(appendSkillContext(note.text, skill), submission.files ?? [])
  }
  const previous = new Set(chat.messages.map((entry) => entry.id))
  if (plainSubmission(submission)) {
    dispatch()
    await sendText(context, chat, message)
  } else {
    await sendAttachments(
      {
        editor: options.getEditor(),
        withTurn: undone.withTurn,
        isCurrent: () => version === context.version && options.chat.value === chat
      },
      chat,
      message,
      dispatch
    )
  }
  const request = chat.messages.find((entry) => entry.role === 'user' && !previous.has(entry.id))
  if (request) undone.reported(chat, note.reports, request.id)
  return true
}

async function submit(context: SubmissionContext, submission: ChatSubmission): Promise<boolean> {
  const { options } = context
  const status = options.chat.value?.status ?? 'ready'
  if (status === 'streaming' || status === 'submitted' || context.preparing.value) {
    reportUnsent(context, submission)
    return false
  }
  const version = ++context.version
  let sent = false
  const dispatch = () => {
    sent = true
  }
  context.preparing.value = submission.images.length > 0
  options.clearFailure()
  try {
    return await prepareSend(context, submission, version, dispatch)
  } catch (error) {
    reportSubmissionError(options, error)
    return sent
  } finally {
    await options.flush?.().catch(() => undefined)
    if (version === context.version) context.preparing.value = false
  }
}

function readyChat(context: SubmissionContext): ChatInstance | null {
  const chat = context.options.chat.value
  if (!chat || context.preparing.value) return null
  return chat.status === 'ready' || chat.status === 'error' ? chat : null
}

export function createSubmissionLifecycle(options: SubmissionOptions, undone: SubmissionUndo) {
  const context: SubmissionContext = {
    options,
    undone,
    preparing: ref(false),
    version: 0
  }
  return {
    busy: computed(() => context.preparing.value),
    submit: (submission: ChatSubmission) => submit(context, submission),
    readyChat: () => readyChat(context),
    cancel: () => {
      context.version++
      context.preparing.value = false
    }
  }
}
