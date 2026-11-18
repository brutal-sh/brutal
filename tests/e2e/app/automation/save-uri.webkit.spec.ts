import { mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import { documentReadState, documentSnapshot } from '#tests/helpers/automation/cli/documents'
import {
  closeOwnedMCP,
  connectOwnedMCP,
  connectOwnedStdioMCP
} from '#tests/helpers/automation/cli/mcp'
import { reopenOwnedNode } from '#tests/helpers/automation/cli/reopen'
import {
  editOwnedSaveSource,
  openOwnedSaveSource
} from '#tests/helpers/automation/cli/save/fixtures'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

const editor = useIsolatedEditorSetupWithClear('/?test', mockEditorCopyServices)

for (const transport of ['http', 'stdio']) {
  const connect = transport === 'http' ? connectOwnedMCP : connectOwnedStdioMCP
  test(`real MCP ${transport} URI save writes its background source and reopens`, async () => {
    const discovery = await liveTestDiscovery(editor.page)
    const client = await connect(discovery)
    const path = test.info().outputPath('own #1.pen')
    try {
      const first = await openOwnedSaveSource(client, path)
      const otherPath = test.info().outputPath('other.pen')
      const second = await openOwnedSaveSource(client, otherPath)
      const otherBytes = await readFile(otherPath)
      const otherState = await documentReadState(editor.page, second)
      const otherGraph = await documentSnapshot(editor.page, second)
      await editOwnedSaveSource(client, first, 73)
      expect((await documentReadState(editor.page, first)).dirty).toBe(true)
      const result = await client.callTool({
        name: 'save',
        arguments: { uri: pathToFileURL(path).href }
      })
      expect(result.isError).not.toBe(true)
      expect((await reopenOwnedNode(discovery, path, 'URI owned shape')).x).toBe(73)
      expect((await stat(path)).mode & 0o777).toBe(0o600)
      expect((await documentReadState(editor.page, first)).dirty).toBe(false)
      expect(await readFile(otherPath)).toEqual(otherBytes)
      expect(await documentReadState(editor.page, second)).toEqual(otherState)
      expect(await documentSnapshot(editor.page, second)).toBe(otherGraph)
      await expect(editor.page.getByRole('tab', { name: 'other', exact: true })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      editor.canvas.assertNoErrors()
    } finally {
      await closeOwnedMCP(client)
    }
  })

  test(`real MCP ${transport} rejects unknown and malformed URI without effects`, async () => {
    const discovery = await liveTestDiscovery(editor.page)
    const client = await connect(discovery)
    const path = test.info().outputPath('source.pen')
    try {
      const document = await openOwnedSaveSource(client, path)
      await editOwnedSaveSource(client, document, 89)
      const bytes = await readFile(path)
      const graph = await documentSnapshot(editor.page, document)
      const state = await documentReadState(editor.page, document)
      for (const uri of [
        'https://owned.invalid/a.pen',
        pathToFileURL(path).href + '?bad=1',
        pathToFileURL(test.info().outputPath('absent.pen')).href,
        'file:///a%00.pen'
      ]) {
        expect((await client.callTool({ name: 'save', arguments: { uri } })).isError).toBe(true)
        expect(await readFile(path)).toEqual(bytes)
        expect(await documentSnapshot(editor.page, document)).toBe(graph)
        expect(await documentReadState(editor.page, document)).toEqual(state)
      }
      editor.canvas.assertNoErrors()
    } finally {
      await closeOwnedMCP(client)
    }
  })
}

test('the actual stdio disable-save flag removes both interfaces without changing files', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const client = await connectOwnedStdioMCP(discovery, ['--disable_save_tool'])
  try {
    const names = (await client.listTools()).tools.map((tool) => tool.name)
    expect(names).not.toContain('save')
    expect(names).not.toContain('save_file')
    expect(names).toContain('get_app_state')
    await expect(
      client.callTool({ name: 'save', arguments: { uri: 'file:///absent.pen' } })
    ).rejects.toThrow()
    await expect(client.callTool({ name: 'save_file', arguments: {} })).rejects.toThrow()
    editor.canvas.assertNoErrors()
  } finally {
    await closeOwnedMCP(client)
  }
})

test('URI Save refuses a symlink outside its root and accepts an in-root alias', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const client = await connectOwnedMCP(discovery)
  const outside = await mkdtemp(join(tmpdir(), 'open-pen-uri-outside-'))
  try {
    const path = test.info().outputPath('real.pen')
    const document = await openOwnedSaveSource(client, path)
    await editOwnedSaveSource(client, document, 61)
    const sentinel = join(outside, 'outside.pen')
    await writeFile(sentinel, 'owned outside sentinel', { mode: 0o600 })
    const escape = test.info().outputPath('escape.pen')
    await symlink(sentinel, escape)
    const bytes = await readFile(path)
    const state = await documentReadState(editor.page, document)
    expect(
      (await client.callTool({ name: 'save', arguments: { uri: pathToFileURL(escape).href } }))
        .isError
    ).toBe(true)
    expect(await readFile(sentinel, 'utf8')).toBe('owned outside sentinel')
    expect((await stat(sentinel)).mode & 0o777).toBe(0o600)
    expect(await readFile(path)).toEqual(bytes)
    expect(await documentReadState(editor.page, document)).toEqual(state)
    const alias = test.info().outputPath('alias.pen')
    await symlink(path, alias)
    expect(
      (await client.callTool({ name: 'save', arguments: { uri: pathToFileURL(alias).href } }))
        .isError
    ).not.toBe(true)
    expect((await reopenOwnedNode(discovery, path, 'URI owned shape')).x).toBe(61)
    editor.canvas.assertNoErrors()
  } finally {
    await closeOwnedMCP(client)
    await rm(outside, { recursive: true, force: true })
  }
})
