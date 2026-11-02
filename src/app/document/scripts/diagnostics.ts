/** Worker stack locations refer only to this synthetic source, never host files. */
export const SCRIPT_SOURCE_NAME = 'open-pen-script.js'

function scriptLocation(error: Error) {
  const stack = error.stack?.slice(0, 8_192) ?? ''
  const match = /^(\d+):(\d+)/.exec(stack.split(`${SCRIPT_SOURCE_NAME}:`)[1] ?? '')
  if (match) return { line: Number(match[1]), column: Number(match[2]) }
  if (!/^[^@\n]*@\s*(?:\n|$)/.test(stack)) return undefined
  if (
    'line' in error &&
    typeof error.line === 'number' &&
    'column' in error &&
    typeof error.column === 'number'
  )
    return { line: error.line, column: error.column }
  return undefined
}

export function scriptFailure(error: unknown, source: string) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 2_000)
  const location = error instanceof Error ? scriptLocation(error) : undefined
  const column = location?.column ?? 0
  // Function adds two wrapper lines and our strict-mode directive adds one.
  const line = (location?.line ?? 0) - 3
  return Number.isInteger(line) &&
    Number.isInteger(column) &&
    line > 0 &&
    line <= source.split('\n').length &&
    column > 0 &&
    column <= 256_001
    ? { error: message, line, column }
    : { error: message }
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
