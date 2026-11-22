import { Buffer } from 'node:buffer'

import type { ServerContext } from '@modelcontextprotocol/server'
import * as v from 'valibot'

import { parseToolArgs, readSkillResource, type ToolDef } from '@open-pencil/core/tools'

import type { RPCJSONObject } from '#mcp/json'
import {
  MAX_RESULT_BYTES,
  fail,
  ok,
  okText,
  resultTooLargeMessage,
  type MCPResult
} from '#mcp/result'
import { getMCPToolDefinitions } from '#mcp/tool/manifest'
import { writeToolOutput, writesFileOutput } from '#mcp/tool/output'
import { SELECTION_SCOPE_FILE_OUTPUT_ERROR } from '#mcp/tool/scope'

import type { RegistrationContext, RPCResponse } from './context'
import { automationTargetEntries } from './schema'
import { splitAutomationTarget } from './target'

function imageResult(result: RPCJSONObject | undefined, name: string): MCPResult | null {
  if (
    !result ||
    !('base64' in result) ||
    typeof result.mimeType !== 'string' ||
    !result.mimeType.startsWith('image/')
  )
    return null
  const base64 = String(result.base64)
  const bytes = Buffer.byteLength(base64, 'utf8')
  if (bytes > MAX_RESULT_BYTES) {
    return fail(
      new Error(
        resultTooLargeMessage(
          `Image from "${name}"`,
          bytes,
          'Export a smaller region or lower the scale/resolution.'
        )
      )
    )
  }
  return { content: [{ type: 'image', data: base64, mimeType: result.mimeType }] }
}

async function toolResult(
  name: string,
  value: unknown,
  filePath: string | null,
  root: string | null
): Promise<MCPResult> {
  const result = value as RPCJSONObject | undefined
  if (result && filePath && root) {
    const written = await writeToolOutput(name, result, filePath, root)
    if (written) return written
  }
  // Only image data becomes an image part; PDF retains its existing JSON contract.
  return imageResult(result, name) ?? ok(result, name)
}

async function runCoreTool(
  def: ToolDef,
  context: RegistrationContext,
  args: Record<string, unknown>,
  request: ServerContext,
  name = def.name
): Promise<MCPResult> {
  try {
    const { target, args: toolArgs } = splitAutomationTarget(args)
    if (name === 'read_skill') {
      const parsed = parseToolArgs(def.name, def.input, toolArgs)
      return okText(
        readSkillResource(typeof parsed.path === 'string' ? parsed.path : undefined),
        def.name
      )
    }
    const filePath =
      writesFileOutput(name) && typeof toolArgs.path === 'string' ? toolArgs.path : null
    if (context.policy.scope === 'selection' && filePath !== null) {
      return fail(new Error(SELECTION_SCOPE_FILE_OUTPUT_ERROR))
    }
    const response = (await context.sendRPC(
      {
        command: 'tool',
        args: {
          ...target,
          name,
          args: toolArgs,
          agent: context.agent(request.mcpReq._meta),
          ...(context.policy.scope === 'selection' ? { scope: context.policy.scope } : {})
        }
      },
      { signal: request.mcpReq.signal }
    )) as RPCResponse
    if (response.ok === false) return fail(new Error(response.error))
    return await toolResult(name, response.result, filePath, context.resolvedRoot)
  } catch (error) {
    return fail(error)
  }
}

export function registerCoreTools(context: RegistrationContext, agentPreview = false): void {
  for (const def of getMCPToolDefinitions()) {
    const inputSchema =
      def.name === 'read_skill'
        ? def.input
        : v.strictObject({ ...def.input.entries, ...automationTargetEntries })
    context.register(def.name, { inputSchema }, (args, request) =>
      runCoreTool(def, context, args, request)
    )
    if (agentPreview && def.name === 'render') {
      context.register('preview_render', { inputSchema }, (args, request) =>
        runCoreTool(def, context, args, request, 'preview_render')
      )
    }
  }
}
