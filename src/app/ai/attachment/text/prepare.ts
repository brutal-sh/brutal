import type { TextAttachmentDraft } from './types'

// shortcut: bound text decoding at 1 MB; revisit after measuring the reference upload limit.
export const MAX_TEXT_ATTACHMENT_BYTES = 1024 * 1024
const SOURCE_EXTENSIONS =
  /\.(?:txt|md|mdx|markdown|json|jsonc|yaml|yml|toml|csv|tsv|xml|html|css|scss|less|js|jsx|mjs|cjs|ts|tsx|vue|svelte|py|rb|rs|go|java|kt|swift|c|h|cpp|hpp|cs|sh|bash|zsh|sql|graphql|gql)$/i
const TEXT_MEDIA_TYPES = new Set([
  'application/json',
  'application/javascript',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/toml',
  'application/typescript'
])

export async function prepareTextAttachment(file: File): Promise<TextAttachmentDraft> {
  if (
    !file.type.startsWith('text/') &&
    !TEXT_MEDIA_TYPES.has(file.type) &&
    !SOURCE_EXTENSIONS.test(file.name)
  ) {
    throw new Error('Choose a UTF-8 text or source file.')
  }
  if (file.size > MAX_TEXT_ATTACHMENT_BYTES) {
    throw new Error('Text attachments must be 1 MB or smaller.')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.includes(0)) throw new Error('The selected file contains binary data.')
  try {
    return {
      file,
      text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    }
  } catch {
    throw new Error('The selected file is not valid UTF-8 text.')
  }
}
