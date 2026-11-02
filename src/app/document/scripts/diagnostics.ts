import * as v from 'valibot'

import type { SandboxRunResult } from '@/app/code/sandbox/schema'

export const SCRIPT_SOURCE_NAME = 'open-pen-script.js'

const scriptErrorSchema = v.object({
  message: v.string(),
  name: v.optional(v.string()),
  stack: v.optional(v.string())
})

/** Retain only bounded frames in the authored virtual file, never worker or host paths. */
export function scriptFailure(
  error: unknown,
  source: string,
  filename = SCRIPT_SOURCE_NAME,
  firstLineOffset = 0
) {
  const parsed = v.safeParse(scriptErrorSchema, error)
  const details = parsed.success ? parsed.output : undefined
  const message = (details?.message ?? String(error)).slice(0, 2_000)
  const sourceLines = source.split('\n').length
  const marker = `(${filename}:`
  const frames = (details?.stack?.slice(0, 8_192) ?? '')
    .split('\n')
    .flatMap((frame) => {
      const start = frame.indexOf(marker)
      if (start === -1 || !/^\s*at [^\r\n()]*\s+\(/.test(frame)) return []
      const match = /^(\d+):(\d+)\)\s*$/.exec(frame.slice(start + marker.length))
      if (!match) return []
      const line = Number(match[1])
      const column = Number(match[2]) - (line === 1 ? firstLineOffset : 0)
      return line > 0 && line <= sourceLines + 1 && column > 0 && column <= 256_001
        ? [
            {
              text: `${frame.slice(0, start)}${marker}${line}:${column})`.slice(0, 256),
              line,
              column
            }
          ]
        : []
    })
    .slice(0, 4)
  const location = frames.find((frame) => frame.line <= sourceLines)
  const failure: Omit<Extract<SandboxRunResult, { ok: false }>, 'id' | 'ok'> = {
    error: message,
    errorName: (details?.name ?? 'Error').replace(/[\r\n\t]/g, ' ').slice(0, 100)
  }
  if (frames.length)
    failure.stack =
      frames.map((frame) => frame.text).join('\n') + (details?.stack?.endsWith('\n') ? '\n' : '')
  if (location) {
    failure.line = location.line
    failure.column = location.column
  }
  return failure
}

export function scriptExcerpt(source: string, line: number) {
  return source
    .split('\n')
    .slice(Math.max(0, line - 3), line + 2)
    .map((text, index) => {
      const number = Math.max(1, line - 2) + index
      return `${number === line ? '>' : ' '} ${number}: ${text.slice(0, 240)}`
    })
    .join('\n')
}
