import * as v from 'valibot'

import { fail, ok } from '#mcp/result'
import { resolveSafePath } from '#mcp/tool/output'

import type { RegistrationContext } from './context'
import { automationTargetEntries, recentFilesResultSchema } from './schema'
import { sendCommand, splitAutomationTarget, withTarget } from './target'

function registerSaveFileTool(context: RegistrationContext): void {
  const { register, sendRPC, resolvedRoot } = context
  register(
    'save_file',
    {
      description: resolvedRoot
        ? 'Save the current document to disk. If path is provided, it must be inside the configured MCP root.'
        : 'Save the current document to disk. Uses the existing file path if available, otherwise prompts for a location.',
      inputSchema: resolvedRoot
        ? v.strictObject({
            path: v.optional(
              v.pipe(
                v.string(),
                v.minLength(1),
                v.description('Path for the .fig file, absolute or relative to the MCP root')
              )
            ),
            ...automationTargetEntries
          })
        : v.strictObject({ ...automationTargetEntries })
    },
    async (args: { path?: string; document_id?: string; page_id?: string }) => {
      try {
        const safePath =
          args.path !== undefined && resolvedRoot
            ? await resolveSafePath(args.path, resolvedRoot)
            : undefined
        const { target } = splitAutomationTarget(args)
        const result = await sendRPC({
          command: 'save_file',
          args: { ...target, path: safePath?.realPath }
        })
        const res = result as { ok?: boolean; result?: unknown; target?: unknown; error?: string }
        if (res.ok === false) return fail(new Error(res.error))
        const response: { saved: true; path?: string; target?: unknown } = { saved: true }
        if (safePath) response.path = safePath.resolved
        if (res.target) response.target = res.target
        return ok(response)
      } catch (e) {
        return fail(e)
      }
    }
  )
}

function registerOpenFileTool(context: RegistrationContext, resolvedRoot: string): void {
  const { register, sendRPC } = context
  register(
    'open_file',
    {
      description: 'Open a .fig or .pen file from inside the configured MCP root.',
      inputSchema: v.strictObject({
        path: v.pipe(
          v.string(),
          v.minLength(1),
          v.description('Path to the design file, absolute or relative to the MCP root')
        ),
        ...automationTargetEntries
      })
    },
    async (args: { path: string; document_id?: string; page_id?: string }) => {
      try {
        const safe = await resolveSafePath(args.path, resolvedRoot)
        const { target } = splitAutomationTarget(args)
        const result = await sendRPC({
          command: 'open_file',
          args: { ...target, path: safe.realPath }
        })
        const res = result as { ok?: boolean; result?: unknown; target?: unknown; error?: string }
        if (res.ok === false) return fail(new Error(res.error))
        const response: { opened: true; target?: unknown } = { opened: true }
        if (res.target) response.target = res.target
        return ok(response)
      } catch (e) {
        return fail(e)
      }
    }
  )
}

function registerRecentFileTool(context: RegistrationContext, resolvedRoot: string): void {
  const { register, sendRPC } = context
  register('list_recent_files', { inputSchema: v.strictObject({}) }, async () => {
    try {
      const res = await sendCommand(sendRPC, 'list_recent_files', {})
      const { files } = v.parse(recentFilesResultSchema, res.result)
      const insideRoot = await Promise.all(
        files.map((file) =>
          resolveSafePath(file.path, resolvedRoot).then(
            () => true,
            () => false
          )
        )
      )
      return ok({ files: files.filter((_, index) => insideRoot[index]) })
    } catch (e) {
      return fail(e)
    }
  })
}

function registerNewDocumentTool(context: RegistrationContext, resolvedRoot: string): void {
  const { register, sendRPC } = context
  register(
    'new_document',
    {
      description:
        'Create a new empty document with an optional save path inside the configured MCP root.',
      inputSchema: v.strictObject({
        path: v.optional(
          v.pipe(
            v.string(),
            v.minLength(1),
            v.description('Path for the new file, absolute or relative to the MCP root')
          )
        ),
        ...automationTargetEntries
      })
    },
    async (args: { path?: string; document_id?: string; page_id?: string }) => {
      try {
        const safePath =
          args.path !== undefined ? await resolveSafePath(args.path, resolvedRoot) : undefined
        const { target } = splitAutomationTarget(args)
        const result = await sendRPC({
          command: 'new_document',
          args: { ...target, path: safePath?.realPath }
        })
        const res = result as { ok?: boolean; result?: unknown; target?: unknown; error?: string }
        if (res.ok === false) return fail(new Error(res.error))
        const response: { created: true; target?: unknown } = { created: true }
        if (res.target) response.target = res.target
        return ok(response)
      } catch (e) {
        return fail(e)
      }
    }
  )
}

const closeEntries = {
  unsaved: v.optional(
    v.pipe(
      v.picklist(['error', 'save', 'discard']),
      v.description(
        'What to do with unsaved changes: "error" (default) fails, "save" saves first, "discard" drops them'
      )
    )
  ),
  ...automationTargetEntries
}

function closeInputSchema(resolvedRoot: string | null) {
  return resolvedRoot
    ? v.strictObject({
        ...closeEntries,
        path: v.optional(
          v.pipe(
            v.string(),
            v.minLength(1),
            v.description(
              'With unsaved "save": .fig path for a document never saved, inside the MCP root'
            )
          )
        )
      })
    : v.strictObject(closeEntries)
}

function registerCloseFileTool(context: RegistrationContext): void {
  const { register, sendRPC, resolvedRoot } = context
  register(
    'close_file',
    {
      inputSchema: closeInputSchema(resolvedRoot)
    },
    async (args: {
      unsaved?: 'error' | 'save' | 'discard'
      path?: string
      document_id?: string
      page_id?: string
    }) => {
      try {
        const safePath =
          args.path !== undefined && resolvedRoot
            ? await resolveSafePath(args.path, resolvedRoot)
            : undefined
        const { target } = splitAutomationTarget(args)
        const rpcArgs: Record<string, unknown> = { ...target }
        if (args.unsaved) rpcArgs.unsaved = args.unsaved
        if (safePath) rpcArgs.path = safePath.realPath
        const res = await sendCommand(sendRPC, 'close_file', rpcArgs)
        const closed = (res.result as { closed?: boolean } | undefined)?.closed === true
        return ok(withTarget({ closed }, res))
      } catch (e) {
        return fail(e)
      }
    }
  )
}

export function registerFileTools(context: RegistrationContext): void {
  registerSaveFileTool(context)
  if (context.resolvedRoot) {
    registerOpenFileTool(context, context.resolvedRoot)
    registerRecentFileTool(context, context.resolvedRoot)
    registerNewDocumentTool(context, context.resolvedRoot)
  }
  registerCloseFileTool(context)
}
