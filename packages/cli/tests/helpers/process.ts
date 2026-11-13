import { BUILT_CLI_ENTRY, CLI_ENTRY } from './paths'

interface CLIRunOptions {
  cwd?: string
  limited?: boolean
}

export function runCLI(args: string[], options: CLIRunOptions = {}) {
  return runProcess([process.execPath, CLI_ENTRY, ...args], options)
}

export function runNodeCLI(args: string[], options: CLIRunOptions = {}) {
  return runProcess(['node', BUILT_CLI_ENTRY, ...args], options)
}

async function runProcess(command: string[], options: CLIRunOptions) {
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
