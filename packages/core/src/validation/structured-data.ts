export interface StructuredDataLimits {
  outputBytes: number
  elements: number
  depth: number
  arrayLength: number
  objectKeys: number
  stringLength: number
}

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export type ValidationState = {
  elements: number
  bytes: number
}

type PlainRecord = { [key: string]: unknown }

function isPlainRecord(value: unknown): value is PlainRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function addBytes(state: ValidationState, limits: StructuredDataLimits, bytes: number): void {
  state.bytes += bytes
  if (state.bytes > limits.outputBytes) throw new Error('Design JSX output is too large.')
}

function validatePrimitive(
  value: unknown,
  limits: StructuredDataLimits,
  state: ValidationState
): boolean {
  if (value === null) {
    addBytes(state, limits, 4)
    return true
  }
  if (typeof value === 'boolean') {
    addBytes(state, limits, value ? 4 : 5)
    return true
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Design JSX output contains an invalid number.')
    addBytes(state, limits, 8)
    return true
  }
  if (typeof value === 'string') {
    if (value.length > limits.stringLength) {
      throw new Error('Design JSX output contains a string that is too long.')
    }
    addBytes(state, limits, new TextEncoder().encode(value).byteLength)
    return true
  }
  return false
}

function validateRecord(
  record: PlainRecord,
  limits: StructuredDataLimits,
  state: ValidationState,
  depth: number,
  allowUndefinedProperties: boolean
): void {
  const keys = Object.keys(record)
  addBytes(state, limits, 2 + Math.max(0, keys.length - 1))
  if (keys.length > limits.objectKeys) {
    throw new Error('Design JSX output contains too many object properties.')
  }
  for (const key of keys) {
    if (BLOCKED_KEYS.has(key)) throw new Error(`Design JSX output contains blocked key "${key}".`)
  }
  if ('type' in record && 'props' in record && 'children' in record) {
    state.elements += 1
    if (state.elements > limits.elements)
      throw new Error('Design JSX output has too many elements.')
  }
  for (const [key, item] of Object.entries(record)) {
    if (item === undefined && allowUndefinedProperties) continue
    addBytes(state, limits, key.length)
    validateValue(item, limits, state, depth + 1, allowUndefinedProperties)
  }
}

function validateValue(
  value: unknown,
  limits: StructuredDataLimits,
  state: ValidationState,
  depth: number,
  allowUndefinedProperties: boolean
): void {
  if (depth > limits.depth) throw new Error('Design JSX output is too deeply nested.')
  if (validatePrimitive(value, limits, state)) return
  if (Array.isArray(value)) {
    addBytes(state, limits, 2 + Math.max(0, value.length - 1))
    if (value.length > limits.arrayLength) {
      throw new Error('Design JSX output contains an array that is too long.')
    }
    for (const item of value)
      validateValue(item, limits, state, depth + 1, allowUndefinedProperties)
    return
  }
  if (!isPlainRecord(value)) {
    throw new Error('Design JSX output must contain plain structured data only.')
  }
  validateRecord(value, limits, state, depth, allowUndefinedProperties)
}

/** Check that `value` is plain structured data within `limits`, counting it toward `state`. */
export function validateStructuredData(
  value: unknown,
  limits: StructuredDataLimits,
  state: ValidationState = { elements: 0, bytes: 0 },
  allowUndefinedProperties = false
): ValidationState {
  validateValue(value, limits, state, 0, allowUndefinedProperties)
  return state
}

/** The roots a run returned, checked with the collections its `defineVars` calls wrote. */
export function validateDesignJSXOutput(
  value: unknown,
  limits: StructuredDataLimits,
  collections: unknown = []
): unknown[] {
  if (value === undefined) throw new Error('Design JSX must return an OpenPencil element.')
  const roots = Array.isArray(value) ? value : [value]
  if (roots.length === 0) throw new Error('Design JSX must return an OpenPencil element.')
  if (!Array.isArray(collections))
    throw new Error('Design JSX output must contain plain structured data only.')
  validateStructuredData(collections, limits, validateStructuredData(roots, limits))
  return roots
}
