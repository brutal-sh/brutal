import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { scriptErrorGraph } from '@/app/document/scripts/status'

test('a tiny Script retains its error background and fits diagnostic content inside its inset', async () => {
  const graph = await scriptErrorGraph(
    new IORegistry(BUILTIN_IO_FORMATS),
    { width: 17, height: 200 },
    {
      title: 'Script runtime error',
      description: 'Independent failure'
    }
  )
  expect(graph.getNode('error-background')?.fills[0]).toMatchObject({
    color: { r: 1, g: 0.4, b: 0.4 }
  })
  const content = graph.getNode('error-status')
  expect(content?.width).toBeCloseTo(1, 5)
  expect(content?.x).toBeCloseTo(8, 5)
  expect((content?.y ?? -1) >= 8).toBe(true)
  const empty = await scriptErrorGraph(
    new IORegistry(BUILTIN_IO_FORMATS),
    { width: 0, height: 0 },
    {
      title: 'Script runtime error',
      description: 'Independent failure'
    }
  )
  expect(empty.getNode('error-background')).toBeDefined()
  expect(empty.getNode('error-status')).toBeUndefined()
})
