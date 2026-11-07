#!/usr/bin/env bun
import { defineCommand, runMain, showUsage } from 'citty'

import { COMMANDS } from './commands'
import { commandHelp } from './help'

const { version } = await import('../package.json')
const name = 'openpencil'

const main = defineCommand({
  meta: {
    name,
    description:
      'Open Pen CLI — inspect, export, and lint design documents, and drive the running app',
    version
  },
  subCommands: commandHelp(COMMANDS, name, version)
})

// Descendant help already has its full path, so do not prepend Citty's immediate parent.
void runMain(main, { showUsage: (command) => showUsage(command) })
