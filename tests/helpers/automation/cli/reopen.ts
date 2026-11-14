import { readFile } from 'node:fs/promises'

import * as v from 'valibot'

import { runLiveCLI } from './process'

const nodeSchema = v.object({ id: v.string(), x: v.number(), name: v.string() })
const matchesSchema = v.array(v.object({ id: v.string(), name: v.string() }))
const connectedSchema = v.object({ connected: v.object({ documentId: v.string() }) })

export function connectedDocumentId(stdout: string) {
  const line = stdout.split('\n').at(0) ?? ''
  return v.parse(v.pipe(v.string(), v.parseJson(), connectedSchema), line).connected.documentId
}

export async function createOwnedFig(discovery: string, path: string) {
  const result = await runLiveCLI(
    discovery,
    ['interactive', '-o', path],
    "create_shape({type:'RECTANGLE',name:'Owned existing shape',x:0,y:0,width:32,height:32})\nsave()\nexit()\n"
  )
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return [...(await readFile(path))]
}

/** A fresh actual CLI process reads the saved file through the normal document reader. */
export async function reopenOwnedNode(discovery: string, path: string, name: string) {
  const found = await runLiveCLI(discovery, ['find', path, '--name', name, '--json'])
  if (found.exitCode !== 0) throw new Error(found.stderr)
  const matches = v.parse(v.pipe(v.string(), v.parseJson(), matchesSchema), found.stdout)
  const node = matches.at(0)
  if (matches.length !== 1 || node?.name !== name) throw new Error('Expected one exact owned node')
  // FIG assigns format-specific IDs when writing an imported PEN node.
  const id = node.id
  const result = await runLiveCLI(discovery, ['node', path, '--id', id, '--json'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return v.parse(v.pipe(v.string(), v.parseJson(), nodeSchema), result.stdout)
}
