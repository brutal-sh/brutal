import { expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runNodeCLI } from '#cli-tests/helpers/process'

import { loadDocument } from '#cli/headless'

setDefaultTimeout(60_000)

test('the built Node interactive session saves explicitly and preserves its input', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-interactive-'))
  const source = join(dir, 'source.pen')
  const output = join(dir, 'output.pen')
  const input = JSON.stringify({ version: '2.22', children: [] })
  await writeFile(source, input)
  try {
    const result = await runNodeCLI(['interactive', '-i', source, '-o', output], {
      cwd: dir,
      stdin:
        "create_shape({type:'RECTANGLE',name:'Owned square',x:12,y:34,width:64,height:64})\nget_page_tree()\nsave()\nexit()\n"
    })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const graph = await loadDocument(output)
    const nodes = [...graph.getAllNodes()].filter(
      (n) => n.name === 'Owned square' && n.type === 'RECTANGLE'
    )
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ type: 'RECTANGLE', x: 12, y: 34, width: 64, height: 64 })
    expect(await readFile(source, 'utf8')).toBe(input)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('exit and EOF do not overwrite an output without save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-interactive-exit-'))
  const output = join(dir, 'output.pen')
  await writeFile(output, 'owned prior output')
  try {
    for (const ending of ['exit()\n', '']) {
      const result = await runNodeCLI(['interactive', '-o', output], {
        cwd: dir,
        stdin: "create_shape({type:'RECTANGLE',x:0,y:0,width:64,height:64})\n" + ending
      })
      expect(result.exitCode).toBe(0)
      expect(await readFile(output, 'utf8')).toBe('owned prior output')
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
