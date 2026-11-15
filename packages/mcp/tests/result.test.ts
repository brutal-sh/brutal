import { expect, test } from 'bun:test'

import { MAX_RESULT_BYTES, okText } from '#mcp/result'

test('plain text MCP results retain Markdown without JSON quoting', () => {
  const text = '# Owned guide\n\nA literal "quote" and a newline.\n'
  expect(okText(text, 'read_skill')).toEqual({ content: [{ type: 'text', text }] })
})

test('plain text result limits count UTF-8 bytes and preserve the boundary', () => {
  const text = '\u{1F58A}'.repeat(MAX_RESULT_BYTES / 4)
  expect(new TextEncoder().encode(text).byteLength).toBe(MAX_RESULT_BYTES)
  expect(okText(text, 'read_skill').isError).not.toBe(true)
  const rejected = okText(`${text}\u{1F58A}`, 'read_skill')
  expect(rejected.isError).toBe(true)
  expect(new TextEncoder().encode(JSON.stringify(rejected)).byteLength).toBeLessThan(1_000)
})
