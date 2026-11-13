import { expect, setDefaultTimeout, test } from 'bun:test'
import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadDocument } from '#cli/headless'
import { parseInteractiveCall } from '#cli/interactive/parse'
import { createInteractiveSession } from '#cli/interactive/session'

setDefaultTimeout(60_000)

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-session-'))
  const output = join(dir, 'output.pen')
  const session = await createInteractiveSession({ output })
  return { dir, output, session }
}

test('a failed mutating tool restores earlier edits before the next save', async () => {
  const { dir, output, session } = await fixture()
  const call = (source: string) => session.run(parseInteractiveCall(source))
  try {
    await call("create_shape({type:'RECTANGLE',name:'Retained',x:0,y:0,width:64,height:64})")
    const before = await call('get_page_tree()')
    const code =
      "figma.createRectangle().name='Failed partial edit';throw new Error('Owned failure')"
    await expect(call(`eval({code:${JSON.stringify(code)}})`)).rejects.toThrow('Owned failure')
    expect(await call('get_page_tree()')).toEqual(before)
    await expect(call('create_shape({type:"INVALID"})')).rejects.toThrow()
    await expect(call('get_node({id:"missing"})')).rejects.toThrow('not found')
    expect(await call('get_page_tree()')).toEqual(before)
    await call('save()')
    const graph = await loadDocument(output)
    expect([...graph.getAllNodes()].some((n) => n.name === 'Failed partial edit')).toBe(false)
    expect(
      [...graph.getAllNodes()].filter((n) => n.type === 'RECTANGLE' && n.name === 'Retained')
    ).toHaveLength(1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a refused read does not reflow an untouched stored Hug extent', async () => {
  const { dir, session } = await fixture()
  const call = (source: string) => session.run(parseInteractiveCall(source))
  const code = `
    const row = figma.createFrame(); row.name = 'Stored Hug';
    row.layoutMode = 'HORIZONTAL'; row.primaryAxisSizingMode = 'AUTO';
    const child = figma.createRectangle(); child.resize(50, 40); row.appendChild(child);
    void row.width;
    figma.graph.getNode(row.id).width = 100;
    return row.id;
  `
  try {
    const { result: id } = await call(`eval({code:${JSON.stringify(code)}})`)
    if (typeof id !== 'string') throw new Error('Expected owned row ID')
    const read = `eval({code:${JSON.stringify(`figma.getNodeById(${JSON.stringify(id)}).width`)}})`
    expect((await call(read)).result).toBe(100)
    await expect(call('get_node({id:"missing"})')).rejects.toThrow('not found')
    expect((await call(read)).result).toBe(100)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a failed connector removal restores the routing index in the live session', async () => {
  const { dir, session } = await fixture()
  const call = (source: string) => session.run(parseInteractiveCall(source))
  try {
    const created = await call('eval({code:"figma.createConnector().id"})')
    if (typeof created.result !== 'string') throw new Error('Expected owned connector ID')
    const before = await call('eval({code:"[...figma.graph.connectorIds]"})')
    const code = `figma.getNodeById(${JSON.stringify(created.result)}).remove(); throw new Error('Owned edge failure')`
    await expect(call(`eval({code:${JSON.stringify(code)}})`)).rejects.toThrow('Owned edge failure')
    expect(await call('eval({code:"[...figma.graph.connectorIds]"})')).toEqual(before)
    expect((await call('get_page_tree()')).result).toBeDefined()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === 'win32')(
  'a refused save retains the prior file and live edits for retry',
  async () => {
    const { dir, output, session } = await fixture()
    const call = (source: string) => session.run(parseInteractiveCall(source))
    await writeFile(output, 'owned prior document')
    await chmod(output, 0o640)
    try {
      await call("create_shape({type:'RECTANGLE',name:'Retry',x:0,y:0,width:64,height:64})")
      const before = await call('get_page_tree()')
      await chmod(dir, 0o500)
      await expect(call('save()')).rejects.toThrow()
      expect(await readFile(output, 'utf8')).toBe('owned prior document')
      expect(await readdir(dir)).toEqual(['output.pen'])
      expect((await stat(output)).mode & 0o777).toBe(0o640)
      expect(await call('get_page_tree()')).toEqual(before)
      await chmod(dir, 0o700)
      await call('save()')
      const graph = await loadDocument(output)
      expect(
        [...graph.getAllNodes()].filter((n) => n.type === 'RECTANGLE' && n.name === 'Retry')
      ).toHaveLength(1)
      expect((await stat(output)).mode & 0o777).toBe(0o640)
    } finally {
      await chmod(dir, 0o700)
      await rm(dir, { recursive: true, force: true })
    }
  }
)
