import { createHistoryActions } from '@/app/ai/chat/submission/history-actions'
import { createSubmissionLifecycle } from '@/app/ai/chat/submission/submit'
import type { SubmissionOptions } from '@/app/ai/chat/submission/types'
import { useUndoRecords } from '@/app/ai/reply/undo'

export function useChatSubmission(options: SubmissionOptions) {
  const undone = useUndoRecords(options)
  const lifecycle = createSubmissionLifecycle(options, undone)
  const actions = createHistoryActions({
    options,
    readyChat: lifecycle.readyChat,
    undone
  })
  return {
    ...actions,
    busy: lifecycle.busy,
    cancel: lifecycle.cancel,
    stop: () => options.chat.value?.stop(),
    submit: lifecycle.submit
  }
}
