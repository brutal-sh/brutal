import type { CommandDef, SubCommandsDef } from 'citty'
import { mapValues } from 'es-toolkit'

/** Citty's fallback is the script path, so give help the complete executable/command path. */
export function commandHelp(
  commands: SubCommandsDef,
  prefix: string,
  version: string
): Record<string, () => Promise<CommandDef>> {
  return mapValues(commands, (definition, name) => async () => {
    const command = await (typeof definition === 'function' ? definition() : definition)
    const meta = await (typeof command.meta === 'function' ? command.meta() : command.meta)
    const children = await (typeof command.subCommands === 'function'
      ? command.subCommands()
      : command.subCommands)
    const path = `${prefix} ${name}`
    return {
      ...command,
      meta: { ...meta, name: path, version: meta?.version ?? version },
      subCommands: children ? commandHelp(children, path, meta?.version ?? version) : undefined
    }
  })
}
