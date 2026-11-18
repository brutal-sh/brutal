import type { Client } from '@modelcontextprotocol/client'
import * as v from 'valibot'

import { appStateSchema } from '@open-pencil/core/tools/read/schema'

import { expect, test } from '#tests/e2e/fixtures'
import {
  holdOwnedEditorLock,
  observeSelectionRequests
} from '#tests/helpers/automation/cli/cancellation'
import {
  closeOwnedMCP,
  connectOwnedMCP,
  connectOwnedStdioMCP
} from '#tests/helpers/automation/cli/mcp'
import {
  openSelectionDocuments,
  selectionCheckpoint
} from '#tests/helpers/automation/cli/selection'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

function select(client: Client, document: string, ids: string[], signal?: AbortSignal) {
  return client.callTool(
    { name: 'select_nodes', arguments: { document_id: document, ids } },
    { signal }
  )
}

async function readState(client: Client, document: string) {
  const result = await client.callTool({
    name: 'get_app_state',
    arguments: { document_id: document }
  })
  expect(result.isError).not.toBe(true)
}

async function assertLateCancellation(
  client: Client,
  document: string,
  controller: AbortController
) {
  controller.abort()
  const result = await client.callTool({
    name: 'get_app_state',
    arguments: { document_id: document }
  })
  expect(result.isError).not.toBe(true)
  const content = result.content[0]
  if (!content || content.type !== 'text') throw new Error('Missing app state text')
  const state = v.parse(v.pipe(v.string(), v.parseJson(), appStateSchema), content.text)
  expect(state.selection.map((node) => node.id)).toEqual(['owned-a'])
}

for (const transport of ['http', 'stdio']) {
  const connect = transport === 'http' ? connectOwnedMCP : connectOwnedStdioMCP
  for (const cancel of [false, true]) {
    test(`real MCP ${transport} queued selection ${cancel ? 'cannot apply after cancellation' : 'applies after release'}`, async ({
      page
    }) => {
      await mockEditorCopyServices(page)
      const { requests: received, cancelled } = observeSelectionRequests(page)
      const canvas = new CanvasHelper(page)
      await page.goto('/?test')
      await canvas.waitForInit()
      const documents = await openSelectionDocuments(page, test.info().outputPath('owned.pen'))
      const client = await connect(documents.discovery)
      const lock = await holdOwnedEditorLock(page, documents.first)
      const before = await selectionCheckpoint(page, documents)
      const controller = new AbortController()
      try {
        const queued = select(client, documents.first, ['owned-a'], controller.signal).then(
          (result) => ({ result, error: null }),
          (error: unknown) => ({ result: null, error: String(error) })
        )
        await expect
          .poll(() => received.filter((request) => request.document === documents.first).length)
          .toBe(1)
        await readState(client, documents.first)
        expect(await selectionCheckpoint(page, documents)).toEqual(before)
        if (cancel) {
          controller.abort()
          expect((await queued).error).not.toBeNull()
          await expect.poll(() => cancelled.has(received[0]?.id ?? '')).toBe(true)
          await readState(client, documents.first)
        }
        await lock.evaluate((held) => held.releaseAndDrain())
        if (!cancel) expect((await queued).result?.isError).not.toBe(true)
        expect(await selectionCheckpoint(page, documents)).toEqual(
          cancel ? before : { ...before, view: { ...before.view, selection: ['owned-a'] } }
        )
        if (!cancel) await assertLateCancellation(client, documents.first, controller)
        expect((await select(client, documents.first, [documents.alternate])).isError).not.toBe(
          true
        )
        expect((await selectionCheckpoint(page, documents)).view.selection).toEqual([
          documents.alternate
        ])
        canvas.assertNoErrors()
      } finally {
        controller.abort()
        await lock.evaluate((held) => held.release())
        await lock.dispose()
        await closeOwnedMCP(client)
      }
    })
  }
  test(`real MCP ${transport} pre-aborted selection never dispatches`, async ({ page }) => {
    await mockEditorCopyServices(page)
    const { requests: received } = observeSelectionRequests(page)
    const canvas = new CanvasHelper(page)
    await page.goto('/?test')
    await canvas.waitForInit()
    const documents = await openSelectionDocuments(page, test.info().outputPath('owned.pen'))
    const client = await connect(documents.discovery)
    const before = await selectionCheckpoint(page, documents)
    const controller = new AbortController()
    controller.abort()
    try {
      await expect(
        select(client, documents.first, ['owned-a'], controller.signal)
      ).rejects.toThrow()
      await readState(client, documents.first)
      expect(received).toEqual([])
      expect(await selectionCheckpoint(page, documents)).toEqual(before)
      expect((await select(client, documents.first, [documents.alternate])).isError).not.toBe(true)
      expect((await selectionCheckpoint(page, documents)).view.selection).toEqual([
        documents.alternate
      ])
      canvas.assertNoErrors()
    } finally {
      await closeOwnedMCP(client)
    }
  })

  test(`real MCP ${transport} cancellation leaves a concurrent queued document untouched`, async ({
    page
  }) => {
    await mockEditorCopyServices(page)
    const { requests: received, cancelled } = observeSelectionRequests(page)
    const canvas = new CanvasHelper(page)
    await page.goto('/?test')
    await canvas.waitForInit()
    const documents = await openSelectionDocuments(page, test.info().outputPath('owned.pen'))
    const client = await connect(documents.discovery)
    const first = await holdOwnedEditorLock(page, documents.first)
    const other = await holdOwnedEditorLock(page, documents.second)
    const before = await selectionCheckpoint(page, documents)
    const controller = new AbortController()
    try {
      const outcome = select(client, documents.first, ['owned-a'], controller.signal).catch(String)
      const unaffected = select(client, documents.second, ['owned-b'])
      await expect.poll(() => received.length).toBe(2)
      await readState(client, documents.first)
      await readState(client, documents.second)
      controller.abort()
      expect(await outcome).toContain('Abort')
      const request = received.find((item) => item.document === documents.first)
      await expect.poll(() => cancelled.has(request?.id ?? '')).toBe(true)
      await readState(client, documents.first)
      await first.evaluate((held) => held.releaseAndDrain())
      expect(await selectionCheckpoint(page, documents)).toEqual(before)
      await other.evaluate((held) => held.releaseAndDrain())
      expect((await unaffected).isError).not.toBe(true)
      expect(await selectionCheckpoint(page, documents)).toEqual({
        ...before,
        otherView: { ...before.otherView, selection: ['owned-b'] }
      })
      canvas.assertNoErrors()
    } finally {
      controller.abort()
      for (const lock of [first, other]) {
        await lock.evaluate((held) => held.release())
        await lock.dispose()
      }
      await closeOwnedMCP(client)
    }
  })
}
