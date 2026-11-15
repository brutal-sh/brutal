import { expect, test } from 'bun:test'

import * as v from 'valibot'

import { ownedClient } from '../helpers/client'

const resultSchema = v.looseObject({
  isError: v.optional(v.boolean()),
  content: v.array(v.object({ type: v.literal('text'), text: v.string() }))
})

test('real MCP advertises read-only state and refuses an absent app without a fallback', async () => {
  const owned = await ownedClient()
  try {
    const listed = await owned.client.listTools()
    const tool = listed.tools.find((tool) => tool.name === 'get_app_state')
    expect(tool?.annotations?.readOnlyHint).toBe(true)
    const result = v.parse(
      resultSchema,
      await owned.client.callTool({ name: 'get_app_state', arguments: {} })
    )
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('not connected')
    const retry = v.parse(
      resultSchema,
      await owned.client.callTool({ name: 'read_skill', arguments: {} })
    )
    expect(retry.isError).not.toBe(true)
  } finally {
    await owned.close()
  }
})

test.each(['selection', 'disabled'])(
  'real MCP retains its access boundary for app state: %s',
  async (mode) => {
    const owned = await ownedClient(
      mode === 'selection' ? { scope: 'selection' } : { disabledTools: ['get_app_state'] }
    )
    try {
      const listed = await owned.client.listTools()
      expect(listed.tools.some((tool) => tool.name === 'get_app_state')).toBe(false)
      await expect(
        owned.client.callTool({ name: 'get_app_state', arguments: {} })
      ).rejects.toThrow()
    } finally {
      await owned.close()
    }
  }
)
