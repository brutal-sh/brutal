import { execFile, spawn } from 'node:child_process'

import { repoPath } from '#tests/helpers/paths'

export function runLiveCLI(
  discoveryPath: string,
  args: string[],
  stdin = ''
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const environment = cliEnvironment(discoveryPath)
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [repoPath('packages/cli/bin/openpencil.js'), ...args],
      {
        cwd: repoPath(),
        env: environment,
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 8_388_608
      },
      (error, stdout, stderr) =>
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: error ? (typeof error.code === 'number' ? error.code : -1) : 0
        })
    )
    child.stdin?.end(stdin)
  })
}

function cliEnvironment(discoveryPath: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    OPENPENCIL_MCP_DISCOVERY_PATH: discoveryPath,
    NO_COLOR: '1'
  }
  delete environment.FORCE_COLOR
  return environment
}

/** Own only this child; a test can switch tabs or close its target between commands. */
export function startLiveCLI(discoveryPath: string, args: string[]) {
  const child = spawn(process.execPath, [repoPath('packages/cli/bin/openpencil.js'), ...args], {
    cwd: repoPath(),
    env: cliEnvironment(discoveryPath),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30_000
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString()
  })
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString()
  })
  const completed = new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => resolve(code ?? -1))
  })
  return {
    send: (line: string) => child.stdin.write(`${line}\n`),
    finish: () => child.stdin.end(),
    stop: () => child.kill(),
    output: () => stdout,
    errors: () => stderr,
    completed
  }
}
