import { expect, test } from 'bun:test'

import { ownedClient } from '../helpers/client'

test('real MCP refuses selection without an app and remains usable afterward', async () => {
  const owned = await ownedClient()
  try {
    expect(
      (await owned.client.listTools()).tools.some((tool) => tool.name === 'select_nodes')
    ).toBe(true)
    const refused = await owned.client.callTool({
      name: 'select_nodes',
      arguments: { ids: ['owned-missing-node'] }
    })
    expect(refused.isError).toBe(true)
    expect((await owned.client.callTool({ name: 'read_skill', arguments: {} })).isError).not.toBe(
      true
    )
  } finally {
    await owned.close()
  }
})

test.each(['selection', 'disabled'])(
  'real MCP does not expose or execute selection outside its allowed policy: %s',
  async (mode) => {
    const owned = await ownedClient(
      mode === 'selection' ? { scope: 'selection' } : { disabledTools: ['select_nodes'] }
    )
    try {
      const listed = await owned.client.listTools()
      expect(listed.tools.some((tool) => tool.name === 'select_nodes')).toBe(false)
      await expect(
        owned.client.callTool({
          name: 'select_nodes',
          arguments: { ids: ['owned-missing-node'] }
        })
      ).rejects.toThrow()
    } finally {
      await owned.close()
    }
  }
)
