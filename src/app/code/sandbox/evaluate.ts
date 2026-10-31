import { IS_BROWSER } from '@open-pencil/core/constants'
import {
  DESIGN_JSX_ELEMENTS,
  DESIGN_JSX_HELPERS,
  transformDesignJSXProgram,
  type DesignJSXProgram
} from '@open-pencil/design-jsx'

import { evaluateSandbox } from '@/app/code/sandbox/execute'
import {
  DESIGN_JSX_DEFAULT_READY_TIMEOUT_MS,
  DESIGN_JSX_DEFAULT_TIMEOUT_MS,
  DESIGN_JSX_MAX_SOURCE_BYTES,
  resolveDesignJSXValidationLimits,
  type DesignJSXSandboxLimits,
  type DesignJSXSandboxResult
} from '@/app/code/sandbox/types'
import { validateDesignJSXOutput } from '@/app/code/sandbox/validate'

function sourceByteLength(source: string): number {
  return new TextEncoder().encode(source).byteLength
}

export async function evaluateDesignJSX(
  source: string,
  limits: DesignJSXSandboxLimits = {}
): Promise<DesignJSXSandboxResult> {
  if (!IS_BROWSER) {
    return { ok: false, error: 'Design JSX execution requires a browser.' }
  }
  const sourceBytes = limits.sourceBytes ?? DESIGN_JSX_MAX_SOURCE_BYTES
  if (sourceByteLength(source) > sourceBytes) {
    return { ok: false, error: 'Design JSX source is too large.' }
  }

  let program: DesignJSXProgram
  try {
    program = transformDesignJSXProgram(source)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  const validationLimits = resolveDesignJSXValidationLimits(limits)
  const result = await evaluateSandbox(
    {
      code: program.code,
      elements: Object.fromEntries(
        DESIGN_JSX_ELEMENTS.map(({ name, runtimeType }) => [name, runtimeType])
      ),
      helpers: DESIGN_JSX_HELPERS.map(({ name }) => name),
      limits: validationLimits
    },
    limits.timeoutMs ?? DESIGN_JSX_DEFAULT_TIMEOUT_MS,
    limits.readyTimeoutMs ?? DESIGN_JSX_DEFAULT_READY_TIMEOUT_MS
  )
  if (!result.ok) return result
  try {
    const roots = validateDesignJSXOutput(result.value, validationLimits, result.collections)
    return { ok: true, roots, collections: result.collections, lineOffset: program.lineOffset }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
