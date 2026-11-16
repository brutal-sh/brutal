import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import { privateDiscoveryDigest } from '#tests/helpers/automation/cli/connection'
import { documentSnapshot, openOwnedBinaryDocument } from '#tests/helpers/automation/cli/documents'
import { startLiveCLI } from '#tests/helpers/automation/cli/process'
import { createOwnedFig } from '#tests/helpers/automation/cli/reopen'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

const editor = useIsolatedEditorSetupWithClear('/?test', mockEditorCopyServices)

test('a replacement renderer on the same bridge cannot receive an old session edit', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const path = test.info().outputPath('owned-replacement.fig')
  const bytes = await createOwnedFig(discovery, path)
  const original = await openOwnedBinaryDocument(editor.page, bytes, 'original-owned.fig')
  const digest = await privateDiscoveryDigest(discovery)
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
    expect(await privateDiscoveryDigest(discovery)).toBe(digest)
    const replacement = await openOwnedBinaryDocument(editor.page, bytes, 'replacement-owned.fig')
    expect(replacement.pageId).toBe(original.pageId)
    const before = await documentSnapshot(editor.page, replacement.id)
    cli.send(
      "create_shape({type:'RECTANGLE',name:'Must not reach replacement',x:0,y:0,width:32,height:32})"
    )
    cli.send('exit()')
    cli.finish()
    const code = await cli.completed
    await test.info().attach('replacement-delivery', {
      body: JSON.stringify({
        original,
        replacement,
        code,
        stdout: cli.output(),
        stderr: cli.errors()
      }),
      contentType: 'application/json'
    })
    expect(code).toBe(1)
    expect(await documentSnapshot(editor.page, replacement.id)).toBe(before)
    expect(replacement.id).not.toBe(original.id)
    editor.canvas.assertNoErrors()
  } finally {
    cli.stop()
  }
})
