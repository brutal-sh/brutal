import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  activateOwnedDocument,
  documentNodeX,
  documentSnapshot,
  openOwnedDocuments,
  pageChildNames,
  switchToNewOwnedPage
} from '#tests/helpers/automation/cli/documents'
import { runLiveCLI, startLiveCLI } from '#tests/helpers/automation/cli/process'

const editor = useEditorSetupWithClear('/?test')

test('interactive creation stays on the initial page after the user switches pages', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    const pages = await switchToNewOwnedPage(editor.page, first)
    cli.send("create_shape({type:'RECTANGLE',name:'Pinned page shape',x:0,y:0,width:32,height:32})")
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed, cli.errors()).toBe(0)
    expect(cli.errors()).toBe('')
    expect(await pageChildNames(editor.page, first, pages.original)).toContain('Pinned page shape')
    expect(await pageChildNames(editor.page, first, pages.other)).toEqual([])
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('interactive edits and history stay pinned when the active tab changes', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  await activateOwnedDocument(editor.page, first)
  const cli = startLiveCLI(discovery, ['interactive', '--app', 'desktop'])
  try {
    await expect.poll(cli.output).toContain(first)
    await activateOwnedDocument(editor.page, second)
    cli.send("update_node({id:'owned-a',x:83})")
    await expect.poll(() => documentNodeX(editor.page, first, 'owned-a')).toBe(83)
    cli.send('undo()')
    await expect.poll(() => documentNodeX(editor.page, first, 'owned-a')).toBe(10)
    cli.send('redo()')
    await expect.poll(() => documentNodeX(editor.page, first, 'owned-a')).toBe(83)
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(0)
    expect(cli.errors()).toBe('')
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('a closed pinned target refuses later commands instead of editing the active tab', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const cli = startLiveCLI(discovery, ['interactive', '--app', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    const closed = await runLiveCLI(discovery, [
      'documents',
      'close',
      '--document-id',
      first,
      '--discard'
    ])
    expect(closed.exitCode).toBe(0)
    cli.send(
      "create_shape({type:'RECTANGLE',name:'Must not reach another document',x:0,y:0,width:32,height:32})"
    )
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).not.toBe(0)
    expect(cli.errors()).toContain('closed')
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('a missing explicit target is refused before any live edits', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const before = await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))
  const result = await runLiveCLI(
    discovery,
    ['interactive', '--app', 'desktop', '--document-id', 'missing-owned-document'],
    "create_shape({type:'RECTANGLE',name:'Must not be created',x:0,y:0,width:32,height:32})\nexit()\n"
  )
  expect(result.exitCode).not.toBe(0)
  expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
  editor.canvas.assertNoErrors()
})
