import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  if (!address || typeof address === 'string') throw new Error('No local test port was allocated.')
  return address.port
}

/** Verify the actual executable before changing the installed command. No app data is used. */
export async function verifyBridge(executable: string, expectedVersion: string): Promise<void> {
  const version = Bun.spawn([executable, '--version'], { stdout: 'pipe', stderr: 'pipe' })
  const versionDeadline = setTimeout(() => version.kill(), 5_000)
  try {
    const [code, output] = await Promise.all([version.exited, new Response(version.stdout).text()])
    if (code !== 0 || output.trim() !== expectedVersion)
      throw new Error('Standalone bridge did not report the expected version.')
  } finally {
    clearTimeout(versionDeadline)
  }
  const directory = await mkdtemp(join(tmpdir(), 'openpen-runtime-check-'))
  const port = await freePort()
  const token = randomUUID()
  const child = Bun.spawn([executable], {
    cwd: directory,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
      OPENPENCIL_MCP_DISCOVERY_PATH: join(directory, 'mcp.json'),
      OPENPENCIL_MCP_SOCKET: join(directory, 'mcp.sock'),
      OPENPENCIL_MCP_ROOT: directory,
      OPENPENCIL_MCP_AUTH_TOKEN: token,
      OPENPENCIL_MCP_APP_TIMEOUT_MS: '30000',
      OPENPENCIL_MCP_EXIT_ON_STDIN_CLOSE: '1'
    }
  })
  try {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline && child.exitCode === null) {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(500)
      }).catch(() => null)
      const health: unknown = response?.ok ? await response.json() : null
      if (
        health &&
        typeof health === 'object' &&
        'version' in health &&
        health.version === expectedVersion &&
        'authRequired' in health &&
        health.authRequired === true
      )
        return
      await Bun.sleep(100)
    }
    throw new Error('Standalone bridge did not pass its isolated authenticated health check.')
  } finally {
    child.kill()
    const forceExit = setTimeout(() => child.kill(9), 3_000)
    try {
      await child.exited
    } finally {
      clearTimeout(forceExit)
      await rm(directory, { recursive: true, force: true })
    }
  }
}
