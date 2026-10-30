import { createHash } from 'node:crypto'
import {
  chmod,
  copyFile,
  constants,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

const OWNER = 'Open Pen local runtime v1\n'

async function checksum(path: string): Promise<string> {
  if (!(await lstat(path)).isFile()) throw new Error(`Refusing non-file runtime artifact: ${path}`)
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
}

async function targetOf(link: string): Promise<string | null> {
  const entry = await lstat(link).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
    throw error
  })
  if (!entry) return null
  if (!entry.isSymbolicLink())
    throw new Error(`Refusing to replace existing runtime entry: ${link}`)
  return resolve(dirname(link), await readlink(link))
}

async function ownDirectory(directory: string): Promise<void> {
  const exists = await lstat(directory).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
    throw error
  })
  if (exists) {
    if (!exists.isDirectory() || (await readFile(join(directory, 'owner'), 'utf8')) !== OWNER)
      throw new Error(`Refusing unowned runtime directory: ${directory}`)
    return
  }
  await mkdir(directory, { mode: 0o700 })
  await writeFile(join(directory, 'owner'), OWNER, { flag: 'wx' })
}

/** Only our exact legacy link or a hash-verified binary in our owned directory may migrate. */
export async function publishBridge(
  candidate: string,
  directory: string,
  link: string,
  legacy: string
): Promise<string> {
  await ownDirectory(directory)
  const previous = await targetOf(link)
  if (previous && previous !== legacy) {
    const digest = /^openpen-mcp-([a-f0-9]{64})$/.exec(basename(previous))?.[1]
    if (dirname(previous) !== directory || !digest || (await checksum(previous)) !== digest)
      throw new Error(`Refusing to replace foreign or modified bridge: ${link}`)
  }
  const digest = await checksum(candidate)
  const target = join(directory, `openpen-mcp-${digest}`)
  await copyFile(candidate, target, constants.COPYFILE_EXCL).catch(async (error: unknown) => {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'EEXIST' &&
      (await checksum(target)) === digest
    )
      return
    throw error
  })
  await chmod(target, 0o755)
  if ((await checksum(target)) !== digest) throw new Error('Copied bridge checksum did not match.')
  if (previous === target) return target
  const temporary = await mkdtemp(join(dirname(link), 'openpen-link-'))
  try {
    await symlink(target, join(temporary, 'link'))
    if ((await targetOf(link)) !== previous) throw new Error('Runtime link changed during setup.')
    await rename(join(temporary, 'link'), link)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  return target
}
