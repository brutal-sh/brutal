import instructions from './context.md?raw'
import type { TextAttachmentDraft } from './types'

export function withTextAttachments(text: string, files: TextAttachmentDraft[]): string {
  if (files.length === 0) return text
  const data = files.map(({ file, text }) => ({
    name: file.name,
    mediaType: file.type || 'text/plain',
    text
  }))
  return `${text}\n\n${instructions.trim()}\n${JSON.stringify(data)}`
}
