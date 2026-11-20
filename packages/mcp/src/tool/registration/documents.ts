import * as v from 'valibot'

import type { RPCJSONObject } from '#mcp/json'
import { fail, ok } from '#mcp/result'

import type { RegistrationContext } from './context'
import { automationTargetEntries } from './schema'
import { sendCommand, splitAutomationTarget, withTarget } from './target'

export function registerListDocuments(context: RegistrationContext): void {
  const { register, sendRPC } = context
  register(
    'list_documents',
    {
      description:
        'List open Brutal documents/tabs with their IDs, file paths, current pages, and pages.',
      inputSchema: v.strictObject({})
    },
    async () => {
      try {
        const result = await sendRPC({ command: 'list_documents', args: {} })
        const res = result as { ok?: boolean; result?: unknown; error?: string }
        if (res.ok === false) return fail(new Error(res.error))
        return ok(res.result ?? {})
      } catch (e) {
        return fail(e)
      }
    }
  )
}

function registerActivateDocument(context: RegistrationContext): void {
  const { register, sendRPC } = context
  register(
    'activate_document',
    {
      inputSchema: v.strictObject({
        document_id: v.pipe(v.string(), v.description('Document/tab ID from list_documents')),
        page_id: automationTargetEntries.page_id
      })
    },
    async (args: { document_id: string; page_id?: string }) => {
      try {
        const { target } = splitAutomationTarget(args)
        const res = await sendCommand(sendRPC, 'activate_document', target)
        return ok(withTarget({ activated: true }, res))
      } catch (e) {
        return fail(e)
      }
    }
  )
}

function registerHistoryTools(context: RegistrationContext): void {
  const { register, sendRPC } = context
  for (const command of ['undo', 'redo'] as const) {
    register(
      command,
      { inputSchema: v.strictObject({ ...automationTargetEntries }) },
      async (args) => {
        try {
          const { target } = splitAutomationTarget(args)
          const res = await sendCommand(sendRPC, command, target)
          return ok(withTarget({ ...(res.result as RPCJSONObject | undefined) }, res))
        } catch (e) {
          return fail(e)
        }
      }
    )
  }
}

export function registerDocumentTools(context: RegistrationContext): void {
  registerActivateDocument(context)
  registerHistoryTools(context)
}
