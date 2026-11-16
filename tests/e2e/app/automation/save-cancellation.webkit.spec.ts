import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import { expect, test } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import { documentReadState, documentSnapshot } from '#tests/helpers/automation/cli/documents'
import { connectOwnedMCP, connectOwnedStdioMCP } from '#tests/helpers/automation/cli/mcp'
import {
  editOwnedSaveSource,
  openOwnedSaveSource
} from '#tests/helpers/automation/cli/save/fixtures'
import {
  changeOwnedSaveTarget,
  holdOwnedSaveWrite,
  observeSaveRequests
} from '#tests/helpers/automation/cli/save/hold'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

for (const transport of ['http', 'stdio']) {
  const connect = transport === 'http' ? connectOwnedMCP : connectOwnedStdioMCP
  test(`real MCP ${transport} cancellation after encoding prevents a write and permits retry`, async ({
    page
  }) => {
    await mockEditorCopyServices(page)
    const observed = observeSaveRequests(page)
    const canvas = new CanvasHelper(page)
    await page.goto('/?test')
    await canvas.waitForInit()
    const client = await connect(await liveTestDiscovery(page))
    const path = test.info().outputPath('cancel.pen')
    const controller = new AbortController()
    const document = await openOwnedSaveSource(client, path)
    await editOwnedSaveSource(client, document, 93)
    const before = {
      bytes: await readFile(path),
      graph: await documentSnapshot(page, document),
      state: await documentReadState(page, document)
    }
    const held = await holdOwnedSaveWrite(page, document)
    try {
      const pending = client
        .callTool(
          { name: 'save', arguments: { uri: pathToFileURL(path).href } },
          { signal: controller.signal }
        )
        .catch(String)
      await held.evaluate((hold) => hold.entered())
      controller.abort()
      expect(typeof (await pending)).toBe('string')
      await expect.poll(() => observed.cancelled.has(observed.requests[0] ?? '')).toBe(true)
      expect(await held.evaluate((hold) => hold.release())).toContain('AbortError')
      expect(await readFile(path)).toEqual(before.bytes)
      expect(await documentSnapshot(page, document)).toBe(before.graph)
      expect(await documentReadState(page, document)).toEqual(before.state)
      await held.evaluate((hold) => hold.restore())
      expect(
        (await client.callTool({ name: 'save', arguments: { uri: pathToFileURL(path).href } }))
          .isError
      ).not.toBe(true)
      expect(await readFile(path)).not.toEqual(before.bytes)
      expect((await documentReadState(page, document)).dirty).toBe(false)
      canvas.assertNoErrors()
    } finally {
      controller.abort()
      await held.evaluate((hold) => hold.restore())
      await held.dispose()
      await client.close()
    }
  })
  for (const change of ['read-only', 'source'] as const) {
    test(`real MCP ${transport} refuses ${change} changes after encoding`, async ({ page }) => {
      await mockEditorCopyServices(page)
      const canvas = new CanvasHelper(page)
      await page.goto('/?test')
      await canvas.waitForInit()
      const client = await connect(await liveTestDiscovery(page))
      const path = test.info().outputPath('changing.pen')
      const document = await openOwnedSaveSource(client, path)
      await editOwnedSaveSource(client, document, 84)
      const before = await readFile(path)
      const held = await holdOwnedSaveWrite(page, document)
      try {
        const pending = client.callTool({
          name: 'save',
          arguments: { uri: pathToFileURL(path).href }
        })
        await held.evaluate((hold) => hold.entered())
        await changeOwnedSaveTarget(page, document, change)
        const state = await documentReadState(page, document)
        const graph = await documentSnapshot(page, document)
        expect(await held.evaluate((hold) => hold.release())).toContain('changed')
        expect((await pending).isError).toBe(true)
        expect(await readFile(path)).toEqual(before)
        expect(await documentReadState(page, document)).toEqual(state)
        expect(await documentSnapshot(page, document)).toBe(graph)
        canvas.assertNoErrors()
      } finally {
        await held.evaluate((hold) => hold.restore())
        await held.dispose()
        await client.close()
      }
    })
  }
}
