import * as v from 'valibot'

import { appStateSchema } from '@open-pencil/core/tools/read/schema'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  activateOwnedDocument,
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

test('state remains on its pinned page after the visible page and tab change', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    const pages = await switchToNewOwnedPage(editor.page, first)
    await activateOwnedDocument(editor.page, second)
    const before = await documentSnapshot(editor.page, first)
    const other = await documentSnapshot(editor.page, second)
    const state = await documentReadState(editor.page, first)
    cli.send('get_app_state()')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed, cli.errors()).toBe(0)
    const value = v.parse(
      v.pipe(v.string(), v.parseJson(), appStateSchema),
      cli.output().trim().split('\n').at(-1)
    )
    expect(value.page.id).toBe(pages.original)
    expect(value.selection).toEqual([])
    expect(await documentSnapshot(editor.page, first)).toBe(before)
    expect(await documentSnapshot(editor.page, second)).toBe(other)
    expect(await documentReadState(editor.page, first)).toEqual(state)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('a closed target refuses state reads without reporting the other document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const state = await documentReadState(editor.page, second)
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    expect(
      (await runLiveCLI(discovery, ['documents', 'close', '--document-id', first, '--discard']))
        .exitCode
    ).toBe(0)
    cli.send('get_app_state()')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.errors()).toContain('closed')
    expect(cli.output().trim().split('\n')).toHaveLength(1)
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    expect(await documentReadState(editor.page, second)).toEqual(state)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})

test('a renderer replacement cannot receive state reads from the prior session', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const bytes = await createOwnedFig(discovery, test.info().outputPath('owned-state.fig'))
  const original = await openOwnedBinaryDocument(editor.page, bytes, 'original-state.fig')
  const saved = await runLiveCLI(
    discovery,
    [
      'interactive',
      '-a',
      'desktop',
      '--document-id',
      original.id,
      '--out',
      test.info().outputPath('settled-state.fig')
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
    const replacement = await openOwnedBinaryDocument(editor.page, bytes, 'replacement-state.fig')
    expect(replacement.pageId).toBe(original.pageId)
    const before = await documentSnapshot(editor.page, replacement.id)
    cli.send('get_app_state()')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.output().trim().split('\n')).toHaveLength(1)
    expect(await documentSnapshot(editor.page, replacement.id)).toBe(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})
