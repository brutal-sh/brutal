import { invoke } from '@tauri-apps/api/core'

import { decodeTauriStderr } from '@/app/shell/ui'
import { resolvePlatformCommand } from '@/app/tauri/command'

import { acpOutput } from './output'

export type TauriChild = {
  write(data: number[]): Promise<void>
  kill(): Promise<void>
}

type ACPProcessOptions = {
  command: string
  args: string[]
  logId: string
  destroying: () => boolean
  onUnexpectedClose: () => void
}

export async function spawnACPProcess({
  command: commandName,
  args,
  logId,
  destroying,
  onUnexpectedClose
}: ACPProcessOptions) {
  const { Command } = await import('@tauri-apps/plugin-shell')
  const resolved = resolvePlatformCommand(commandName, args)
  const command = Command.create(resolved.command, resolved.args, {
    encoding: 'raw',
    env:
      commandName === 'codex-acp' ? { CODEX_CONFIG: await invoke<string>('codex_acp_config') } : {}
  })

  const output = acpOutput(command, { destroying, onUnexpectedClose })
  command.stderr.on('data', (raw: Uint8Array | number[] | string) => {
    console.error(`[ACP ${logId}]`, decodeTauriStderr(raw))
  })
  const child = await command.spawn()

  const input = new WritableStream<Uint8Array>({
    async write(chunk) {
      await child.write(Array.from(chunk))
    }
  })

  return { child, input, output }
}
