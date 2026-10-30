import { expect, test } from 'bun:test'

import { readBoundedFileHandle } from '@/app/tauri/files'

function reader(data: Uint8Array, reportedSize = data.length) {
  let offset = 0
  const requested: number[] = []
  return {
    requested,
    stat: async () => ({ size: reportedSize }),
    read: async (buffer: Uint8Array) => {
      requested.push(buffer.length)
      const bytes = data.subarray(offset, offset + buffer.length)
      buffer.set(bytes)
      offset += bytes.length
      return bytes.length
    }
  }
}

test('bounded native file reads reject size preflight without reading bytes', async () => {
  const file = reader(new Uint8Array(12))
  await expect(readBoundedFileHandle(file, 4)).rejects.toThrow('size limit')
  expect(file.requested).toEqual([])
})

test('bounded native file reads stop at the cap when the file grows after stat', async () => {
  const file = reader(new Uint8Array(12), 2)
  await expect(readBoundedFileHandle(file, 4)).rejects.toThrow('size limit')
  expect(file.requested).toEqual([5])
  expect(await readBoundedFileHandle(reader(new Uint8Array([1, 2, 3])), 4)).toEqual(
    new Uint8Array([1, 2, 3])
  )
})
