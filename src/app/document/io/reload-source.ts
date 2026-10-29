import { basename } from 'pathe'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { readFigFile } from '@open-pencil/core/io/formats/fig'

import { documentAssetReader } from '@/app/document/io/assets'
import { appIcons } from '@/app/editor/icons/provider'
import { isTauri } from '@/app/tauri/env'

export type ReloadSourceOptions = {
  documentName: string
  filePath: string | null
  fileHandle: FileSystemFileHandle | null
  signal?: AbortSignal
}

export async function readReloadSource({ filePath, fileHandle, signal }: ReloadSourceOptions) {
  signal?.throwIfAborted()
  if (filePath && isTauri()) {
    const { readFile: tauriRead } = await import('@tauri-apps/plugin-fs')
    const bytes = await tauriRead(filePath)
    signal?.throwIfAborted()
    const blob = new Blob([bytes])
    const file = new File([blob], basename(filePath))
    return readLocalDocument(file, filePath, signal)
  }

  if (fileHandle) {
    const file = await fileHandle.getFile()
    signal?.throwIfAborted()
    return readLocalDocument(file, null, signal)
  }

  return null
}

async function readLocalDocument(file: File, path: string | null, signal?: AbortSignal) {
  if (file.name.toLowerCase().endsWith('.fig'))
    return readFigFile(file, { populate: 'first-page', signal })
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const result = await io.readDocument(
    {
      name: file.name,
      data: new Uint8Array(await file.arrayBuffer()),
      readAsset: documentAssetReader(path ?? undefined)
    },
    { icons: appIcons }
  )
  signal?.throwIfAborted()
  return result.graph
}
