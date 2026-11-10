import { expect, spyOn, test } from 'bun:test'

import { loadFragmentSource } from '@/app/document/shaders/source'

test('explicit shader URL loading omits credentials and rejects oversized or invalid source bytes', async () => {
  const fetcher = spyOn(globalThis, 'fetch')
  const previousCalls = fetcher.mock.calls.length
  try {
    fetcher.mockResolvedValueOnce(new Response('void main(){}'))
    const shader = await loadFragmentSource('https://example.test/checks.glsl')
    expect(shader.source).toBe('void main(){}')
    expect(fetcher.mock.calls.slice(previousCalls)).toEqual([
      ['https://example.test/checks.glsl', expect.objectContaining({ credentials: 'omit' })]
    ])
    fetcher.mockResolvedValueOnce(
      new Response('small', { headers: { 'content-length': '2000000' } })
    )
    await expect(loadFragmentSource('https://example.test/checks.glsl')).rejects.toThrow()
    fetcher.mockResolvedValueOnce(new Response(new Uint8Array([255])))
    await expect(loadFragmentSource('https://example.test/checks.glsl')).rejects.toThrow()
  } finally {
    fetcher.mockRestore()
  }
})
