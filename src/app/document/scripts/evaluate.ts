import { IS_BROWSER } from '@open-pencil/core/constants'
import { parseScriptHeader, resolveScriptInputs } from '@open-pencil/core/scripts/header'
import { SCRIPT_LIMITS } from '@open-pencil/core/scripts/limits'
import { validateScriptSyntax } from '@open-pencil/core/scripts/syntax'
import { validateStructuredData } from '@open-pencil/core/validation/structured-data'
import type { ScriptValue } from '@open-pencil/scene-graph/scripts'

import { evaluateSandbox } from '@/app/code/sandbox/execute'
import { scriptOutput } from '@/app/document/scripts/output'

/** The linked script sees its own dimensions and resolved inputs, never the live editor. */
export async function evaluateCanvasScript(
  source: string,
  width: number,
  height: number,
  values: Readonly<Record<string, ScriptValue>> = {},
  signal?: AbortSignal,
  allowReferences = false
) {
  if (!IS_BROWSER) return { ok: false as const, error: 'Canvas scripts require a browser.' }
  try {
    signal?.throwIfAborted()
    if (new TextEncoder().encode(source).byteLength > 256_000)
      throw new Error('Script source is too large.')
    if (![width, height].every((value) => Number.isFinite(value) && value >= 0))
      throw new Error('Script dimensions must be finite and nonnegative.')
    validateScriptSyntax(source)
    const definitions = parseScriptHeader(source)
    const input = resolveScriptInputs(definitions, values)
    validateStructuredData(input, SCRIPT_LIMITS)
    const result = await evaluateSandbox(
      {
        code: source,
        allowScriptReferences: allowReferences,
        canvasScript: { width, height, input },
        elements: {},
        helpers: [],
        limits: SCRIPT_LIMITS
      },
      2_000,
      5_000,
      signal
    )
    if (!result.ok) return result
    return {
      ok: true as const,
      nodes: scriptOutput(result.value, allowReferences),
      definitions,
      input
    }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}
