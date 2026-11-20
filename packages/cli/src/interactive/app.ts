import { resolve } from 'node:path'

import * as v from 'valibot'

import type { AutomationDocumentSummary } from '@open-pencil/core/rpc'
import { ALL_TOOLS, isToolExposed } from '@open-pencil/core/tools'

import { createAppConnection } from '#cli/app/client'
import { appTargetSchema } from '#cli/app/schema'
import type { AppTarget } from '#cli/app/target'

import { interactiveOutput } from './files'
import type { InteractiveCall } from './parse'
import { assertInteractiveResult } from './result'
import { documentsSchema } from './schema'

type AppOptions = { input?: string; output?: string; documentId?: string; pageId?: string }

function readDocuments(value: unknown) {
  const result = v.safeParse(documentsSchema, value)
  if (!result.success)
    throw new Error(
      'The app did not provide safe document identities. Update Brutal before starting a session.'
    )
  return result.output
}

function selectTarget(documents: AutomationDocumentSummary[], options: AppOptions): AppTarget {
  const matches = documents.filter((doc) =>
    options.documentId ? doc.id === options.documentId : doc.active
  )
  const doc = matches.at(0)
  if (matches.length !== 1 || !doc) throw new Error('Expected exactly one target document.')
  const page = doc.pages.find((value) => value.id === (options.pageId ?? doc.current_page_id))
  if (!page) throw new Error('Target page not found in the selected document.')
  return {
    documentId: doc.id,
    documentName: doc.name,
    path: doc.path,
    pageId: page.id,
    pageName: page.name
  }
}

function assertTargetPresent(documents: AutomationDocumentSummary[], target: AppTarget): void {
  const document = documents.find((doc) => doc.id === target.documentId)
  if (!document?.pages.some((page) => page.id === target.pageId))
    throw new Error('The target document or page was closed. Start a new interactive session.')
}

function commandFor(call: InteractiveCall, output?: string) {
  if (['save', 'undo', 'redo', 'exit'].includes(call.name)) {
    if (call.hasArgs) throw new Error(`${call.name}() does not accept arguments.`)
    return { command: call.name === 'save' ? 'save_file' : call.name, args: { path: output } }
  }
  if (!ALL_TOOLS.some((tool) => tool.name === call.name && isToolExposed(tool, 'mcp')))
    throw new Error(`Unknown tool "${call.name}". Run openpencil tool list to see available tools.`)
  return { command: 'tool', args: { name: call.name, args: call.args } }
}

/** Tools use the existing app bridge; edits happen live and exit never saves or discards them. */
export async function createInteractiveAppSession(options: AppOptions) {
  if (options.input && options.documentId)
    throw new Error('Choose an input path or a document ID, not both.')
  const output = options.output ? interactiveOutput(options.output).path : undefined
  const request = await createAppConnection()
  const list = async () => readDocuments((await request('list_documents')).result)
  const initial = await list()
  const opened = options.input
    ? v.parse(
        appTargetSchema,
        (await request('open_file', { path: resolve(options.input) })).target
      )
    : undefined
  const target = selectTarget((opened ? await list() : initial).documents, {
    ...options,
    documentId: opened?.documentId ?? options.documentId
  })

  async function run(call: InteractiveCall): Promise<{ exit: boolean; result?: unknown }> {
    const { command, args } = commandFor(call, output)
    if (command === 'exit') return { exit: true }
    assertTargetPresent((await list()).documents, target)
    const response = await request(command, {
      ...args,
      document_id: target.documentId,
      page_id: target.pageId
    })
    const actual = v.parse(appTargetSchema, response.target)
    if (actual.documentId !== target.documentId || actual.pageId !== target.pageId)
      throw new Error('The app returned a different target. Check the document before continuing.')
    assertInteractiveResult(response.result)
    return { exit: false, result: response.result }
  }

  return { run, connected: target }
}
