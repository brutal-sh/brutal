import { createInterface } from 'node:readline'

import { defineCommand } from 'citty'

import { appTargetOptions } from '#cli/app/target'
import { dim, printError } from '#cli/format'
import { createInteractiveAppSession } from '#cli/interactive/app'
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

async function runShell(
  session: Awaited<ReturnType<typeof createInteractiveSession>>,
  connected = false
): Promise<void> {
  const terminal = !!process.stdin.isTTY && !!process.stdout.isTTY
  const lines = createInterface({ input: process.stdin, output: process.stdout, terminal })
  lines.setPrompt('Open Pen > ')
  if (terminal) {
    console.log(
      dim(
        connected
          ? 'Tools edit the connected document live. Use save(), undo(), redo(), or exit().'
          : 'Call an editor tool, save(), or exit(). Only save() writes the document.'
      )
    )
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
  meta: { description: 'Call editor tools in a headless or connected app session' },
  args: {
    in: { type: 'string', alias: 'i', description: 'Input design file (default: empty document)' },
    out: {
      type: 'string',
      alias: 'o',
      description: 'Output .pen or .fig path for save() (required for headless mode)'
    },
    app: { type: 'string', alias: 'a', description: 'Connect to the running desktop app' },
    ...appTargetOptions
  },
  async run({ args }) {
    try {
      if (args.app) {
        if (args.app !== 'desktop') throw new Error('The supported app target is desktop.')
        const session = await createInteractiveAppSession({
          input: args.in,
          output: args.out,
          documentId: args['document-id'],
          pageId: args['page-id']
        })
        console.log(JSON.stringify({ connected: session.connected }))
        await runShell(session, true)
      } else {
        if (args['document-id'] || args['page-id'])
          throw new Error('Target IDs require --app desktop.')
        if (!args.out) throw new Error('Headless interactive mode requires --out.')
        await runShell(await createInteractiveSession({ input: args.in, output: args.out }))
      }
    } catch (error) {
      printError(error)
      process.exitCode = 1
    }
  }
})
