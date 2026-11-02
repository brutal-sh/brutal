import { basename } from 'pathe'
import { Scope, type QuickJSContext, type QuickJSWASMModule } from 'quickjs-emscripten-core'
import * as v from 'valibot'

import { SCRIPT_LIMITS } from '@open-pencil/core/scripts/limits'

import type { SandboxRunRequest, SandboxRunResult } from '@/app/code/sandbox/schema'
import { scriptFailure, SCRIPT_SOURCE_NAME } from '@/app/document/scripts/diagnostics'
import { SCRIPT_ENVIRONMENT } from '@/app/document/scripts/environment'
import { scriptOutput } from '@/app/document/scripts/output'

const SCRIPT_PREFIX = '(function(pencil){try{return function(pencil){"use strict";'

/** Runs only in the disposable worker; the host supplies no document or filesystem handles. */
export function runCanvasScript(
  { id, code, canvasScript, allowScriptReferences }: SandboxRunRequest,
  QuickJS: QuickJSWASMModule
): SandboxRunResult {
  const filename =
    basename((canvasScript?.filename ?? SCRIPT_SOURCE_NAME).split(/[?#]/, 1)[0])
      .replace(/\p{Cc}/gu, '_')
      .slice(-128) || SCRIPT_SOURCE_NAME
  try {
    if (!canvasScript) throw new Error('Script inputs are unavailable.')
    return Scope.withScope((scope) => {
      const vm = scope.manage(QuickJS.newContext())
      vm.runtime.setMemoryLimit(64 * 1024 * 1024)
      vm.runtime.setMaxStackSize(512 * 1024)
      const deadline = Date.now() + 1_500
      vm.runtime.setInterruptHandler(() => Date.now() >= deadline)
      const take = (result: ReturnType<QuickJSContext['evalCode']>) => {
        if (result.error) {
          const error: unknown = vm.dump(scope.manage(result.error))
          throw error
        }
        return scope.manage(result.value)
      }
      const serialize = take(vm.evalCode(SCRIPT_ENVIRONMENT, 'script-environment.js'))
      const input = take(
        vm.evalCode(
          `(${JSON.stringify({ width: canvasScript.width, height: canvasScript.height, input: canvasScript.input })})`,
          'script-input.js'
        )
      )
      const compiled = take(
        vm.evalCode(`${SCRIPT_PREFIX}${code}\n}(pencil)}finally{pencil=undefined}})`, filename)
      )
      const value = take(vm.callFunction(compiled, vm.undefined, input))
      const serialized = take(vm.callFunction(serialize, vm.undefined, value))
      const length = scope.manage(vm.getProp(serialized, 'length'))
      if (vm.getNumber(length) > SCRIPT_LIMITS.outputBytes)
        throw new Error('Script output is too large.')
      const parsed = v.safeParse(
        v.pipe(v.string(), v.parseJson(), v.unknown()),
        vm.getString(serialized)
      )
      if (!parsed.success) throw new Error('Script output must contain plain structured data only.')
      return {
        id,
        ok: true,
        value: scriptOutput(parsed.output, allowScriptReferences),
        collections: []
      }
    })
  } catch (error) {
    return { id, ok: false, ...scriptFailure(error, code, filename, SCRIPT_PREFIX.length) }
  }
}
