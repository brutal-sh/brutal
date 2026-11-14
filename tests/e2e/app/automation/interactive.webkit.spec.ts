import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  documentNamedCount,
  documentNodeX,
  documentSnapshot,
  openOwnedDocuments
} from '#tests/helpers/automation/cli/documents'
import { runLiveCLI } from '#tests/helpers/automation/cli/process'

const editor = useEditorSetupWithClear('/?test')

test('a returned tool error fails the live session while later explicit edits still work', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const result = await runLiveCLI(
    discovery,
    ['interactive', '-a', 'desktop', '--document-id', first],
    "get_node({id:'missing-owned-node'})\nupdate_node({id:'owned-a',x:41})\nexit()\n"
  )
  await test.info().attach('returned-tool-error', {
    body: JSON.stringify(result),
    contentType: 'application/json'
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('not found')
  expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(41)
  expect(await documentSnapshot(editor.page, second)).toBe(before)
  editor.canvas.assertNoErrors()
})

test('a failed live app command is not replayed because its error mentions ENOENT', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const result = await runLiveCLI(discovery, [
    'eval',
    '--document-id',
    first,
    '--code',
    "const node=figma.createRectangle();node.name='Owned failed request';throw new Error('ENOENT: owned application failure')"
  ])
  await test.info().attach('failed-app-command', {
    body: JSON.stringify(result),
    contentType: 'application/json'
  })
  expect(result.exitCode).not.toBe(0)
  expect(await documentNamedCount(editor.page, first, 'Owned failed request')).toBe(1)
  expect(await documentSnapshot(editor.page, second)).toBe(before)
  editor.canvas.assertNoErrors()
})

test('the built CLI reaches the live bridge and targets an inactive owned document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const [first, second] = ids
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const result = await runLiveCLI(discovery, [
    'tool',
    'call',
    'update_node',
    '--document-id',
    first,
    '--args',
    JSON.stringify({ id: 'owned-a', x: 31 }),
    '--json'
  ])
  await test
    .info()
    .attach('live-cli-control', { body: JSON.stringify(result), contentType: 'application/json' })
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')
  expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(31)
  expect(await documentSnapshot(editor.page, second)).toBe(before)
  editor.canvas.assertNoErrors()
})

test('interactive app mode changes its pinned document through the real bridge', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const result = await runLiveCLI(
    discovery,
    ['interactive', '--app', 'desktop', '--document-id', first],
    "update_node({id:'owned-a',x:61})\nget_page_tree()\nexit()\n"
  )
  await test.info().attach('interactive-app-cli', {
    body: JSON.stringify(result),
    contentType: 'application/json'
  })
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')
  expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(61)
  expect(await documentSnapshot(editor.page, second)).toBe(before)
  editor.canvas.assertNoErrors()
})
