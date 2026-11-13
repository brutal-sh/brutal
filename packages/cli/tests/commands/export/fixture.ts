import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'

export async function rasterFixture(kind: 'solid' | 'image' | 'selection' = 'solid') {
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-raster-'))
  const source = join(dir, 'source.pen')
  const output = join(dir, 'output.png')
  const assetPath = join(dir, 'pattern.png')
  const asset =
    kind === 'image'
      ? await readFile(fileURLToPath(new URL('./fixtures/pattern.png', import.meta.url)))
      : undefined
  if (asset) await writeFile(assetPath, asset)
  const children = [
    {
      id: 'owned',
      type: 'rectangle',
      width: 128,
      height: 96,
      fill: asset ? { type: 'image', url: './pattern.png' } : '#336699'
    }
  ]
  if (kind === 'selection')
    children.push({ id: 'other', type: 'rectangle', width: 32, height: 32, fill: '#ff0000' })
  const input = Buffer.from(JSON.stringify({ version: '2.22', children }))
  await writeFile(source, input)
  return { dir, source, output, input, assetPath, asset }
}

export async function rasterPixels(path: string) {
  const codec = createCanvasKitRasterCodec(await initCanvasKit())
  const image = codec.decode(await readFile(path))
  if (!image) throw new Error('Expected a decodable raster image')
  return image
}
