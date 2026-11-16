import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { Client } from '@modelcontextprotocol/client'
import * as v from 'valibot'

const openedSchema = v.object({ target: v.object({ documentId: v.string() }) })

export async function openOwnedSaveSource(client: Client, path: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(
    path,
    JSON.stringify({
      version: '2.22',
      children: [
        {
          id: 'uri-owned',
          type: 'rectangle',
          name: 'URI owned shape',
          x: 10,
          y: 20,
          width: 64,
          height: 64,
          fill: '#336699'
        }
      ]
    }),
    { mode: 0o600 }
  )
  const result = await client.callTool({ name: 'open_file', arguments: { path } })
  if (result.isError) throw new Error('Could not open owned Save source')
  const content = result.content[0]
  if (!content || content.type !== 'text') throw new Error('Missing owned open result')
  return v.parse(v.pipe(v.string(), v.parseJson(), openedSchema), content.text).target.documentId
}

export async function editOwnedSaveSource(client: Client, document: string, x: number) {
  const result = await client.callTool({
    name: 'update_node',
    arguments: { document_id: document, id: 'uri-owned', x }
  })
  if (result.isError) throw new Error('Could not edit owned Save source')
}
