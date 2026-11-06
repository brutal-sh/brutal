import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { checkBrandAssets } from '#brand/check'
import { repositoryRoot, webFiles } from '#brand/config'
import { generateDesktop } from '#brand/desktop'
import { canonicalIcns, icoSizes, validateFiles, validateMaskable } from '#brand/validate'
import { generateWeb } from '#brand/web'
import sharp from 'sharp'

const files = await generateWeb(repositoryRoot)

function file(name: string): Buffer {
  const bytes = files.get(name)
  if (!bytes) throw new Error(`Missing ${name}`)
  return bytes
}

describe('brand generation', () => {
  test('produces the web and docs contract, without taking ownership of the PWA manifest', async () => {
    await validateFiles(files, 'web')
    await validateFiles(files, 'docs')
    for (const name of webFiles) expect(files.has(name)).toBe(true)
    expect([...files.keys()].some((name) => name.endsWith('.webmanifest'))).toBe(false)
    expect(icoSizes(file('favicon.ico')).sort((a, b) => a - b)).toEqual([16, 32, 48])
  })

  test('derives main and micro artwork from the original Open Pen master', async () => {
    for (const [name, size] of [
      ['mark', 256],
      ['mark-micro', 16]
    ] as const) {
      const scaled = await sharp(join(repositoryRoot, 'assets/brand/open-pen-app.png'))
        .resize(size, size)
        .png()
        .toBuffer()
      const expected = await sharp(scaled).flatten({ background: '#282828' }).raw().toBuffer()
      const actual = await sharp(file(`brand/${name}.svg`))
        .flatten({ background: '#282828' })
        .raw()
        .toBuffer()
      expect(actual.length).toBe(expected.length)
      let maximumDifference = 0
      for (let i = 0; i < actual.length; i++)
        maximumDifference = Math.max(maximumDifference, Math.abs(actual[i] - expected[i]))
      // SVG image compositing can round premultiplied edge channels by one.
      expect(maximumDifference).toBeLessThanOrEqual(1)
      expect(file(`brand/${name}-dark.svg`)).toEqual(file(`brand/${name}.svg`))
    }
  })

  test('keeps the recognizable violet icon across browser themes', () => {
    expect(file('brand/favicon.svg').toString()).toContain('prefers-color-scheme: dark')
  })

  test('monochrome variants retain the nib and tile in neutral shades', async () => {
    const light = file('brand/mark-mono.svg')
    expect(file('brand/mark-mono-dark.svg')).toEqual(light)
    const pixels = await sharp(light).ensureAlpha().raw().toBuffer()
    let lightPixels = 0,
      darkPixels = 0
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] < 250) continue
      expect(Math.abs(pixels[offset] - pixels[offset + 1])).toBeLessThanOrEqual(1)
      expect(Math.abs(pixels[offset] - pixels[offset + 2])).toBeLessThanOrEqual(1)
      if (pixels[offset] > 200) lightPixels++
      if (pixels[offset] < 100) darkPixels++
    }
    expect(lightPixels).toBeGreaterThan(100)
    expect(darkPixels).toBeGreaterThan(100)
  })

  test('shares the original transparent violet tile across profile and PWA assets', async () => {
    const source = file('brand/open-pen-app.png')
    for (const [name, size] of [
      ['brand/app-icon-1024.png', 1024],
      ['brand/pwa-192.png', 192],
      ['brand/pwa-512.png', 512]
    ] as const) {
      const expected = await sharp(source).resize(size, size).ensureAlpha().raw().toBuffer()
      const actual = await sharp(file(name)).ensureAlpha().raw().toBuffer()
      expect(actual.equals(expected)).toBe(true)
    }
    const svg = await sharp(file('brand/app-icon.svg'))
      .flatten({ background: '#282828' })
      .raw()
      .toBuffer()
    const png = await sharp(source).flatten({ background: '#282828' }).raw().toBuffer()
    let maximumDifference = 0
    for (let i = 0; i < svg.length; i++)
      maximumDifference = Math.max(maximumDifference, Math.abs(svg[i] - png[i]))
    expect(maximumDifference).toBeLessThanOrEqual(1)
  })

  test('rejects a transparent maskable icon', async () => {
    await expect(
      validateMaskable(await sharp(file('brand/mark.svg')).resize(512).png().toBuffer())
    ).rejects.toThrow('opaque')
  })

  test('rejects missing and wrong-size output', async () => {
    const missing = new Map(files)
    missing.delete('favicon.ico')
    await expect(validateFiles(missing, 'docs')).rejects.toThrow('Missing brand output')
    const wrong = new Map(files)
    wrong.set('apple-touch-icon.png', file('brand/pwa-512.png'))
    await expect(validateFiles(wrong, 'docs')).rejects.toThrow('apple-touch-icon.png')
  })

  test('validates native icon and StoreLogo dimensions', async () => {
    const desktop = await generateDesktop(repositoryRoot)
    await validateFiles(desktop, 'desktop')
    for (const name of ['icon.png', 'StoreLogo.png']) {
      const wrong = new Map(desktop)
      wrong.set(name, await sharp(file('brand/app-icon.svg')).resize(64, 64).png().toBuffer())
      await expect(validateFiles(wrong, 'desktop')).rejects.toThrow(name)
    }
  }, 30_000)

  test('web output is byte-reproducible across repeated adapter instances', async () => {
    await checkBrandAssets(repositoryRoot, ['web'])
  })

  test('normalizes ICNS frame ordering without changing frame bytes', () => {
    const chunk = (type: string) => {
      const buffer = Buffer.alloc(9)
      buffer.write(type)
      buffer.writeUInt32BE(9, 4)
      buffer[8] = 42
      return buffer
    }
    const a = chunk('ic07'),
      b = chunk('ic08')
    const header = Buffer.alloc(8)
    header.write('icns')
    header.writeUInt32BE(26, 4)
    expect(canonicalIcns(Buffer.concat([header, b, a]))).toEqual(Buffer.concat([header, a, b]))
    expect(() => canonicalIcns(Buffer.from('icns'))).toThrow('header')
    const bad = Buffer.concat([header, a, b])
    bad.writeUInt32BE(0, 12)
    expect(() => canonicalIcns(bad)).toThrow('chunk length')
  })

  test('rejects ICO frames that point outside their container', () => {
    const bad = Buffer.from(file('favicon.ico'))
    bad.writeUInt32LE(bad.length, 18)
    expect(() => icoSizes(bad)).toThrow('bounds')
  })
})
