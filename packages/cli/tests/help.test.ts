import { describe, expect, test } from 'bun:test'

import { defineCommand, renderUsage, runCommand } from 'citty'

import { commandHelp } from '#cli/help'

describe('CLI command help', () => {
  test('renders complete nested paths without mutating shared command definitions', async () => {
    const leaf = defineCommand({ meta: { description: 'Inspect a fixture' } })
    const parent = defineCommand({
      meta: Promise.resolve({ description: 'Fixture commands', version: '2.0.0' }),
      subCommands: async () => ({ inspect: leaf })
    })
    const commands = commandHelp({ fixture: parent }, 'openpencil', '0.16.0')
    const namedParent = await commands.fixture()
    expect(await renderUsage(namedParent)).toContain('USAGE `openpencil fixture')
    const children = namedParent.subCommands
    if (!children || typeof children === 'function' || children instanceof Promise) {
      throw new Error('Expected resolved named children')
    }
    const child = children.inspect
    if (typeof child !== 'function') throw new Error('Expected a lazy named child')
    const namedChild = await child()
    const usage = await renderUsage(namedChild)
    expect(usage).toContain('USAGE `openpencil fixture inspect')
    expect(usage).toContain('v2.0.0')
    expect(usage).toContain('Inspect a fixture')
    expect(leaf.meta).toEqual({ description: 'Inspect a fixture' })
    expect(parent.subCommands).toBeFunction()
  })

  test('retains handlers, argument parsing and explicit versions through lazy definitions', async () => {
    let calls = 0
    let count: string | undefined
    const command = defineCommand({
      meta: async () => ({ description: 'Fixture action', version: '1.2.3' }),
      args: { count: { type: 'string', required: true } },
      run({ args }) {
        calls++
        count = args.count
      }
    })
    const commands = commandHelp({ action: async () => command }, 'openpencil', '0.16.0')
    const named = await commands.action()
    await runCommand(named, { rawArgs: ['--count', '7'] })
    expect(calls).toBe(1)
    expect(count).toBe('7')
    expect(await renderUsage(named)).toContain('v1.2.3')
  })
})
