import { expect, setDefaultTimeout, test } from 'bun:test'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { runCLI } from '#cli-tests/helpers/process'

import { rasterFixture, rasterPixels } from './fixture'

setDefaultTimeout(60_000)

test('WebP export outside the checkout retains alpha and scaled dimensions', async () => {
  const fixture = await rasterFixture('alpha')
  const output = join(fixture.dir, 'alpha.webp')
  try {
    for (const scale of [1, 2]) {
      const result = await runCLI(
        ['export', fixture.source, '-f', 'webp', '-s', String(scale), '-o', output],
        { cwd: fixture.dir }
      )
      expect(result.exitCode).toBe(0)
      const bytes = await readFile(output)
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
      const image = await rasterPixels(output)
      expect([image.width, image.height]).toEqual([128 * scale, 96 * scale])
      const offset = (48 * scale * image.width + 64 * scale) * 4
      expect(image.data[offset + 3]).toBe(128)
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    }
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

test('WebP export honors quality ordering and retains its relative image source', async () => {
  const fixture = await rasterFixture('image')
  try {
    if (!fixture.asset) throw new Error('Expected an owned image fixture')
    const sizes: number[] = []
    for (const quality of [0, 90, 100]) {
      const output = join(fixture.dir, `quality-${quality}.webp`)
      const result = await runCLI(
        ['export', fixture.source, '-f', 'webp', `--quality=${quality}`, '-o', output],
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
