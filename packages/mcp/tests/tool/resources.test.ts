import { expect, test } from 'bun:test'

import * as v from 'valibot'

import { readSkillResource } from '@open-pencil/core/tools'

import { ownedClient } from '../helpers/client'

const resourceResultSchema = v.looseObject({
  isError: v.optional(v.boolean()),
  content: v.array(v.object({ type: v.literal('text'), text: v.string() }))
})

test('real MCP serves bundled Markdown without an app or document connection', async () => {
  const owned = await ownedClient()
  try {
    const listed = await owned.client.listTools()
    expect(listed.tools.find((tool) => tool.name === 'read_skill')?.annotations?.readOnlyHint).toBe(
      true
    )
    for (const args of [{}, { path: 'execute.md' }, { path: 'pen-schema.md' }]) {
      const result = v.parse(
        resourceResultSchema,
        await owned.client.callTool({ name: 'read_skill', arguments: args })
      )
      if (result.isError) throw new Error(`Resource MCP refusal: ${result.content[0]?.text}`)
      expect(result.isError).not.toBe(true)
      expect(result.content).toEqual([{ type: 'text', text: readSkillResource(args.path) }])
    }
  } finally {
    await owned.close()
  }
})

test('selection scope retains its existing tool boundary for bundled guidance', async () => {
  const owned = await ownedClient({ scope: 'selection' })
  try {
    const listed = await owned.client.listTools()
    expect(listed.tools.some((tool) => tool.name === 'read_skill')).toBe(false)
    await expect(owned.client.callTool({ name: 'read_skill', arguments: {} })).rejects.toThrow()
  } finally {
    await owned.close()
  }
})

test('real MCP rejects unknown and escaping resources without a filesystem root', async () => {
  const owned = await ownedClient()
  try {
    for (const path of ['../SKILL.md', '/etc/passwd', 'file:///etc/passwd', '__proto__']) {
      const result = v.parse(
        resourceResultSchema,
        await owned.client.callTool({ name: 'read_skill', arguments: { path } })
      )
      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0]?.text).not.toBe(readSkillResource())
    }
    const retry = v.parse(
      resourceResultSchema,
      await owned.client.callTool({ name: 'read_skill', arguments: {} })
    )
    expect(retry.isError).not.toBe(true)
    expect(retry.content).toEqual([{ type: 'text', text: readSkillResource() }])
  } finally {
    await owned.close()
  }
})

test('disabled resource tools are neither advertised nor callable', async () => {
  const owned = await ownedClient({ disabledTools: ['read_skill'] })
  try {
    const listed = await owned.client.listTools()
    expect(listed.tools.some((tool) => tool.name === 'read_skill')).toBe(false)
    await expect(owned.client.callTool({ name: 'read_skill', arguments: {} })).rejects.toThrow()
  } finally {
    await owned.close()
  }
})

test('resource arguments cannot add document targeting or malformed names', async () => {
  const owned = await ownedClient()
  try {
    for (const args of [
      { document_id: 'unrelated-document' },
      { page_id: 'unrelated-page' },
      { path: 3 },
      { path: '' },
      { path: 'x'.repeat(201) }
    ]) {
      const result = v.parse(
        resourceResultSchema,
        await owned.client.callTool({ name: 'read_skill', arguments: args })
      )
      expect(result.isError).toBe(true)
    }
  } finally {
    await owned.close()
  }
})
