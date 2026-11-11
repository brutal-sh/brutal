import { readFileSync } from 'node:fs'

import { expect, type Page, type Route } from '@playwright/test'

import type { CanvasHelper } from '#tests/helpers/canvas'
import { testPath } from '#tests/helpers/paths'

interface WorkspaceRequests {
  fullDocumentGets: number
  rangeGets: number
}

async function fulfillRange(route: Route, fixture: Buffer, requests: WorkspaceRequests) {
  const range = route.request().headers().range
  const explicit = range?.match(/^bytes=(\d+)-(\d+)$/)
  const suffix = range?.match(/^bytes=-(\d+)$/)
  let start: number
  let end: number
  if (explicit) {
    start = Number(explicit[1])
    end = Math.min(Number(explicit[2]), fixture.byteLength - 1)
  } else if (suffix) {
    const length = Math.min(Number(suffix[1]), fixture.byteLength)
    start = fixture.byteLength - length
    end = fixture.byteLength - 1
  } else {
    await route.fulfill({ status: 416 })
    return
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    await route.fulfill({ status: 416 })
    return
  }
  await route.fulfill({
    status: 206,
    headers: { 'Content-Range': `bytes ${start}-${end}/${fixture.byteLength}` },
    contentType: 'application/octet-stream',
    body: fixture.subarray(start, end + 1)
  })
  requests.rangeGets++
}

async function fulfillWorkspace(route: Route, fixture: Buffer, requests: WorkspaceRequests) {
  const url = new URL(route.request().url())
  if (url.searchParams.get('list-type') === '2') {
    await route.fulfill({
      contentType: 'application/xml',
      body: `<ListBucketResult>
        <IsTruncated>false</IsTruncated>
        <Contents>
          <Key>open_pencil_storage/canvases/remote-1.fig</Key>
          <LastModified>2026-01-02T03:04:05.000Z</LastModified>
          <Size>${fixture.byteLength}</Size>
        </Contents>
      </ListBucketResult>`
    })
    return
  }
  if (url.pathname.endsWith('/remote-1.meta.json')) {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'Remote design', updatedAt: '2026-01-02T03:04:05.000Z' })
    })
    return
  }
  if (url.pathname.endsWith('/remote-1.fig') && route.request().headers().range) {
    await fulfillRange(route, fixture, requests)
    return
  }
  if (url.pathname.endsWith('/remote-1.fig') && route.request().method() === 'HEAD') {
    await route.fulfill({ status: 200, headers: { 'Content-Length': String(fixture.byteLength) } })
    return
  }
  if (url.pathname.endsWith('/remote-1.fig')) {
    requests.fullDocumentGets++
    await route.fulfill({ contentType: 'application/octet-stream', body: fixture })
    return
  }
  await route.fulfill({ status: 404 })
}

export async function mockStorageWorkspace(page: Page, fixtureName = 'gold-preview.fig') {
  const fixture = readFileSync(testPath('fixtures', fixtureName))
  const requests: WorkspaceRequests = { fullDocumentGets: 0, rangeGets: 0 }
  await page.route('https://s3.example.com/**', (route) =>
    fulfillWorkspace(route, fixture, requests)
  )
  return requests
}

export async function mockStorageUploads(page: Page) {
  const objects = new Map<string, Buffer>()
  await page.route('https://s3.example.com/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const key = decodeURIComponent(url.pathname.replace(/^\/designs\/?/, ''))
    const prefix = url.searchParams.get('prefix')
    if (url.searchParams.get('list-type') === '2' && prefix !== null) {
      const contents = [...objects]
        .filter(([name]) => name.startsWith(prefix))
        .map(
          ([name, body]) =>
            `<Contents><Key>${name}</Key><LastModified>2026-01-02T03:04:05.000Z</LastModified><Size>${body.byteLength}</Size></Contents>`
        )
      await route.fulfill({
        contentType: 'application/xml',
        body: `<ListBucketResult><IsTruncated>false</IsTruncated>${contents.join('')}</ListBucketResult>`
      })
      return
    }
    if (request.method() === 'PUT') {
      objects.set(key, request.postDataBuffer() ?? Buffer.alloc(0))
      await route.fulfill({ status: 200, headers: { ETag: '"etag"' } })
      return
    }
    const body = objects.get(key)
    if (!body) {
      await route.fulfill({ status: 404 })
      return
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Length': String(body.byteLength) },
      body: request.method() === 'HEAD' ? undefined : body
    })
  })
  return objects
}

export async function configureTestStorage(page: Page) {
  const panel = page.getByTestId('settings-storage-panel')
  await panel.getByRole('button', { name: /S3 storage/ }).click()
  await panel.getByLabel('Endpoint').fill('https://s3.example.com')
  await panel.getByLabel('Bucket').fill('designs')
  await panel.getByLabel('Access key ID').fill('access-key')
  await panel.getByLabel('Secret access key').fill('secret-key')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

export async function exerciseStorageEdit(canvas: CanvasHelper) {
  await canvas.drawRect(100, 120, 120, 90)
  const id = await canvas.page.evaluate(() => {
    const node = window.openPencil?.getStore?.()?.getSelectedNodes()[0]
    if (node?.type !== 'RECTANGLE') throw new Error('Drawn storage rectangle missing')
    return node.id
  })
  await canvas.undo()
  await expect
    .poll(() =>
      canvas.page.evaluate((id) => window.openPencil?.getStore?.()?.graph.getNode(id) ?? null, id)
    )
    .toBeNull()
}
