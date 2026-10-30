import type { FileHandle, FileInfo } from '@tauri-apps/plugin-fs'

type BoundedFileReader = Pick<FileHandle, 'read'> & { stat(): Promise<Pick<FileInfo, 'size'>> }

/** Bound both allocation and actual bytes read, even when a file grows after stat. */
export async function readBoundedFileHandle(file: BoundedFileReader, maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('Invalid file size limit.')
  if ((await file.stat()).size > maxBytes) throw new Error('File exceeds its size limit.')
  const bytes = new Uint8Array(maxBytes + 1)
  let offset = 0
  while (offset < bytes.length) {
    const count = await file.read(bytes.subarray(offset))
    if (!count) break
    offset += count
  }
  if (offset > maxBytes) throw new Error('File exceeds its size limit.')
  return bytes.slice(0, offset)
}

export async function readBoundedFile(path: string, maxBytes: number) {
  const { open } = await import('@tauri-apps/plugin-fs')
  const file = await open(path, { read: true })
  try {
    return await readBoundedFileHandle(file, maxBytes)
  } finally {
    await file.close()
  }
}
