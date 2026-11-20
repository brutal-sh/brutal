import * as v from 'valibot'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  documentNodeX,
  documentReadState,
  documentSnapshot,
  openOwnedDocuments
} from '#tests/helpers/automation/cli/documents'
import { runLiveCLI } from '#tests/helpers/automation/cli/process'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

const editor = useIsolatedEditorSetupWithClear('/?test', mockEditorCopyServices)

function assertResourceOutput(stdout: string, first: string) {
  const [connection, ...lines] = stdout.split('\n')
  if (!connection) throw new Error('Missing CLI connection packet')
  const target = v.parse(
    v.pipe(
      v.string(),
      v.parseJson(),
      v.object({ connected: v.object({ documentId: v.string() }) })
    ),
    connection
  )
  expect(target.connected.documentId).toBe(first)
  const resources = lines.map((line) =>
    v.parse(v.pipe(v.string(), v.parseJson(), v.string()), line)
  )
  expect(resources).toHaveLength(2)
  expect(resources.every((text) => text.length > 0)).toBe(true)
}

test('built connected CLI reads guidance and recovers from refusal without changing either document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const args = ['interactive', '--app', 'desktop', '--document-id', first]
  const setup = await runLiveCLI(
    discovery,
    args,
    'update_node({id:"owned-a",x:31})\nupdate_node({id:"owned-a",x:41})\nundo()\nexit()\n'
  )
  expect(setup.exitCode).toBe(0)
  const before = await documentSnapshot(editor.page, first)
  const other = await documentSnapshot(editor.page, second)
  const state = await documentReadState(editor.page, first)
  expect(state).toMatchObject({ dirty: true, canUndo: true, canRedo: true })
  const result = await runLiveCLI(
    discovery,
    args,
    'read_skill()\nread_skill({path:"../SKILL.md"})\nread_skill({path:"execute.md"})\nexit()\n'
  )
  await test.info().attach('connected-resource-outcome', {
    body: JSON.stringify(result),
    contentType: 'application/json'
  })
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('Unknown Brutal skill resource')
  assertResourceOutput(result.stdout, first)
  expect(await documentSnapshot(editor.page, first)).toBe(before)
  expect(await documentSnapshot(editor.page, second)).toBe(other)
  expect(await documentReadState(editor.page, first)).toEqual(state)
  expect((await runLiveCLI(discovery, args, 'redo()\nexit()\n')).exitCode).toBe(0)
  expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(41)
  editor.canvas.assertNoErrors()
})
