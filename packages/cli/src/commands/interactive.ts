import { createInterface } from 'node:readline'

import { defineCommand } from 'citty'

import { dim, printError } from '#cli/format'
import { parseInteractiveCall } from '#cli/interactive/parse'
import { createInteractiveSession } from '#cli/interactive/session'

async function executeLine(
  session: Awaited<ReturnType<typeof createInteractiveSession>>,
  line: string
): Promise<boolean> {
  try {
    const response = await session.run(parseInteractiveCall(line))
    if (response.exit) return true
    console.log(JSON.stringify(response.result ?? null))
  } catch (error) {
    printError(error)
    process.exitCode = 1
  }
  return false
}

async function runShell(options: { input?: string; output: string }): Promise<void> {
  const session = await createInteractiveSession(options)
  const terminal = !!process.stdin.isTTY && !!process.stdout.isTTY
  const lines = createInterface({ input: process.stdin, output: process.stdout, terminal })
  lines.setPrompt('Open Pen > ')
  if (terminal) {
    console.log(dim('Call an editor tool, save(), or exit(). Only save() writes the document.'))
    lines.prompt()
  }
  try {
    for await (const line of lines) {
      if (line.trim() && (await executeLine(session, line))) break
      if (terminal) lines.prompt()
    }
  } finally {
    lines.close()
    process.stdin.pause()
  }
}

export default defineCommand({
  meta: { description: 'Call editor tools in a headless session; save explicitly before exiting' },
  args: {
    in: { type: 'string', alias: 'i', description: 'Input design file (default: empty document)' },
    out: {
      type: 'string',
      alias: 'o',
      description: 'Output .pen or .fig path for save()',
      required: true
    }
  },
  async run({ args }) {
    try {
      await runShell({ input: args.in, output: args.out })
    } catch (error) {
      printError(error)
      process.exitCode = 1
    }
  }
})
