import * as v from 'valibot'

import { defineTool } from '#core/tools/schema'

import execute from './execute.md?raw'
import webApp from './guide/web-app.md?raw'
import penSchema from './pen-schema.md?raw'
import skill from './SKILL.md?raw'

const resources: ReadonlyMap<string, string> = new Map([
  ['SKILL.md', skill],
  ['execute.md', execute],
  ['pen-schema.md', penSchema],
  ['guide/web-app.md', webApp]
])

/** Bundled first-party guidance; resource names never reach the filesystem. */
export function readSkillResource(path = 'SKILL.md'): string {
  const text = resources.get(path)
  if (text === undefined) throw new Error(`Unknown Brutal skill resource: ${path}`)
  return text
}

export const readSkill = defineTool({
  name: 'read_skill',
  description:
    'Read bundled Brutal design guidance. Omit path for the index, or use a relative resource name linked from it.',
  execution: { kind: 'sync', mutation: 'none' },
  capabilities: [],
  input: v.strictObject({
    path: v.optional(
      v.pipe(v.string(), v.minLength(1), v.maxLength(200), v.description('Bundled resource name'))
    )
  }),
  execute: (_figma, { path }) => readSkillResource(path)
})
