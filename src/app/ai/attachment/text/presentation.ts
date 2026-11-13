import type { TextPresentation } from '@/app/ai/attachment/presentation/types'

import type { TextAttachmentDraft } from './types'

export function textPresentations(
  messageId: string,
  files: TextAttachmentDraft[]
): TextPresentation[] {
  return files.map(({ file, text }) => ({
    id: crypto.randomUUID(),
    messageId,
    kind: 'file',
    name: file.name,
    mediaType: file.type || 'text/plain',
    preview: file,
    text
  }))
}
