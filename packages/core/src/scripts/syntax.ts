import { parse, type Node } from 'acorn'

function isNode(value: unknown): value is Node {
  return (
    value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string'
  )
}

/** Linked scripts finish in the current turn; async bodies and imports cannot be scheduled. */
export function validateScriptSyntax(source: string): void {
  const pending: Node[] = [
    parse(source, { ecmaVersion: 'latest', allowReturnOutsideFunction: true })
  ]
  while (pending.length) {
    const node = pending.pop()
    if (!node) break
    if (
      node.type === 'AwaitExpression' ||
      node.type === 'ImportExpression' ||
      ('async' in node && node.async === true)
    )
      throw new Error('Canvas scripts must run synchronously without imports or async functions.')
    for (const value of Object.values(node) as unknown[]) {
      if (isNode(value)) pending.push(value)
      else if (Array.isArray(value))
        for (const child of value) if (isNode(child)) pending.push(child)
    }
  }
}
