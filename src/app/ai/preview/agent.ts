import type { Run } from '@/app/ai/reply/run'
import type { AutomationTarget } from '@/app/automation/bridge/target'

import { createCanvasJSXPreview, type PreviewFocus } from './canvas'
import { parsePreviewInput } from './input'

interface Draft {
  pageId: string
  preview: ReturnType<typeof createCanvasJSXPreview>
}

const drafts = new WeakMap<Run, Draft>()
const DRAFT_ID = 'agent-draft'

export function clearAgentDraft(run: Run): void {
  const draft = drafts.get(run)
  drafts.delete(run)
  draft?.preview.clear()
}

export async function showAgentDraft(
  run: Run,
  target: AutomationTarget,
  args: unknown,
  onFocus: (focus: PreviewFocus) => void,
  signal?: AbortSignal
): Promise<unknown> {
  const input = parsePreviewInput(args)
  if (!input) return { error: 'A draft requires render JSX and a valid placement.' }

  let draft = drafts.get(run)
  if (draft?.pageId !== target.pageId) {
    clearAgentDraft(run)
    draft = {
      pageId: target.pageId,
      preview: createCanvasJSXPreview(target.store, () => target.pageId, { onFocus })
    }
    drafts.set(run, draft)
  }
  const shown = await draft.preview.replace(DRAFT_ID, JSON.stringify(input), signal)
  return shown
    ? { preview: true, message: 'Draft is visible. Call render to commit the finished JSX.' }
    : { error: 'The draft could not be displayed. Check the JSX and the current page.' }
}
