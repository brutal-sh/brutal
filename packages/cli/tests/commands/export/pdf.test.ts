import { expect, setDefaultTimeout, test } from 'bun:test'
import { chmod, readFile, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { runNodeCLI } from '#cli-tests/helpers/process'

import { rasterFixture } from './fixture'

setDefaultTimeout(60_000)

test('the built Node entry exports a PDF outside the checkout', async () => {
  const fixture = await rasterFixture()
  const output = join(fixture.dir, 'output.pdf')
  try {
    const result = await runNodeCLI(['export', fixture.source, '-f', 'pdf', '-o', output], {
      cwd: fixture.dir
    })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect((await readFile(output)).subarray(0, 5).toString()).toBe('%PDF-')
    expect(await readFile(fixture.source)).toEqual(fixture.input)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('the built Node PDF embeds a relative image rather than silently omitting it', async () => {
  const fixture = await rasterFixture('image')
  const output = join(fixture.dir, 'image.pdf')
  try {
    if (!fixture.asset) throw new Error('Expected an owned image fixture')
    const result = await runNodeCLI(['export', fixture.source, '-f', 'pdf', '-o', output], {
      cwd: fixture.dir
    })
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const pdf = await readFile(output)
    expect(pdf.includes(Buffer.from('/Subtype /Image'))).toBe(true)
    expect(await readFile(fixture.source)).toEqual(fixture.input)
    expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === 'win32')(
  'a failed Node PDF write retains its previous valid output for retry',
  async () => {
    const fixture = await rasterFixture('image')
    const output = join(fixture.dir, 'output.pdf')
    const args = ['export', fixture.source, '-f', 'pdf', '-o', output]
    try {
      if (!fixture.asset) throw new Error('Expected an owned image fixture')
      expect((await runNodeCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      await chmod(output, 0o640)
      const previous = await readFile(output)
      expect(previous.length).toBeGreaterThan(1024)
      const failed = await runNodeCLI(args, { cwd: fixture.dir, limited: true })
      expect(failed.exitCode).not.toBe(0)
      expect(failed.stderr.length).toBeGreaterThan(0)
      expect(await readFile(output)).toEqual(previous)
      expect((await readdir(fixture.dir)).sort()).toEqual([
        'output.pdf',
        'pattern.png',
        'source.pen'
      ])
      expect((await runNodeCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      const retried = await readFile(output)
      expect(retried.subarray(0, 5).toString()).toBe('%PDF-')
      expect(retried.includes(Buffer.from('/Subtype /Image'))).toBe(true)
      expect((await stat(output)).mode & 0o777).toBe(0o640)
      expect(await readFile(fixture.source)).toEqual(fixture.input)
      expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)
