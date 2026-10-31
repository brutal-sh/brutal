import { SCRIPT_LIMITS } from '@open-pencil/core/scripts/limits'
import { validateStructuredData } from '@open-pencil/core/validation/structured-data'
import { parsePenDocument, assertPenCompatible, type PenNode } from '@open-pencil/pen'

interface ScriptNodeData {
  type?: unknown
  reusable?: unknown
  children?: unknown
  [key: string]: unknown
}

function isScriptNodeData(value: unknown): value is ScriptNodeData {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Validate the untrusted result before any node reaches the document. */
export function scriptOutput(value: unknown, allowReferences = false): PenNode[] {
  validateStructuredData(value, SCRIPT_LIMITS)
  if (!Array.isArray(value)) throw new Error('A script must return an array of nodes.')
  let count = 0
  function sanitize(entry: unknown, depth: number, override = false): ScriptNodeData {
    if (depth > 100) throw new Error('Script output is too deeply nested.')
    if (!isScriptNodeData(entry)) throw new Error('Script output must contain node objects.')
    if (++count > 1_000) throw new Error('A script can generate at most 1,000 nodes.')
    if (entry.reusable) throw new Error('Script output cannot define reusable components.')
    if (
      entry.type === 'script' ||
      entry.type === 'browser' ||
      (entry.type === 'ref' && !allowReferences)
    )
      throw new Error('Script output cannot create Script, Browser or unresolved reference nodes.')
    if (entry.children !== undefined && !Array.isArray(entry.children))
      throw new Error('Node children must be an array.')
    if (entry.descendants !== undefined && !isScriptNodeData(entry.descendants))
      throw new Error('Reference descendants must be an override object.')
    const { id: _id, ...fields } = entry
    const normalized: ScriptNodeData = { ...fields }
    if (!override) normalized.id = `script-${count}`
    if (Array.isArray(entry.children))
      normalized.children = entry.children.map((child) => sanitize(child, depth + 1))
    if (isScriptNodeData(entry.descendants))
      normalized.descendants = Object.fromEntries(
        Object.entries(entry.descendants).map(([key, child]) => [
          key,
          sanitize(child, depth + 1, true)
        ])
      )
    return normalized
  }
  const document = parsePenDocument(
    JSON.stringify({ version: '2.21', children: value.map((node) => sanitize(node, 0)) })
  )
  assertPenCompatible(document)
  return document.children
}
