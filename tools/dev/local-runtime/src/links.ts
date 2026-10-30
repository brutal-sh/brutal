import { lstat, readlink, symlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/** Existing files, directories, and links to another installation are never replaced. */
export async function checkLink(path: string, target: string): Promise<boolean> {
  const entry = await lstat(path).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
    throw error
  })
  if (!entry) return false
  if (entry.isSymbolicLink() && resolve(dirname(path), await readlink(path)) === target) return true
  throw new Error(`Refusing to replace existing runtime entry: ${path}`)
}

export async function installLink(path: string, target: string): Promise<void> {
  if (!(await checkLink(path, target))) await symlink(target, path)
}
