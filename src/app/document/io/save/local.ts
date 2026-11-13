import { basename } from 'pathe'

import { isTauri } from '@/app/tauri/env'

import { documentSaveFormat, type DocumentSaveFormat } from './format'

export class NativeSavePermissionError extends Error {
  readonly fileName: string

  constructor(path: string, cause: unknown) {
    super('Native document write permission denied.', { cause })
    this.name = 'NativeSavePermissionError'
    this.fileName = basename(path)
  }
}

async function writeNativeDocument(path: string, data: Uint8Array) {
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  try {
    await writeFile(path, data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // shortcut: matches observed native EACCES text; extend when another error shape is verified.
    if (/(?:^|: )Permission denied \(os error 13\)$/.test(message)) {
      throw new NativeSavePermissionError(path, error)
    }
    throw error
  }
}

export async function writeLocalDocument(
  path: string | null,
  handle: FileSystemFileHandle | null,
  data: Uint8Array,
  format: DocumentSaveFormat
): Promise<boolean> {
  const destinationName = handle?.name ?? path
  if (destinationName && documentSaveFormat(destinationName) !== format) {
    throw new Error('The save destination changed format. Save again to use the new destination.')
  }
  if (path && isTauri()) {
    await writeNativeDocument(path, data)
    return true
  }
  if (!handle) return false
  const writable = await handle.createWritable()
  await writable.write(new Uint8Array(data))
  await writable.close()
  return true
}
