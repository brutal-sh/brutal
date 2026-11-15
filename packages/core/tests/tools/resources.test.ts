import { expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

function resourceTool() {
  const tool = ALL_TOOLS.find((entry) => entry.name === 'read_skill')
  if (!tool) throw new Error('Missing read_skill tool')
  return tool
}

test('bundled skill links resolve without changing the document', () => {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  figma.createRectangle().name = 'Preserve me'
  const before = structuredClone([...graph.getAllNodes()])
  const tool = resourceTool()
  const index = tool.execute(figma, {})
  expect(typeof index).toBe('string')
  if (typeof index !== 'string') throw new Error('Expected Markdown resource')
  const links = [...index.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1])
  expect(links.length).toBeGreaterThan(0)
  for (const path of links) {
    const text = tool.execute(figma, { path })
    expect(typeof text).toBe('string')
    expect(new TextEncoder().encode(String(text)).byteLength).toBeLessThan(64_000)
  }
  expect(tool.execute(figma, { path: 'SKILL.md' })).toBe(index)
  expect(tool.mutates).toBe(false)
  expect(tool.capabilities).toEqual([])
  expect([...graph.getAllNodes()]).toEqual(before)
})

test.each([
  '../SKILL.md',
  '/etc/passwd',
  'file:///etc/passwd',
  'C:\\Users\\private.txt',
  '%2e%2e/SKILL.md',
  'guide/../../SKILL.md',
  '__proto__',
  'constructor',
  'unknown.md'
])('unknown resource %s cannot escape the bundle', (path) => {
  const figma = new FigmaAPI(new SceneGraph())
  expect(() => resourceTool().execute(figma, { path })).toThrow(/Unknown Open Pen skill resource/)
})

test.each([{ path: '' }, { path: 'x'.repeat(201) }, { path: 3 }, { unexpected: true }])(
  'rejects malformed resource arguments: %j',
  (args) => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(() => resourceTool().execute(figma, args)).toThrow(/Invalid arguments for read_skill/)
  }
)
