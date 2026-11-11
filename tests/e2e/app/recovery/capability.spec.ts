import { expect, test } from '@playwright/test'

import type * as RecoveryStoreModule from '@/app/document/recovery/idb'

test('recovery storage retains a real file capability across reload', async ({ page }) => {
  await page.route('**/recovery-origin-control', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Recovery file origin control</title>'
    })
  )
  await page.goto('/recovery-origin-control')
  await page.evaluate(async () => {
    const moduleURL = '/src/app/document/recovery/idb.ts'
    const { createIdbRecoveryStore }: typeof RecoveryStoreModule = await import(moduleURL)
    const directory = await navigator.storage.getDirectory()
    const handle = await directory.getFileHandle('retained.pen', { create: true })
    const writable = await handle.createWritable()
    await writable.write('original bytes')
    await writable.close()
    await createIdbRecoveryStore().write({
      id: 'retained',
      documentName: 'Retained',
      figBytes: new Uint8Array([1, 2]),
      source: { fileName: handle.name, identity: { handle, path: null } }
    })
  })
  await page.reload()
  const retained = await page.evaluate(async () => {
    const moduleURL = '/src/app/document/recovery/idb.ts'
    const { createIdbRecoveryStore }: typeof RecoveryStoreModule = await import(moduleURL)
    const snapshot = await createIdbRecoveryStore().read('retained')
    const handle = snapshot?.source?.identity.handle
    if (!snapshot || !handle) throw new Error('Retained file handle missing')
    return { bytes: Array.from(snapshot.figBytes), file: await (await handle.getFile()).text() }
  })
  expect(retained).toEqual({ bytes: [1, 2], file: 'original bytes' })
})
