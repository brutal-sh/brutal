import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkLink, installLink } from '../src/links'

test('local runtime links are repeatable and never replace existing files or foreign links', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-runtime-'))
  try {
    const destination = join(directory, 'bridge')
    const own = join(directory, 'own')
    const foreign = join(directory, 'foreign')
    await writeFile(own, 'fork')
    await writeFile(foreign, 'preserve')
    await installLink(destination, own)
    await installLink(destination, own)
    expect(await checkLink(destination, own)).toBe(true)
    await expect(installLink(destination, foreign)).rejects.toThrow('Refusing to replace')
    await expect(installLink(foreign, own)).rejects.toThrow('Refusing to replace')
    expect(await readFile(foreign, 'utf8')).toBe('preserve')
    const broken = join(directory, 'broken')
    await symlink(join(directory, 'missing'), broken)
    await expect(installLink(broken, own)).rejects.toThrow('Refusing to replace')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
