import type { SandboxRunRequest, SandboxRunResult } from '@/app/code/sandbox/schema'
import { scriptFailure, SCRIPT_SOURCE_NAME } from '@/app/document/scripts/diagnostics'
import { scriptOutput } from '@/app/document/scripts/output'

const compile = Function

/** Runs only in the disposable worker; the host supplies no document or filesystem handles. */
export function runCanvasScript({
  id,
  code,
  canvasScript,
  allowScriptReferences
}: SandboxRunRequest): SandboxRunResult {
  try {
    let seed = 0
    // Mulberry32 with zero seed matches the five measured reference values on every run.
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
    Object.defineProperty(Math, 'random', { value: random, configurable: true })
    // eslint-disable-next-line typescript-eslint/no-implied-eval -- code runs only in the isolated, time-limited worker
    const value: unknown = new compile(
      'pencil',
      `"use strict";\n${code}\n//# sourceURL=${SCRIPT_SOURCE_NAME}`
    )(canvasScript)
    return {
      id,
      ok: true,
      value: scriptOutput(value, allowScriptReferences),
      collections: []
    }
  } catch (error) {
    return { id, ok: false, ...scriptFailure(error, code) }
  }
}
