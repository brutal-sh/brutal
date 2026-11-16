import { fileURLToPath } from 'node:url'

import { uniq } from 'es-toolkit/array'
import * as v from 'valibot'

import { fail, ok } from '#mcp/result'
import { resolveSafePath } from '#mcp/tool/output'

import type { RegistrationContext } from './context'

const saveResponseSchema = v.union([
  v.object({
    ok: v.literal(true),
    result: v.object({ saved: v.literal(true) }),
    target: v.optional(v.unknown())
  }),
  v.object({ ok: v.literal(false), error: v.string() })
])

async function sourcePaths(uri: string, root: string | null): Promise<string[]> {
  const url = new URL(uri)
  if (url.protocol !== 'file:' || url.search || url.hash) {
    throw new Error('Save requires a file URI without a query or fragment')
  }
  const path = fileURLToPath(url)
  if (path.includes('\0')) throw new Error('Invalid file URI')
  if (!root) return [path]
  const safe = await resolveSafePath(path, root)
  return uniq([safe.realPath, safe.resolved])
}

export function registerURISaveTool(context: RegistrationContext): void {
  context.register(
    'save',
    { inputSchema: v.strictObject({ uri: v.pipe(v.string(), v.minLength(1)) }) },
    async ({ uri }, request) => {
      try {
        const paths = await sourcePaths(uri, context.resolvedRoot)
        request.mcpReq.signal.throwIfAborted()
        const result = v.parse(
          saveResponseSchema,
          await context.sendRPC(
            { command: 'save_uri', args: { paths } },
            { signal: request.mcpReq.signal }
          )
        )
        if (!result.ok) throw new Error(result.error)
        return ok({ saved: true, uri, ...(result.target ? { target: result.target } : {}) })
      } catch (error) {
        return fail(error)
      }
    }
  )
}
