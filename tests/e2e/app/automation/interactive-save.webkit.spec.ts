import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  documentNodeX,
  documentSnapshot,
  openOwnedDocuments
} from '#tests/helpers/automation/cli/documents'
import { runLiveCLI, startLiveCLI } from '#tests/helpers/automation/cli/process'
import { connectedDocumentId, reopenOwnedNode } from '#tests/helpers/automation/cli/reopen'

const editor = useEditorSetupWithClear('/?test')

for (const format of ['pen', 'fig']) {
  test(`connected save writes ${format}; exit keeps later edits live without resaving`, async () => {
    const discovery = await liveTestDiscovery(editor.page)
    const [first, second] = await openOwnedDocuments(editor.page)
    if (!first || !second) throw new Error('Expected two owned documents')
    const before = await documentSnapshot(editor.page, second)
    const output = test.info().outputPath(`owned-copy.${format}`)
    const cli = startLiveCLI(discovery, [
      'interactive',
      '-a',
      'desktop',
      '--document-id',
      first,
      '-o',
      output
    ])
    try {
      await expect.poll(cli.output).toContain(first)
      cli.send("update_node({id:'owned-a',x:73})")
      cli.send('save()')
      await expect.poll(cli.output).toContain('"saved":true')
      const saved = await readFile(output)
      expect((await reopenOwnedNode(discovery, output, 'Owned a')).x).toBe(73)
      cli.send("update_node({id:'owned-a',x:94})")
      cli.send('exit()')
      cli.finish()
      expect(await cli.completed).toBe(0)
      expect(cli.errors()).toBe('')
      expect(await readFile(output)).toEqual(saved)
      expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(94)
      expect(await documentSnapshot(editor.page, second)).toBe(before)
      editor.canvas.assertNoErrors()
    } finally {
      cli.stop()
    }
  })
}

test('a refused connected save preserves bytes and a later explicit retry saves the live edits', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const [first, second] = await openOwnedDocuments(editor.page)
  if (!first || !second) throw new Error('Expected two owned documents')
  const before = await documentSnapshot(editor.page, second)
  const output = test.info().outputPath('read-only.pen')
  const original = Buffer.from('Owned existing read-only bytes')
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, original, { mode: 0o400 })
  const cli = startLiveCLI(discovery, [
    'interactive',
    '-a',
    'desktop',
    '--document-id',
    first,
    '-o',
    output
  ])
  try {
    await expect.poll(cli.output).toContain(first)
    cli.send("update_node({id:'owned-a',x:58})")
    const refusal = editor.page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().endsWith('/read-only.pen')
    )
    cli.send('save()')
    expect((await refusal).status()).toBe(400)
    await expect.poll(cli.errors).toContain('EACCES')
    expect(await readFile(output)).toEqual(original)
    expect((await stat(output)).mode & 0o777).toBe(0o400)
    expect(await documentNodeX(editor.page, first, 'owned-a')).toBe(58)
    await chmod(output, 0o600)
    cli.send('save()')
    await expect.poll(cli.output).toContain('"saved":true')
    cli.send('exit()')
    cli.finish()
    expect(await cli.completed).toBe(1)
    expect((await reopenOwnedNode(discovery, output, 'Owned a')).x).toBe(58)
    expect(await documentSnapshot(editor.page, second)).toBe(before)
    await expect
      .poll(() => editor.canvas.errors)
      .toEqual(['Failed to load resource: the server responded with a status of 400 (Bad Request)'])
    editor.canvas.errors.splice(0, 1)
    editor.canvas.assertNoErrors()
  } finally {
    await chmod(output, 0o600)
    cli.stop()
  }
})

test('a connected input path opens the intended owned file', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const before = await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))
  const input = test.info().outputPath('connected-input.pen')
  await mkdir(dirname(input), { recursive: true })
  await writeFile(
    input,
    JSON.stringify({
      version: '2.22',
      children: [
        {
          id: 'input-owned',
          type: 'rectangle',
          name: 'Connected input',
          width: 32,
          height: 32,
          fill: '#336699'
        }
      ]
    })
  )
  const result = await runLiveCLI(
    discovery,
    ['interactive', '-a', 'desktop', '-i', input],
    "update_node({id:'input-owned',x:46})\nexit()\n"
  )
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')
  expect(await documentNodeX(editor.page, connectedDocumentId(result.stdout), 'input-owned')).toBe(
    46
  )
  const document = await editor.page
    .getByRole('tab', { name: 'connected-input Unsaved changes', exact: true })
    .count()
  expect(document).toBe(1)
  expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
  expect((await reopenOwnedNode(discovery, input, 'Connected input')).x).toBe(0)
  editor.canvas.assertNoErrors()
})
