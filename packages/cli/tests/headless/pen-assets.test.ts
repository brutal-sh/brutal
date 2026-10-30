import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { toUint8Array } from 'js-base64'

import { documentAssetReader, loadDocument } from '#cli/headless'

// A 2 × 1 PNG.
const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)

const root = await mkdtemp(join(tmpdir(), 'pen-assets-'))
afterAll(() => rm(root, { recursive: true, force: true }))

describe('loadDocument — .pen images', () => {
  test('bounded shader assets honor the caller limit and keep the document-folder boundary', async () => {
    const folder = join(root, 'shader')
    await mkdir(folder)
    await writeFile(join(folder, 'small.glsl'), 'void main(){}')
    await writeFile(join(folder, 'large.glsl'), 'x'.repeat(128))
    await writeFile(join(root, 'outside.glsl'), 'outside')
    await symlink(join(root, 'outside.glsl'), join(folder, 'linked.glsl'))
    const read = documentAssetReader(join(folder, 'document.pen'))
    expect(
      new TextDecoder().decode((await read('small.glsl', { maxBytes: 32 })) ?? undefined)
    ).toBe('void main(){}')
    await expect(read('large.glsl', { maxBytes: 32 })).rejects.toThrow('size limit')
    expect(await read('../outside.glsl', { maxBytes: 32 })).toBeNull()
    expect(await read('linked.glsl', { maxBytes: 32 })).toBeNull()
  })
  test('reads images beside the document, but nothing outside its folder', async () => {
    const folder = join(root, 'doc')
    await mkdir(join(folder, 'images'), { recursive: true })
    await writeFile(join(folder, 'images', 'inside.png'), PNG)
    await writeFile(join(root, 'outside.png'), PNG)
    await symlink(join(root, 'outside.png'), join(folder, 'linked.png'))
    const image = (id: string, url: string) => ({
      id,
      type: 'rectangle',
      width: 20,
      height: 10,
      fill: { type: 'image', url }
    })
    await writeFile(
      join(folder, 'doc.pen'),
      JSON.stringify({
        version: '2.21',
        children: [
          image('inside', './images/inside.png'),
          image('parent', '../outside.png'),
          image('linked', 'linked.png')
        ]
      })
    )

    const graph = await loadDocument(join(folder, 'doc.pen'))

    expect(graph.getNode('inside')?.fills[0]?.type).toBe('IMAGE')
    expect(graph.getNode('parent')?.fills).toEqual([])
    expect(graph.getNode('linked')?.fills).toEqual([])
  })
})
