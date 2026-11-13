import { expect, setDefaultTimeout, test } from 'bun:test'
import { chmod, lstat, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { runCLI } from '#cli-tests/helpers/process'

import { pngFixture, pngPixels } from './fixture'

setDefaultTimeout(60_000)

test('PNG export outside the checkout preserves solid colors at both scales', async () => {
  const fixture = await pngFixture()
  try {
    for (const scale of [1, 2]) {
      const result = await runCLI(
        ['export', fixture.source, '-f', 'png', '-s', String(scale), '-o', fixture.output],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).toBe(0)
      const image = await pngPixels(fixture.output)
      expect([image.width, image.height]).toEqual([128 * scale, 96 * scale])
      const offset = (48 * scale * image.width + 64 * scale) * 4
      expect(Array.from(image.data.subarray(offset, offset + 4))).toEqual([51, 102, 153, 255])
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    }
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('relative images retain the current renderer sample and source bytes outside the checkout', async () => {
  const fixture = await pngFixture('image')
  try {
    if (!fixture.asset) throw new Error('Expected an owned image fixture')
    const result = await runCLI(['export', fixture.source, '-o', fixture.output], {
      cwd: fixture.dir
    })
    expect(result.exitCode).toBe(0)
    const image = await pngPixels(fixture.output)
    expect([image.width, image.height]).toEqual([128, 96])
    const offset = (48 * image.width + 64) * 4
    expect(Array.from(image.data.subarray(offset, offset + 4))).toEqual([64, 48, 204, 255])
    expect(await readFile(fixture.source)).toEqual(fixture.input)
    expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('PNG node export selects the intended layer without changing the design', async () => {
  const fixture = await pngFixture('selection')
  try {
    const result = await runCLI(
      ['export', fixture.source, '--node', 'owned', '-o', fixture.output],
      {
        cwd: fixture.dir
      }
    )
    expect(result.exitCode).toBe(0)
    const image = await pngPixels(fixture.output)
    expect([image.width, image.height]).toEqual([128, 96])
    expect(Array.from(image.data.subarray(0, 4))).toEqual([51, 102, 153, 255])
    expect(await readFile(fixture.source)).toEqual(fixture.input)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('an unknown PNG node refuses before replacing an existing output', async () => {
  const fixture = await pngFixture()
  try {
    await writeFile(fixture.output, 'owned previous output')
    const result = await runCLI(
      ['export', fixture.source, '--node', 'absent', '-o', fixture.output],
      {
        cwd: fixture.dir
      }
    )
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.length).toBeGreaterThan(0)
    expect(await readFile(fixture.output, 'utf8')).toBe('owned previous output')
    expect(await readFile(fixture.source)).toEqual(fixture.input)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test.skipIf(process.platform === 'win32')(
  'a failed PNG write preserves output and permits retry',
  async () => {
    const fixture = await pngFixture('image')
    const args = ['export', fixture.source, '-o', fixture.output]
    try {
      if (!fixture.asset) throw new Error('Expected an owned image fixture')
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      await chmod(fixture.output, 0o640)
      const original = await readFile(fixture.output)
      expect(original.length).toBeGreaterThan(1024)
      const failed = await runCLI(args, { cwd: fixture.dir, limited: true })
      expect(failed.exitCode).not.toBe(0)
      expect(failed.stderr.length).toBeGreaterThan(0)
      expect((await readFile(fixture.output)).equals(original)).toBe(true)
      expect((await readdir(fixture.dir)).sort()).toEqual([
        'output.png',
        'pattern.png',
        'source.pen'
      ])
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      expect(await readFile(fixture.output)).toEqual(original)
      expect((await stat(fixture.output)).mode & 0o777).toBe(0o640)
      expect(await readFile(fixture.source)).toEqual(fixture.input)
      expect(await readFile(fixture.assetPath)).toEqual(fixture.asset)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)

test.skipIf(process.platform === 'win32')(
  'a restricted PNG output folder refuses before an in-place write',
  async () => {
    const fixture = await pngFixture()
    const args = ['export', fixture.source, '-o', fixture.output]
    try {
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      const original = await readFile(fixture.output)
      await chmod(fixture.dir, 0o500)
      const failed = await runCLI(args, { cwd: fixture.dir })
      expect(failed.exitCode).not.toBe(0)
      expect(failed.stderr.length).toBeGreaterThan(0)
      expect(await readFile(fixture.output)).toEqual(original)
      await chmod(fixture.dir, 0o700)
      expect((await runCLI(args, { cwd: fixture.dir })).exitCode).toBe(0)
      expect(await readFile(fixture.output)).toEqual(original)
    } finally {
      await chmod(fixture.dir, 0o700)
      await rm(fixture.dir, { recursive: true, force: true })
    }
  }
)

test('PNG output replaces a symlink while preserving its linked file', async () => {
  const fixture = await pngFixture()
  const target = join(fixture.dir, 'linked-data')
  try {
    await writeFile(target, 'owned linked content')
    await symlink(target, fixture.output)
    const result = await runCLI(['export', fixture.source, '-o', fixture.output], {
      cwd: fixture.dir
    })
    expect(result.exitCode).toBe(0)
    expect((await lstat(fixture.output)).isSymbolicLink()).toBe(false)
    expect(await readFile(target, 'utf8')).toBe('owned linked content')
    expect([...(await pngPixels(fixture.output)).data.subarray(0, 4)]).toEqual([51, 102, 153, 255])
    expect(await readFile(fixture.source)).toEqual(fixture.input)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})
