import { expect, setDefaultTimeout, test } from 'bun:test'
import { chmod, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { runCLI } from '#cli-tests/helpers/process'

import { rasterFixture, rasterPixels } from './fixture'

setDefaultTimeout(60_000)

test.each(['bad', '-1', '101', '', ' ', 'NaN', 'Infinity', '-Infinity'])(
  'invalid JPEG quality %p refuses without replacing the previous export',
  async (quality) => {
    const fixture = await rasterFixture()
    const output = join(fixture.dir, 'previous.jpg')
    try {
      await writeFile(output, 'owned previous export')
      const result = await runCLI(
        ['export', fixture.source, '-f', 'jpg', `--quality=${quality}`, '-o', output],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('Invalid quality')
      expect(await readFile(output, 'utf8')).toBe('owned previous export')
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)

test('JPEG export outside the checkout preserves dimensions at both scales', async () => {
  const fixture = await rasterFixture()
  const output = join(fixture.dir, 'scaled.jpg')
  try {
    for (const scale of [1, 2]) {
      const result = await runCLI(
        ['export', fixture.source, '-f', 'jpg', '-s', String(scale), '-o', output],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).toBe(0)
      const bytes = await readFile(output)
      expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      const image = await rasterPixels(output)
      expect([image.width, image.height]).toEqual([128 * scale, 96 * scale])
      const offset = (48 * scale * image.width + 64 * scale) * 4
      expect([...image.data.subarray(offset, offset + 4)]).toEqual([51, 103, 153, 255])
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    }
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('JPEG quality zero stays below the default and maximum on an owned image', async () => {
  const fixture = await rasterFixture('image')
  try {
    if (!fixture.asset) throw new Error('Expected an owned image fixture')
    const sizes: number[] = []
    for (const quality of ['0', '90', '100']) {
      const output = join(fixture.dir, `quality-${quality}.jpg`)
      const result = await runCLI(
        ['export', fixture.source, '-f', 'jpg', `--quality=${quality}`, '-o', output],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).toBe(0)
      const image = await rasterPixels(output)
      expect([image.width, image.height]).toEqual([128, 96])
      sizes.push((await readFile(output)).length)
    }
    expect(sizes[0]).toBeLessThan(sizes[1])
    expect(sizes[1]).toBeLessThan(sizes[2])
    expect(await readFile(fixture.source)).toEqual(fixture.input)
    expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === 'win32')(
  'JPEG write failure retains the previous file for retry',
  async () => {
    const fixture = await rasterFixture('image')
    const output = join(fixture.dir, 'output.jpg')
    const args = ['export', fixture.source, '-f', 'jpg', '-o', output]
    try {
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      await chmod(output, 0o640)
      const previous = await readFile(output)
      expect(previous.length).toBeGreaterThan(1024)
      const failed = await runCLI(args, { cwd: fixture.dir, limited: true })
      expect(failed.exitCode).not.toBe(0)
      expect(failed.stderr.length).toBeGreaterThan(0)
      expect(await readFile(output)).toEqual(previous)
      expect((await readdir(fixture.dir)).sort()).toEqual([
        'output.jpg',
        'pattern.png',
        'source.pen'
      ])
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      expect(await readFile(output)).toEqual(previous)
      expect((await stat(output)).mode & 0o777).toBe(0o640)
      expect(await readFile(fixture.source)).toEqual(fixture.input)
      if (!fixture.asset) throw new Error('Expected an owned image fixture')
      expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)

test.each([{ args: ['-q'] }, { args: ['-q', '-Infinity'] }])(
  'malformed quality syntax %p refuses without a parser stack trace',
  async ({ args: qualityArgs }) => {
    const fixture = await rasterFixture()
    const output = join(fixture.dir, 'previous.jpg')
    try {
      await writeFile(output, 'owned previous export')
      const result = await runCLI(
        ['export', fixture.source, '-f', 'jpg', '-o', output, ...qualityArgs],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('Invalid')
      expect(result.stderr).not.toContain('is not a function')
      expect(await readFile(output, 'utf8')).toBe('owned previous export')
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)
