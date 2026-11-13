import { expect, test } from 'bun:test'

import { withPDFDOM } from '#core/io/formats/pdf/dom'

test('a failed headless conversion restores an existing Image accessor exactly', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  const getter = () =>
    function ownedHostImage() {
      throw new Error('Owned host Image must not be constructed')
    }
  Object.defineProperty(globalThis, 'Image', { get: getter, configurable: true })
  const before = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  try {
    await expect(
      withPDFDOM(async () => {
        expect(typeof Image).toBe('function')
        expect(Object.getOwnPropertyDescriptor(globalThis, 'Image')?.get).toBeUndefined()
        throw new Error('Owned conversion failure')
      })
    ).rejects.toThrow('Owned conversion failure')
    expect(Object.getOwnPropertyDescriptor(globalThis, 'Image')).toEqual(before)
  } finally {
    if (original) Object.defineProperty(globalThis, 'Image', original)
    else Reflect.deleteProperty(globalThis, 'Image')
  }
})

test('a completed headless conversion restores the Image binding it started with', async () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'Image')
  const result = await withPDFDOM(async (parse) => {
    expect(parse('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')).not.toBeNull()
    return typeof Image
  })
  expect(result).toBe('function')
  expect(Object.getOwnPropertyDescriptor(globalThis, 'Image')).toEqual(before)
})
