import {
  parse,
  type CallExpression,
  type Expression,
  type Literal,
  type ObjectExpression,
  type Property,
  type SpreadElement
} from 'acorn'

const MAX_COMMAND_LENGTH = 1_000_000
const MAX_DATA_DEPTH = 32
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export interface InteractiveCall {
  name: string
  args: Record<string, unknown>
  hasArgs: boolean
}

function literalValue(node: Literal): unknown {
  const value = node.value
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error('Arguments must contain finite data literals.')
}

function primitive(node: Expression): unknown {
  if (node.type === 'Literal') return literalValue(node)
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '-' || node.operator === '+') &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number' &&
    Number.isFinite(node.argument.value)
  )
    return node.operator === '-' ? -node.argument.value : node.argument.value
  throw new Error('Arguments must contain finite data literals, not executable expressions.')
}

function propertyEntry(node: Property | SpreadElement, depth: number): [string, unknown] {
  if (
    node.type !== 'Property' ||
    node.computed ||
    node.method ||
    node.shorthand ||
    node.kind !== 'init'
  )
    throw new Error('Arguments cannot contain spreads, computed keys, methods or accessors.')
  const key = node.key.type === 'Identifier' ? node.key.name : primitive(node.key)
  if (typeof key !== 'string' && typeof key !== 'number') throw new Error('Invalid argument key.')
  if (UNSAFE_KEYS.has(String(key))) throw new Error('Unsupported argument key.')
  return [String(key), dataValue(node.value, depth + 1)]
}

function objectValue(node: ObjectExpression, depth: number): Record<string, unknown> {
  return Object.fromEntries(node.properties.map((property) => propertyEntry(property, depth)))
}

function dataValue(node: Expression | SpreadElement | null, depth: number): unknown {
  if (!node || depth > MAX_DATA_DEPTH)
    throw new Error('Arguments are too deeply nested or contain holes.')
  if (node.type === 'SpreadElement') throw new Error('Argument spreads are not supported.')
  if (node.type === 'ObjectExpression') return objectValue(node, depth)
  if (node.type === 'ArrayExpression')
    return node.elements.map((value) => dataValue(value, depth + 1))
  return primitive(node)
}

function commandCall(source: string): CallExpression {
  const { body } = parse(source, { ecmaVersion: 'latest' })
  const statement = body.at(0)
  if (body.length !== 1 || statement?.type !== 'ExpressionStatement')
    throw new Error('Enter one tool_name({ arguments }) call, save(), or exit().')
  const call = statement.expression
  if (call.type !== 'CallExpression' || call.optional || call.callee.type !== 'Identifier')
    throw new Error('Enter a named tool call.')
  return call
}

/** Parse one tool invocation as data; command syntax never evaluates JavaScript. */
export function parseInteractiveCall(source: string): InteractiveCall {
  if (Buffer.byteLength(source, 'utf8') > MAX_COMMAND_LENGTH)
    throw new Error('Interactive command exceeds 1 MB.')
  const call = commandCall(source)
  if (call.arguments.length > 1) throw new Error('Tools accept one argument object.')
  const args = call.arguments.at(0)
  if (args && args.type !== 'ObjectExpression') throw new Error('Tool arguments must be an object.')
  if (call.callee.type !== 'Identifier') throw new Error('Enter a named tool call.')
  return { name: call.callee.name, args: args ? objectValue(args, 0) : {}, hasArgs: !!args }
}
