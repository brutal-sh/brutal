import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import { copyOwnedDiscovery, disconnectOwnedBridge } from '#tests/helpers/automation/cli/connection'
import { documentSnapshot, openOwnedDocuments } from '#tests/helpers/automation/cli/documents'
import { startLiveCLI } from '#tests/helpers/automation/cli/process'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

const editor = useIsolatedEditorSetupWithClear('/?test', mockEditorCopyServices)
const create =
  "create_shape({type:'RECTANGLE',name:'Must not be delivered',x:0,y:0,width:32,height:32})"

test('an identity change refuses a live session command without editing either owned document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const first = ids.at(0)
  if (!first) throw new Error('Missing owned document')
  const before = await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))
  const copy = await copyOwnedDiscovery(discovery)
  const cli = startLiveCLI(copy.path, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    await copy.replace()
    cli.send(create)
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.errors()).toContain('connection changed')
    expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
    await copy.cleanup()
  }
})

test('a disconnected real bridge refuses a session command without editing either document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const first = ids.at(0)
  if (!first) throw new Error('Missing owned document')
  const before = await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))
  const cli = startLiveCLI(discovery, ['interactive', '-a', 'desktop', '--document-id', first])
  try {
    await expect.poll(cli.output).toContain(first)
    expect((await disconnectOwnedBridge(editor.page)).ok).toBe(true)
    await expect
      .poll(async () => {
        const response = await editor.page.request.get(
          `http://127.0.0.1:${process.env.OPENPENCIL_TEST_MCP_PORT}/health`
        )
        return (await response.text()).includes('"status":"no_app"')
      })
      .toBe(true)
    cli.send(create)
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect(cli.errors()).toContain('Open Pen app is not connected')
    expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})
