import { expect, test } from 'bun:test'

import { createToolDescriptors } from '#mcp/tool/manifest'
import { readToolPolicyFromEnv, applyToolPolicy } from '#mcp/tool/policy'

import { ownedClient } from '../helpers/client'

test('real MCP advertises URI save alongside its existing file-save interface', async () => {
  const owned = await ownedClient()
  try {
    const listed = await owned.client.listTools()
    const save = listed.tools.find((tool) => tool.name === 'save')
    expect(save).toBeDefined()
    expect(save?.inputSchema.required).toEqual(['uri'])
    expect(save?.inputSchema.properties?.uri).toMatchObject({ type: 'string' })
    expect(save?.inputSchema.additionalProperties).toBe(false)
    expect(save?.annotations?.readOnlyHint).toBe(false)
    expect(listed.tools.some((tool) => tool.name === 'save_file')).toBe(true)
  } finally {
    await owned.close()
  }
})

test.each(['save', 'save_file'])('disabling %s omits both save entry points', async (name) => {
  const owned = await ownedClient({ disabledTools: [name] })
  try {
    const listed = await owned.client.listTools()
    expect(listed.tools.some((tool) => tool.name === 'save')).toBe(false)
    expect(listed.tools.some((tool) => tool.name === 'save_file')).toBe(false)
    await expect(
      owned.client.callTool({ name: 'save', arguments: { uri: 'file:///owned-save.pen' } })
    ).rejects.toThrow()
    await expect(owned.client.callTool({ name: 'save_file', arguments: {} })).rejects.toThrow()
  } finally {
    await owned.close()
  }
})

test('the HTTP entry policy flag omits both save interfaces with eval still denied', () => {
  const policy = readToolPolicyFromEnv({}, ['--disable_save_tool'])
  const enabled = applyToolPolicy(createToolDescriptors(true), policy).filter(
    (tool) => tool.enabled
  )
  expect(enabled.some((tool) => tool.name === 'save')).toBe(false)
  expect(enabled.some((tool) => tool.name === 'save_file')).toBe(false)
  expect(enabled.some((tool) => tool.name === 'eval')).toBe(false)
  expect(enabled.some((tool) => tool.name === 'get_app_state')).toBe(true)
})

test('URI Save reports no application instead of claiming a write succeeded', async () => {
  const owned = await ownedClient()
  try {
    const result = await owned.client.callTool({
      name: 'save',
      arguments: { uri: 'file:///owned.pen' }
    })
    expect(result.isError).toBe(true)
  } finally {
    await owned.close()
  }
})
