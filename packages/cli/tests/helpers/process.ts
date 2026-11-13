import { CLI_ENTRY } from './paths'

interface CLIRunOptions {
  cwd?: string
  limited?: boolean
}

export async function runCLI(args: string[], options: CLIRunOptions = {}) {
  const command = [process.execPath, CLI_ENTRY, ...args]
  const invocation = options.limited
    ? [
        '/bin/sh',
        '-c',
        'ulimit -c 0; trap "" XFSZ; ulimit -f 2; exec "$@"',
        'open-pen-write-limit',
        ...command
      ]
    : command
  const proc = Bun.spawn(invocation, { cwd: options.cwd, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}
