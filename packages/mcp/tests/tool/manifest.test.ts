import { expect, test } from 'bun:test'

import { createToolDescriptors } from '#mcp/tool/manifest'

test('tool catalogs have independent mutable descriptors and capabilities', () => {
  const first = createToolDescriptors(true)
  const entry = first.find((tool) => tool.name === 'save')
  if (!entry) throw new Error('Missing Save descriptor')
  entry.description = 'Owned caller mutation'
  entry.capabilities.length = 0
  const second = createToolDescriptors(true).find((tool) => tool.name === 'save')
  expect(second?.description).not.toBe('Owned caller mutation')
  expect(second?.capabilities).toContain('filesystem:write')
})
