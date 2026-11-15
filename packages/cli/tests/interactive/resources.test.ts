import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readSkillResource } from '@open-pencil/core/tools'

import { parseInteractiveCall } from '#cli/interactive/parse'
import { createInteractiveSession } from '#cli/interactive/session'

test('resource reads and refusals preserve live edits and the prior output until explicit save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-resource-session-'))
  const output = join(dir, 'prior.pen')
  const prior = 'Owned prior output'
  await writeFile(output, prior, { mode: 0o640 })
  const session = await createInteractiveSession({ output })
  const call = (source: string) => session.run(parseInteractiveCall(source))
  try {
    await call('create_shape({type:"RECTANGLE",name:"Retained",x:0,y:0,width:64,height:64})')
    const before = await call('get_page_tree()')
    expect((await call('read_skill()')).result).toBe(readSkillResource())
    await expect(call('read_skill({path:"../SKILL.md"})')).rejects.toThrow()
    await expect(call('read_skill({path:3})')).rejects.toThrow()
    expect((await call('read_skill({path:"execute.md"})')).result).toBe(
      readSkillResource('execute.md')
    )
    expect(await call('get_page_tree()')).toEqual(before)
    expect(await readFile(output, 'utf8')).toBe(prior)
    if (process.platform !== 'win32') expect((await stat(output)).mode & 0o777).toBe(0o640)
    await call('exit()')
    expect(await readFile(output, 'utf8')).toBe(prior)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
