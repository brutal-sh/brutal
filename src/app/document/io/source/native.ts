import type { FileInfo } from '@tauri-apps/plugin-fs'

import { notificationMessages } from '@/app/i18n/notifications'

type SourceVersion = {
  path: string
  hash?: string
  recovered: boolean
}

function contentBuffer(content: ArrayBuffer | Uint8Array): BufferSource {
  if (content instanceof ArrayBuffer) return content
  if (content.buffer instanceof ArrayBuffer)
    return new Uint8Array(content.buffer, content.byteOffset, content.byteLength)
  return Uint8Array.from(content)
}

export async function hashNativeSource(content: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', contentBuffer(content))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readHash(path: string): Promise<string | undefined> {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return await hashNativeSource(await readFile(path))
  } catch {
    return undefined
  }
}

type FileIdentity = Pick<FileInfo, 'dev' | 'ino'>

async function readIdentity(path: string): Promise<FileIdentity | null> {
  const { stat } = await import('@tauri-apps/plugin-fs')
  return stat(path).catch(() => null)
}

export function createNativeSource(read = readHash, identify = readIdentity) {
  let version: SourceVersion | null = null

  async function sameSource(first: string, second: string) {
    if (first === second) return true
    const [left, right] = await Promise.all([identify(first), identify(second)])
    // shortcut: Windows stat omits file IDs, use native file IDs when Windows recovery is qualified.
    return (
      left !== null &&
      right !== null &&
      Number.isSafeInteger(left.dev) &&
      Number.isSafeInteger(left.ino) &&
      (left.ino ?? 0) > 0 &&
      left.dev === right.dev &&
      left.ino === right.ino
    )
  }

  return {
    clear: () => {
      version = null
    },
    associate: (path: string, hash: string) => {
      version = { path, hash, recovered: false }
    },
    restore: (path: string | null, hash: string | undefined) => {
      version = path === null ? null : { path, hash, recovered: true }
    },
    getHash: (path: string) => (version?.path === path ? version.hash : undefined),
    async prepareWrite(path: string, data: Uint8Array) {
      const nextHash = await hashNativeSource(data)
      const original = version
      if (original?.recovered) {
        const same = await sameSource(original.path, path)
        if (
          (same && (original.hash === undefined || original.hash !== (await read(path)))) ||
          original !== version
        )
          throw new Error(notificationMessages.get().recoveredSourceChanged)
      }
      return nextHash
    }
  }
}
