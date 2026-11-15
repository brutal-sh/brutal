import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

import { parseInteractiveCall } from '#cli/interactive/parse'
import { createInteractiveSession } from '#cli/interactive/session'

const createdSchema = v.object({ id: v.string() })

test('headless selection is atomic and keeps the graph and existing output untouched', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-selection-'))
  const output = join(dir, 'prior.pen')
  await writeFile(output, 'Owned prior output', { mode: 0o640 })
  const session = await createInteractiveSession({ output })
  const call = (source: string) => session.run(parseInteractiveCall(source))
  try {
    const created = await call(
      'create_shape({type:"RECTANGLE",name:"Retained",x:0,y:0,width:64,height:64})'
    )
    const { id } = v.parse(createdSchema, created.result)
    const before = await call('get_page_tree()')
    expect((await call(`select_nodes({ids:${JSON.stringify([id, id])}})`)).result).toEqual({
      selected: [id]
    })
    const selection = await call('get_selection()')
    await expect(
      call(`select_nodes({ids:${JSON.stringify([id, 'missing-owned-node'])}})`)
    ).rejects.toThrow()
    expect(await call('get_selection()')).toEqual(selection)
    expect(await call('get_page_tree()')).toEqual(before)
    await call('exit()')
    expect(await readFile(output, 'utf8')).toBe('Owned prior output')
    if (process.platform !== 'win32') expect((await stat(output)).mode & 0o777).toBe(0o640)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
