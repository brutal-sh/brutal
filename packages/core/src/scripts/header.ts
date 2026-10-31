import { parseExpressionAt, tokenizer } from 'acorn'

import type { ScriptValue } from '@open-pencil/scene-graph/scripts'
export interface ScriptInput {
  name: string
  type: 'number' | 'string' | 'boolean' | 'color' | 'enum' | 'ref'
  value: ScriptValue
  min?: number
  max?: number
  options?: string[]
}

const BLOCKED_NAMES = new Set(['__proto__', 'prototype', 'constructor'])
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

function literal(source: string): ScriptValue {
  const expression = parseExpressionAt(source, 0, { ecmaVersion: 'latest' })
  if (source.slice(expression.end).trim()) throw new Error('Expected one input value.')
  if (expression.type === 'Literal') {
    const value = expression.value
    if (typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  if (NUMBER.test(source) && Number.isFinite(Number(source))) return Number(source)
  throw new Error('Input defaults must be strings, finite numbers or booleans.')
}

function options(source: string): string[] {
  const expression = parseExpressionAt(`[${source}]`, 0, { ecmaVersion: 'latest' })
  if (expression.type !== 'ArrayExpression' || expression.end !== source.length + 2)
    throw new Error('Expected enum options.')
  const values = expression.elements.map((element) => {
    if (element?.type !== 'Literal' || typeof element.value !== 'string')
      throw new Error('Enum options must be quoted strings.')
    return element.value
  })
  if (!values.length || new Set(values).size !== values.length)
    throw new Error('Enum options must be nonempty and unique.')
  return values
}

function declarationTail(source: string): { args?: string; defaultSource?: string } {
  let rest = source.trim()
  let args: string | undefined
  if (rest.startsWith('(')) {
    let depth = 0
    let end = 0
    for (const token of tokenizer(rest, { ecmaVersion: 'latest' })) {
      if (token.type.label === '(') depth++
      if (token.type.label === ')' && --depth === 0) {
        end = token.end
        break
      }
    }
    if (!end) throw new Error('Unclosed script input arguments.')
    args = rest.slice(1, end - 1)
    rest = rest.slice(end).trim()
  }
  if (!rest) return { args }
  if (!rest.startsWith('=') || !rest.slice(1).trim())
    throw new Error('Expected an input default after =.')
  return { args, defaultSource: rest.slice(1).trim() }
}

function numberBounds(input: ScriptInput, args: string) {
  for (const argument of args.split(',')) {
    const bound = /^\s*(min|max)\s*=\s*(\S+)\s*$/.exec(argument)
    if (!bound || !NUMBER.test(bound[2]) || !Number.isFinite(Number(bound[2])))
      throw new Error(`Invalid number bounds for ${input.name}.`)
    const key = bound[1] as 'min' | 'max'
    if (input[key] !== undefined) throw new Error(`Duplicate ${key} for ${input.name}.`)
    input[key] = Number(bound[2])
  }
  if (input.min !== undefined && input.max !== undefined && input.min > input.max)
    throw new Error(`Minimum exceeds maximum for ${input.name}.`)
}

function defaultValue(input: ScriptInput, source: string | undefined): ScriptValue {
  if (source !== undefined) {
    if (
      input.type === 'color' &&
      /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(source)
    )
      return source
    return literal(source)
  }
  if (input.type === 'number') return 0
  if (input.type === 'boolean') return false
  return input.options?.[0] ?? ''
}

/** Header declarations describe controls; they never execute JavaScript. */
export function parseScriptHeader(source: string): ScriptInput[] {
  const header = /^\s*\/\*\*?([\s\S]*?)\*\//.exec(source)?.[1]
  if (!header) throw new Error('A script requires a header with @schema.')
  const lines = header.split(/\r?\n/).map((line) => line.replace(/^\s*\*?\s*/, ''))
  const versions = lines.filter((line) => line.startsWith('@schema'))
  const version = /^@schema\s+2\.(\d+)\s*$/.exec(versions[0] ?? '')
  if (versions.length !== 1 || !version || Number(version[1]) > 21)
    throw new Error('Script schema must be a supported version through 2.21.')
  const inputs: ScriptInput[] = []
  for (const line of lines.filter((entry) => entry.startsWith('@input'))) {
    const match =
      /^@input\s+([A-Za-z_$][\w$]*)\s*:\s*(number|string|boolean|color|enum|ref)\b(.*)$/.exec(line)
    if (!match) throw new Error(`Invalid script input declaration: ${line}`)
    const [, name, type, tail] = match
    const { args, defaultSource } = declarationTail(tail)
    if (BLOCKED_NAMES.has(name) || inputs.some((input) => input.name === name))
      throw new Error(`Invalid or duplicate input name: ${name}`)
    const input: ScriptInput = { name, type: type as ScriptInput['type'], value: '' }
    if (type === 'enum') input.options = options(args ?? '')
    else if (type === 'number' && args?.trim()) numberBounds(input, args)
    else if (args !== undefined) throw new Error(`Unexpected arguments for ${name}.`)
    input.value = defaultValue(input, defaultSource)
    resolveScriptInputs([input], {})
    inputs.push(input)
    if (inputs.length > 100) throw new Error('A script can expose at most 100 inputs.')
  }
  return inputs
}

/** Only declared, correctly typed values reach a script; numeric bounds apply to defaults too. */
export function resolveScriptInputs(
  definitions: readonly ScriptInput[],
  values: Readonly<Record<string, ScriptValue>>
): Record<string, ScriptValue> {
  return Object.fromEntries(
    definitions.map((input) => {
      const value = Object.hasOwn(values, input.name) ? values[input.name] : input.value
      if (input.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value))
          throw new Error(`Input ${input.name} requires a finite number.`)
        return [
          input.name,
          Math.min(input.max ?? Infinity, Math.max(input.min ?? -Infinity, value))
        ]
      }
      if (input.type === 'boolean') {
        if (typeof value !== 'boolean') throw new Error(`Input ${input.name} requires a boolean.`)
      } else if (typeof value !== 'string')
        throw new Error(`Input ${input.name} requires a string.`)
      if (input.type === 'enum' && !input.options?.includes(String(value)))
        throw new Error(`Input ${input.name} must match an enum option.`)
      return [input.name, value]
    })
  )
}
