import { describe, expect, test } from 'bun:test'

import { createNativeSource, hashNativeSource } from '@/app/document/io/source/native'

const originalPath = '/fixtures/source.pen'
const copyPath = '/fixtures/recovery copy.pen'
const originalBytes = Uint8Array.of(1, 4)
const recoveredBytes = Uint8Array.of(2, 3)
const recoveredHash = 'ee9040f65c341855e070ff438eb0ea9d5b831b2a2c270fb7ef592d750408e3b3'

describe('native recovery write protection', () => {
  test('preserves the recorded source hash and only allows a matching write-back', async () => {
    const originalHash = await hashNativeSource(originalBytes)
    let diskHash = await hashNativeSource(Uint8Array.of(9, 2))
    const source = createNativeSource(async () => diskHash)
    source.associate(originalPath, originalHash)
    source.restore(originalPath, source.getHash(originalPath))
    await expect(source.prepareWrite(originalPath, recoveredBytes)).rejects.toThrow()
    expect(source.getHash(originalPath)).toBe(originalHash)

    const copyHash = await source.prepareWrite(copyPath, recoveredBytes)
    expect(copyHash).toBe(recoveredHash)
    expect(source.getHash(originalPath)).toBe(originalHash)

    diskHash = originalHash
    expect(await source.prepareWrite(originalPath, recoveredBytes)).toBe(copyHash)
  })

  test('preserves older snapshots and refuses unverifiable write-back', async () => {
    const source = createNativeSource(async () => undefined)
    source.restore(originalPath, undefined)
    await expect(source.prepareWrite(originalPath, recoveredBytes)).rejects.toThrow()
    source.restore(originalPath, await hashNativeSource(originalBytes))
    await expect(source.prepareWrite(originalPath, recoveredBytes)).rejects.toThrow()
    expect(await source.prepareWrite(copyPath, recoveredBytes)).toBe(recoveredHash)
  })

  test('guards a second name for the source while allowing a separate copy', async () => {
    const linkedPath = '/fixtures/linked source.pen'
    const originalHash = await hashNativeSource(originalBytes)
    let diskHash = recoveredHash
    const source = createNativeSource(
      async () => diskHash,
      async (path) => ({ dev: 5, ino: path === copyPath ? 25 : 24 })
    )
    source.restore(originalPath, originalHash)
    await expect(source.prepareWrite(linkedPath, recoveredBytes)).rejects.toThrow()
    expect(await source.prepareWrite(copyPath, recoveredBytes)).toBe(recoveredHash)

    diskHash = originalHash
    expect(await source.prepareWrite(linkedPath, recoveredBytes)).toBe(recoveredHash)
  })
})
