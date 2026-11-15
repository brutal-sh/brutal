import * as v from 'valibot'

import { CODEGEN_PROMPT } from '@open-pencil/core/tools'

import { fail, ok } from '#mcp/result'

import type { RegistrationContext } from './context'
import { sendCommand } from './target'

export function registerSettingsTools(context: RegistrationContext): void {
  const { register, sendRPC } = context
  register('get_settings', { inputSchema: v.strictObject({}) }, async () => {
    try {
      const res = await sendCommand(sendRPC, 'get_settings', {})
      return ok(res.result ?? {})
    } catch (e) {
      return fail(e)
    }
  })

  register(
    'update_settings',
    {
      inputSchema: v.strictObject({
        settings: v.pipe(
          v.record(v.string(), v.unknown()),
          v.description(
            'Partial settings, e.g. {"appearance":{"theme":"light"},"editing":{"snapping":{"pixelGrid":false}}}. Unknown keys and invalid values are rejected.'
          )
        )
      })
    },
    async (args: { settings: Record<string, unknown> }) => {
      try {
        // Echo only the applied patch: with get_settings disabled, writing must not read.
        await sendCommand(sendRPC, 'update_settings', { settings: args.settings })
        return ok({ updated: args.settings })
      } catch (e) {
        return fail(e)
      }
    }
  )
}

export function registerCodegenTool(context: RegistrationContext): void {
  const { register } = context
  register(
    'get_codegen_prompt',
    {
      description:
        'Get design-to-code generation guidelines. Call before generating frontend code.',
      inputSchema: v.strictObject({})
    },
    async () => ok({ prompt: CODEGEN_PROMPT })
  )
}
