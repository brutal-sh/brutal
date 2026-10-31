import { parsePenDocument, assertPenCompatible, type PenNode } from '@open-pencil/pen'

import { resolveDesignJSXValidationLimits } from '@/app/code/sandbox/types'
import { validateStructuredData } from '@/app/code/sandbox/validate'

interface ScriptNodeData {
  type?: unknown
  reusable?: unknown
  children?: unknown
  [key: string]: unknown
}

function isScriptNodeData(value: unknown): value is ScriptNodeData {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const SCRIPT_LIMITS = resolveDesignJSXValidationLimits({
  elements: 1_000,
  arrayLength: 1_000
})

/** Validate the untrusted result before any node reaches the document. */
export function scriptOutput(value: unknown): PenNode[] {
  validateStructuredData(value, SCRIPT_LIMITS)
  if (!Array.isArray(value)) throw new Error('A script must return an array of nodes.')
  let count = 0
  function nodes(values: unknown[], depth: number): unknown[] {
    if (depth > 100) throw new Error('Script output is too deeply nested.')
    return values.map((entry) => {
      if (!isScriptNodeData(entry)) throw new Error('Script output must contain node objects.')
      if (++count > 1_000) throw new Error('A script can generate at most 1,000 nodes.')
      const node = entry
      if (node.reusable) throw new Error('Script output cannot define reusable components.')
      if (node.type === 'script' || node.type === 'browser' || node.type === 'ref')
        throw new Error(
          'Script output cannot create Script, Browser or unresolved reference nodes.'
        )
      if (node.children !== undefined && !Array.isArray(node.children))
        throw new Error('Node children must be an array.')
      return {
        ...node,
        id: `script-${count}`,
        ...(Array.isArray(node.children) ? { children: nodes(node.children, depth + 1) } : {})
      }
    })
  }
  const document = parsePenDocument(JSON.stringify({ version: '2.21', children: nodes(value, 0) }))
  assertPenCompatible(document)
  return document.children
}
