import { compact, uniq } from 'es-toolkit/array'

import type { ToolDescriptor, ToolPolicy } from '#mcp/tool/metadata'
import { isSelectionScopeTool, parseToolScope } from '#mcp/tool/scope'

const SAVE_TOOL_NAMES: readonly string[] = ['save', 'save_file']

/** The two save interfaces share one access decision. */
export function toolPolicyNames(name: string): readonly string[] {
  if (name === 'preview_render') return [name, 'render']
  return SAVE_TOOL_NAMES.includes(name) ? SAVE_TOOL_NAMES : [name]
}

export function withSaveToolFlag(names: readonly string[], args: readonly string[]): string[] {
  return uniq([...names, ...(args.includes('--disable_save_tool') ? SAVE_TOOL_NAMES : [])])
}

export function parseDisabledTools(value: string | undefined): string[] {
  if (!value) return []
  return uniq(compact(value.split(',').map((name) => name.trim())))
}

export function isToolEnabled(descriptor: ToolDescriptor, policy: ToolPolicy): boolean {
  if (policy.scope === 'selection' && !isSelectionScopeTool(descriptor.name)) return false
  if (toolPolicyNames(descriptor.name).some((name) => policy.disabledTools.includes(name)))
    return false
  return descriptor.availability !== 'eval' || policy.allowEval
}

export function applyToolPolicy(
  descriptors: readonly ToolDescriptor[],
  policy: ToolPolicy
): ToolDescriptor[] {
  return descriptors.map((descriptor) => ({
    ...descriptor,
    enabled: isToolEnabled(descriptor, policy)
  }))
}

export function serializeDisabledTools(names: readonly string[]): string {
  return names.join(',')
}

export function readToolPolicyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  args: readonly string[] = process.argv.slice(2)
): ToolPolicy {
  return {
    allowEval: env.OPENPENCIL_MCP_EVAL === '1',
    disabledTools: withSaveToolFlag(parseDisabledTools(env.OPENPENCIL_MCP_DISABLED_TOOLS), args),
    scope: parseToolScope(env.OPENPENCIL_MCP_SCOPE)
  }
}
