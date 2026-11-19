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

export function createNativeSource(read = readHash) {
  let version: SourceVersion | null = null
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
      if (original?.recovered && original.path === path) {
        if (
          original.hash === undefined ||
          original.hash !== (await read(path)) ||
          original !== version
        )
          throw new Error(notificationMessages.get().recoveredSourceChanged)
      }
      return nextHash
    }
  }
}
