import * as v from 'valibot'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { activateOwnedDocument, documentReadState } from '#tests/helpers/automation/cli/documents'
import { connectOwnedMCP } from '#tests/helpers/automation/cli/mcp'
import { runLiveCLI } from '#tests/helpers/automation/cli/process'
import { reopenOwnedNode } from '#tests/helpers/automation/cli/reopen'
import {
  openSelectionDocuments,
  selectionCheckpoint
} from '#tests/helpers/automation/cli/selection'

const editor = useEditorSetupWithClear('/?test')
const selectedSchema = v.object({ selected: v.array(v.string()) })
const mcpTextResultSchema = v.looseObject({
  isError: v.optional(v.boolean()),
  content: v.tuple([v.object({ type: v.literal('text'), text: v.string() })])
})

function selected(text: string | undefined) {
  return v.parse(v.pipe(v.string(), v.parseJson(), selectedSchema), text).selected
}

function mcpSelected(value: unknown) {
  const result = v.parse(mcpTextResultSchema, value)
  if (result.isError) throw new Error(result.content[0].text)
  return selected(result.content[0].text)
}

type Checkpoint = Awaited<ReturnType<typeof selectionCheckpoint>>

function assertPreserved(before: Checkpoint, after: Checkpoint) {
  const { selection: _selected, ...view } = before.view
  expect(after).toMatchObject({
    graph: before.graph,
    otherGraph: before.otherGraph,
    otherView: before.otherView,
    source: before.source,
    otherSource: before.otherSource
  })
  expect(after.view).toMatchObject(view)
}

function layerRow(name: string) {
  return editor.page.getByRole('treeitem', { name: new RegExp(`^${name}(?:\\s|$)`) })
}

async function showSelectedLayer(document: string, name: string) {
  await activateOwnedDocument(editor.page, document)
  await editor.page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  const row = layerRow(name)
  await expect(row).toHaveAttribute('aria-selected', 'true')
  await expect(row.locator('[data-slot="row"]')).toHaveAttribute('data-selected', 'true')
  await expect(row.locator('[data-slot="row"]')).not.toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
}

test('built Node selection reaches an inactive editor and retries without saving live edits', async () => {
  const docs = await openSelectionDocuments(editor.page, test.info().outputPath('owned-source.pen'))
  const before = await selectionCheckpoint(editor.page, docs)
  expect(before.view).toMatchObject({ dirty: true, canUndo: true, canRedo: true })
  const args = ['interactive', '-a', 'desktop', '--document-id', docs.first]
  const result = await runLiveCLI(
    docs.discovery,
    args,
    `select_nodes({ids:${JSON.stringify([docs.alternate, docs.alternate])}})\nexit()\n`
  )
  expect(result.exitCode, result.stderr).toBe(0)
  expect(selected(result.stdout.split('\n').at(-1))).toEqual([docs.alternate])
  const after = await selectionCheckpoint(editor.page, docs)
  expect(after.view.selection).toEqual([docs.alternate])
  assertPreserved(before, after)
  await showSelectedLayer(docs.first, 'Owned secondary')
  const retry = await runLiveCLI(
    docs.discovery,
    args,
    'select_nodes({ids:["owned-a","missing-owned-node"]})\nselect_nodes({ids:["owned-a"]})\nexit()\n'
  )
  expect(retry.exitCode).toBe(1)
  expect(retry.stderr).toContain('not found')
  expect(selected(retry.stdout.split('\n').at(-1))).toEqual(['owned-a'])
  const retried = await selectionCheckpoint(editor.page, docs)
  expect(retried.view.selection).toEqual(['owned-a'])
  assertPreserved(after, retried)
  await showSelectedLayer(docs.first, 'Owned a')
  expect((await reopenOwnedNode(docs.discovery, docs.source, 'Owned a')).x).toBe(10)
  editor.canvas.assertNoErrors()
})

test('real MCP selection refuses a cross-document ID atomically and reports actual selection', async () => {
  const docs = await openSelectionDocuments(editor.page, test.info().outputPath('owned-source.pen'))
  const before = await selectionCheckpoint(editor.page, docs)
  const client = await connectOwnedMCP(docs.discovery)
  const select = (ids: string[]) =>
    client.callTool({ name: 'select_nodes', arguments: { document_id: docs.first, ids } })
  try {
    expect(mcpSelected(await select(['owned-a']))).toEqual(['owned-a'])
    const after = await selectionCheckpoint(editor.page, docs)
    expect(after.view.selection).toEqual(['owned-a'])
    assertPreserved(before, after)
    expect((await select([docs.alternate, 'owned-b'])).isError).toBe(true)
    expect(await selectionCheckpoint(editor.page, docs)).toEqual(after)
    expect(mcpSelected(await select([docs.alternate, docs.alternate]))).toEqual([docs.alternate])
    const retried = await selectionCheckpoint(editor.page, docs)
    expect(retried.view.selection).toEqual([docs.alternate])
    assertPreserved(after, retried)
    await showSelectedLayer(docs.first, 'Owned secondary')
    expect(mcpSelected(await select(['owned-a', docs.alternate]))).toEqual([
      'owned-a',
      docs.alternate
    ])
    await showSelectedLayer(docs.first, 'Owned a')
    await showSelectedLayer(docs.first, 'Owned secondary')
    const row = layerRow('Owned a')
    await row.click()
    expect((await documentReadState(editor.page, docs.first)).selection).toEqual(['owned-a'])
    await expect(row).toHaveAttribute('aria-selected', 'true')
    const otherRow = layerRow('Owned secondary')
    await expect(otherRow).toHaveAttribute('aria-selected', 'false')
    await otherRow.focus()
    await otherRow.press('Enter')
    expect((await documentReadState(editor.page, docs.first)).selection).toEqual([docs.alternate])
    await expect(otherRow).toHaveAttribute('aria-selected', 'true')
    await expect(row).toHaveAttribute('aria-selected', 'false')
    assertPreserved(retried, await selectionCheckpoint(editor.page, docs))
  } finally {
    await client.close()
  }
  editor.canvas.assertNoErrors()
})
