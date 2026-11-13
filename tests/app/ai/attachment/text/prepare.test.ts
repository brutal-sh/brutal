import { expect, test } from 'bun:test'

import { withTextAttachments } from '@/app/ai/attachment/text/context'
import { MAX_TEXT_ATTACHMENT_BYTES, prepareTextAttachment } from '@/app/ai/attachment/text/prepare'
import { textPresentations } from '@/app/ai/attachment/text/presentation'

test('text and source files retain Unicode, whitespace and literal markup', async () => {
  const text = '\ufeff  café 🟢\r\n<script>alert("context")</script>\n'
  for (const name of ['reference.txt', 'component.vue', 'module.ts']) {
    const draft = await prepareTextAttachment(new File([text], name))
    expect(draft.text).toBe(text)
    const modelText = withTextAttachments('Inspect the file', [draft])
    expect(modelText).toStartWith('Inspect the file\n\n')
    expect(modelText).toEndWith(JSON.stringify([{ name, mediaType: 'text/plain', text }]))
    const [presentation] = textPresentations('request-1', [draft])
    expect(presentation.kind).toBe('file')
    expect(presentation.text).toBe(text)
    expect(new Uint8Array(await presentation.preview.arrayBuffer())).toEqual(
      new TextEncoder().encode(text)
    )
  }
})

test('empty text is valid and a request without files stays exact', async () => {
  const draft = await prepareTextAttachment(new File([], 'empty.md'))
  expect(draft.text).toBe('')
  expect(withTextAttachments('Keep this exact', [])).toBe('Keep this exact')
})

test('unsupported, binary, invalid UTF-8 and oversized files are refused', async () => {
  const files = [
    new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' }),
    new File([new Uint8Array([65, 0, 66])], 'binary.txt'),
    new File([new Uint8Array([0xc3, 0x28])], 'invalid.txt'),
    new File([new Uint8Array(MAX_TEXT_ATTACHMENT_BYTES + 1)], 'large.txt')
  ]
  for (const file of files) await expect(prepareTextAttachment(file)).rejects.toThrow()
})
