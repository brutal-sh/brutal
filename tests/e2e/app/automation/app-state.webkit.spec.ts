import * as v from 'valibot'

import { appStateSchema } from '@open-pencil/core/tools/read/schema'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  activateOwnedDocument,
  documentReadState,
  documentSnapshot,
  openOwnedDocuments
} from '#tests/helpers/automation/cli/documents'
import { connectOwnedMCP } from '#tests/helpers/automation/cli/mcp'
import { runLiveCLI } from '#tests/helpers/automation/cli/process'

const editor = useEditorSetupWithClear('/?test')
const stateTextSchema = v.pipe(v.string(), v.parseJson(), appStateSchema)
const mcpStateSchema = v.looseObject({
  isError: v.optional(v.boolean()),
  content: v.tuple([v.object({ type: v.literal('text'), text: stateTextSchema })])
})

test('built connected state reads and refused arguments preserve the selected inactive document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const args = ['interactive', '--app', 'desktop', '--document-id', first]
  await activateOwnedDocument(editor.page, first)
  await editor.canvas.canvas.click({ position: { x: 500, y: 400 } })
  await editor.canvas.selectAll()
  await expect
    .poll(async () => (await documentReadState(editor.page, first)).selection)
    .toEqual(['owned-a'])
  await activateOwnedDocument(editor.page, second)
  const edited = await runLiveCLI(
    discovery,
    args,
    'update_node({id:"owned-a",x:31})\nupdate_node({id:"owned-a",x:41})\nundo()\nexit()\n'
  )
  expect(edited.exitCode).toBe(0)
  const before = await documentSnapshot(editor.page, first)
  const other = await documentSnapshot(editor.page, second)
  const state = await documentReadState(editor.page, first)
  expect(state.selection).toEqual(['owned-a'])
  expect(state).toMatchObject({ dirty: true, canUndo: true, canRedo: true })
  const result = await runLiveCLI(
    discovery,
    args,
    'get_app_state()\nget_app_state({depth:1})\nget_app_state()\nexit()\n'
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('Invalid arguments')
  const values = result.stdout
    .split('\n')
    .slice(1)
    .map((line) => v.parse(stateTextSchema, line))
  expect(values).toHaveLength(2)
  expect(values[0]).toEqual(values[1])
  expect(values[0]).toMatchObject({ page: { id: state.page }, selection: [{ id: 'owned-a' }] })
  expect(await documentSnapshot(editor.page, first)).toBe(before)
  expect(await documentSnapshot(editor.page, second)).toBe(other)
  expect(await documentReadState(editor.page, first)).toEqual(state)
  editor.canvas.assertNoErrors()
})

test('real MCP state targets the intended document on the actual browser bridge', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, first)
  const other = await documentSnapshot(editor.page, second)
  const state = await documentReadState(editor.page, first)
  const client = await connectOwnedMCP(discovery)
  try {
    const listed = await client.listTools()
    expect(
      listed.tools.find((tool) => tool.name === 'get_app_state')?.annotations?.readOnlyHint
    ).toBe(true)
    for (const args of [
      { document_id: 'missing-owned-document' },
      { document_id: first, page_id: 'missing-owned-page' }
    ]) {
      expect((await client.callTool({ name: 'get_app_state', arguments: args })).isError).toBe(true)
    }
    const result = v.parse(
      mcpStateSchema,
      await client.callTool({
        name: 'get_app_state',
        arguments: { document_id: first, page_id: state.page }
      })
    )
    expect(result.isError).not.toBe(true)
    expect(result.content[0].text.page.id).toBe(state.page)
    expect(result.content[0].text.selection).toEqual([])
    expect(await documentSnapshot(editor.page, first)).toBe(before)
    expect(await documentSnapshot(editor.page, second)).toBe(other)
    expect(await documentReadState(editor.page, first)).toEqual(state)
  } finally {
    await client.close()
  }
  editor.canvas.assertNoErrors()
})
