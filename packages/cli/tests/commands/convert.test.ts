import { expect, setDefaultTimeout, test } from 'bun:test'
import {
  chmod,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { figThumbnailSize } from '#cli-tests/helpers/fig'
import { runCLI } from '#cli-tests/helpers/process'

import { getTextMeasurer } from '@open-pencil/core/layout'
import { parsePenDocument } from '@open-pencil/pen'

import { loadDocument, measureDocumentText } from '#cli/headless'

setDefaultTimeout(60_000)

async function outputFixture(version = '2.22', format = 'pen') {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-convert-output-'))
  const source = join(dir, 'input.pen')
  const output = join(dir, `existing.${format}`)
  const input = Buffer.from(
    JSON.stringify({
      version,
      children: Array.from({ length: 40 }, (_, index) => ({
        id: `owned-${index}`,
        type: 'rectangle',
        width: 64,
        height: 64
      }))
    })
  )
  const original = Buffer.from('Owned existing output retained across failure\n'.repeat(80))
  await writeFile(source, input)
  await writeFile(output, original)
  await chmod(output, 0o640)
  return { dir, source, output, input, original }
}

async function expectConverted(path: string): Promise<void> {
  const graph = await loadDocument(path)
  expect(graph.getPages()[0].childIds).toHaveLength(40)
  if (path.endsWith('.pen'))
    expect(parsePenDocument(await readFile(path, 'utf8')).version).toBe('2.22')
}

test('saves a .pen document with its text measured in its own fonts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-convert-'))
  const source = join(dir, 'tag.pen')
  const output = join(dir, 'tag.fig')
  await Bun.write(
    source,
    JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'tag',
          type: 'frame',
          layout: 'horizontal',
          padding: [4, 10],
          children: [
            {
              id: 'label',
              type: 'text',
              content: '1 lote propuesto',
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: '600',
              fill: '#111111'
            }
          ]
        }
      ]
    })
  )
  expect((await runCLI(['convert', source, '-o', output])).exitCode).toBe(0)

  const graph = await loadDocument(output)
  const label = [...graph.getAllNodes()].find((node) => node.type === 'TEXT')
  if (!label) throw new Error('Expected the label')
  await measureDocumentText(graph)
  const measured = getTextMeasurer()?.(label)
  if (!measured) throw new Error('Expected the label measured in its font')
  expect(label.width).toBeCloseTo(measured.width, 0)
  expect(graph.getNode(label.parentId ?? '')?.width).toBeCloseTo(measured.width + 20, 0)
})

test('reports a font it cannot load, and with --font-policy strict writes nothing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-convert-fonts-'))
  const source = join(dir, 'note.pen')
  await Bun.write(
    source,
    JSON.stringify({
      version: '2.21',
      children: [
        { id: 'note', type: 'text', content: 'Hola', fontFamily: 'Definitely Missing Font' }
      ]
    })
  )
  const warned = await runCLI(['convert', source, '-o', join(dir, 'warned.fig')])
  expect(warned.exitCode).toBe(0)
  expect(warned.stderr).toContain('Definitely Missing Font')
  expect(await Bun.file(join(dir, 'warned.fig')).exists()).toBe(true)

  const strict = await runCLI([
    'convert',
    source,
    '-o',
    join(dir, 'strict.fig'),
    '--font-policy',
    'strict'
  ])
  expect(strict.exitCode).not.toBe(0)
  expect(await Bun.file(join(dir, 'strict.fig')).exists()).toBe(false)
})

test('saves a .fig with a thumbnail of its layers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-convert-'))
  const source = join(dir, 'card.pen')
  const output = join(dir, 'card.fig')
  await Bun.write(
    source,
    JSON.stringify({
      version: '2.21',
      children: [{ id: 'card', type: 'rectangle', width: 300, height: 200, fill: '#111111' }]
    })
  )
  expect((await runCLI(['convert', source, '-o', output])).exitCode).toBe(0)

  const { width, height } = figThumbnailSize(await readFile(output))
  expect(width / height).toBeCloseTo(300 / 200, 2)
})

test('a future schema leaves a pre-existing converter output untouched', async () => {
  const fixture = await outputFixture('2.23')
  try {
    const result = await runCLI(['convert', fixture.source, '-f', 'pen', '-o', fixture.output])
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.length).toBeGreaterThan(0)
    expect(await readFile(fixture.source)).toEqual(fixture.input)
    expect(await readFile(fixture.output)).toEqual(fixture.original)
  } finally {
    await rm(fixture.dir, { recursive: true, force: true })
  }
})

for (const format of ['pen', 'fig']) {
  test.skipIf(process.platform === 'win32')(
    `${format} write-limit failure preserves output and permits a clean retry`,
    async () => {
      const fixture = await outputFixture('2.22', format)
      const args = ['convert', fixture.source, '-f', format, '-o', fixture.output]
      try {
        const failed = await runCLI(args, { limited: true })
        expect(failed.exitCode).not.toBe(0)
        expect(failed.stderr.length).toBeGreaterThan(0)
        expect((await readFile(fixture.output)).equals(fixture.original)).toBe(true)
        expect(await readFile(fixture.source)).toEqual(fixture.input)
        expect((await readdir(fixture.dir)).sort()).toEqual([`existing.${format}`, 'input.pen'])
        expect((await runCLI(args)).exitCode).toBe(0)
        await expectConverted(fixture.output)
        expect((await stat(fixture.output)).mode & 0o777).toBe(0o640)
        expect(await readFile(fixture.source)).toEqual(fixture.input)
      } finally {
        await rm(fixture.dir, { recursive: true, force: true })
      }
    }
  )

  test.skipIf(process.platform === 'win32')(
    `${format} restricted output folder refuses fallback and permits a clean retry`,
    async () => {
      const fixture = await outputFixture('2.22', format)
      const args = ['convert', fixture.source, '-f', format, '-o', fixture.output]
      try {
        await chmod(fixture.dir, 0o500)
        const failed = await runCLI(args)
        expect(failed.exitCode).not.toBe(0)
        expect(failed.stderr.length).toBeGreaterThan(0)
        expect(await readFile(fixture.output)).toEqual(fixture.original)
        expect(await readFile(fixture.source)).toEqual(fixture.input)
        expect((await readdir(fixture.dir)).sort()).toEqual([`existing.${format}`, 'input.pen'])
        await chmod(fixture.dir, 0o700)
        expect((await runCLI(args)).exitCode).toBe(0)
        await expectConverted(fixture.output)
        expect((await stat(fixture.output)).mode & 0o777).toBe(0o640)
      } finally {
        await chmod(fixture.dir, 0o700)
        await rm(fixture.dir, { recursive: true, force: true })
      }
    }
  )

  test(`${format} output replaces its symlink without overwriting the linked file`, async () => {
    const fixture = await outputFixture('2.22', format)
    const link = join(fixture.dir, `converted.${format}`)
    try {
      await symlink(fixture.output, link)
      expect((await runCLI(['convert', fixture.source, '-f', format, '-o', link])).exitCode).toBe(0)
      expect((await lstat(link)).isSymbolicLink()).toBe(false)
      await expectConverted(link)
      expect(await readFile(fixture.output)).toEqual(fixture.original)
      expect(await readFile(fixture.source)).toEqual(fixture.input)
    } finally {
      await rm(fixture.dir, { recursive: true, force: true })
    }
  })
}
