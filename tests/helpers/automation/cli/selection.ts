import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Page } from '@playwright/test'
import * as v from 'valibot'

import { liveTestDiscovery } from './bridge'
import { documentReadState, documentSnapshot, openOwnedDocuments } from './documents'
import { runLiveCLI } from './process'

export interface SelectionDocuments {
  discovery: string
  first: string
  second: string
  alternate: string
  source: string
  otherSource: string
}

const createdSchema = v.object({ id: v.string() })

export async function openSelectionDocuments(
  page: Page,
  source: string
): Promise<SelectionDocuments> {
  const discovery = await liveTestDiscovery(page)
  const [first, second] = await openOwnedDocuments(page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const firstArgs = ['interactive', '-a', 'desktop', '--document-id', first]
  const created = await runLiveCLI(
    discovery,
    [...firstArgs, '--out', source],
    'create_shape({type:"RECTANGLE",name:"Owned secondary",x:150,y:20,width:32,height:32})\nsave()\nexit()\n'
  )
  if (created.exitCode) throw new Error(created.stderr)
  const result = v.parse(
    v.pipe(v.string(), v.parseJson(), createdSchema),
    created.stdout.split('\n')[1]
  )
  const otherSource = join(dirname(source), 'other-owned.pen')
  const saved = await runLiveCLI(
    discovery,
    ['interactive', '-a', 'desktop', '--document-id', second, '--out', otherSource],
    'save()\nexit()\n'
  )
  if (saved.exitCode) throw new Error(saved.stderr)
  const edited = await runLiveCLI(
    discovery,
    firstArgs,
    'update_node({id:"owned-a",x:31})\nupdate_node({id:"owned-a",x:41})\nundo()\nexit()\n'
  )
  if (edited.exitCode) throw new Error(edited.stderr)
  return { discovery, first, second, alternate: result.id, source, otherSource }
}

async function sourceSnapshot(path: string) {
  const [bytes, info] = await Promise.all([readFile(path), stat(path)])
  return { bytes, mode: info.mode & 0o777, modifiedAt: info.mtimeMs }
}

export async function selectionCheckpoint(page: Page, documents: SelectionDocuments) {
  return {
    graph: await documentSnapshot(page, documents.first),
    otherGraph: await documentSnapshot(page, documents.second),
    view: await documentReadState(page, documents.first),
    otherView: await documentReadState(page, documents.second),
    source: await sourceSnapshot(documents.source),
    otherSource: await sourceSnapshot(documents.otherSource)
  }
}
