import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  documentReadState,
  documentSnapshot,
  openOwnedBinaryDocument,
  openOwnedDocuments,
  switchToNewOwnedPage
} from '#tests/helpers/automation/cli/documents'
import { runLiveCLI, startLiveCLI } from '#tests/helpers/automation/cli/process'
import { createOwnedFig } from '#tests/helpers/automation/cli/reopen'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

const editor = useIsolatedEditorSetupWithClear('/?test', mockEditorCopyServices)

test('selection refuses a pinned page that is no longer visible without changing either document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    await switchToNewOwnedPage(editor.page, first)
    const before = await documentSnapshot(editor.page, first)
    const view = await documentReadState(editor.page, first)
    const other = await documentSnapshot(editor.page, second)
    const otherView = await documentReadState(editor.page, second)
    cli.send('select_nodes({ids:["owned-a"]})')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.errors()).toContain('no longer visible')
    expect(cli.output().trim().split('\n')).toHaveLength(1)
    expect(await documentSnapshot(editor.page, first)).toBe(before)
    expect(await documentReadState(editor.page, first)).toEqual(view)
    expect(await documentSnapshot(editor.page, second)).toBe(other)
    expect(await documentReadState(editor.page, second)).toEqual(otherView)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('selection on a closed pinned document never falls back to the active editor', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const view = await documentReadState(editor.page, second)
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    const closed = await runLiveCLI(discovery, [
      'documents',
      'close',
      '--document-id',
      first,
      '--discard'
    ])
    expect(closed.exitCode, closed.stderr).toBe(0)
    cli.send('select_nodes({ids:["owned-b"]})')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.errors()).toContain('closed')
    expect(cli.output().trim().split('\n')).toHaveLength(1)
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    expect(await documentReadState(editor.page, second)).toEqual(view)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('renderer replacement cannot receive selection from an older connected session', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const bytes = await createOwnedFig(discovery, test.info().outputPath('owned-selection.fig'))
  const original = await openOwnedBinaryDocument(editor.page, bytes, 'original-selection.fig')
  const saved = await runLiveCLI(
    discovery,
    [
      'interactive',
      '-a',
      'desktop',
      '--document-id',
      original.id,
      '--out',
      test.info().outputPath('settled-selection.fig')
    ],
    'save()\nexit()\n'
  )
  expect(saved.exitCode, saved.stderr).toBe(0)
  const cli = startLiveCLI(discovery, [
    'interactive',
    '-a',
    'desktop',
    '--document-id',
    original.id
  ])
  try {
    await expect.poll(cli.output).toContain(original.id)
    await editor.page.reload()
    await editor.canvas.waitForInit()
    expect(await liveTestDiscovery(editor.page)).toBe(discovery)
    const replacement = await openOwnedBinaryDocument(
      editor.page,
      bytes,
      'replacement-selection.fig'
    )
    expect(replacement.pageId).toBe(original.pageId)
    const before = await documentSnapshot(editor.page, replacement.id)
    const view = await documentReadState(editor.page, replacement.id)
    cli.send('select_nodes({ids:["owned-a"]})')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.output().trim().split('\n')).toHaveLength(1)
    expect(await documentSnapshot(editor.page, replacement.id)).toBe(before)
    expect(await documentReadState(editor.page, replacement.id)).toEqual(view)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})
