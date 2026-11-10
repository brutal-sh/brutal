import { strict as assert } from 'node:assert'
import type { Server } from 'node:http'

import * as v from 'valibot'

import { previewStatusSchema } from '@/app/browser-preview/schema'

import { prepareNativeBrowserViewport } from '#tests/helpers/tauri/browser/preferences'
import { createNativeScreenshotFixture } from '#tests/helpers/tauri/browser/screenshot-fixture'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

const nativePreviewGeometrySchema = v.object({
  ...previewStatusSchema.entries,
  x: v.number(),
  y: v.number()
})

let server: Server | undefined
let origin = ''

before(async function () {
  if (process.platform !== 'darwin') return this.skip()
  const page = await createNativeScreenshotFixture()
  server = page.server
  origin = page.origin
})

after(async () => {
  const running = server
  if (running)
    await new Promise<void>((resolve, reject) => {
      running.close((error) => (error ? reject(error) : resolve()))
    })
})

async function status() {
  return v.parse(
    v.nullable(nativePreviewGeometrySchema),
    await invokeNative('browser_preview_status')
  )
}

async function navigate() {
  await $('button[aria-label="Import Web via Browser"]').click()
  const address = $('input[aria-label="Web address"]')
  await address.waitForEnabled()
  await address.setValue(origin + '/page')
  await browser.execute(() =>
    document.querySelector('input[aria-label="Web address"]')?.closest('form')?.requestSubmit()
  )
  await browser.waitUntil(async () => {
    const page = await status()
    return page?.url === origin + '/page' && !page.loading
  })
}

for (const preset of ['phone', 'tablet'] as const) {
  it(`aligns the ${preset} menu backdrop with its actual native CSS rectangle`, async () => {
    await prepareNativeBrowserViewport(preset)
    const fixture = await createNativeLayerFixture()
    await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
    try {
      await navigate()
      const version = await browser.execute(
        () => window.openPencil?.getStore?.().state.sceneVersion
      )
      assert.equal(typeof version, 'number')
      const camera = $('button[aria-label="Screenshot"]')
      await camera.waitForEnabled()
      await camera.click()
      await $('[data-browser-preview-popup][data-state="open"]').waitForDisplayed()
      const frame = await browser.execute(() => {
        const image = document.querySelector<HTMLImageElement>('[data-slot="browser-backdrop"]')
        if (!image?.complete || !image.naturalWidth) throw new Error('Backdrop was not decoded')
        const rect = image.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      })
      const native = await status()
      assert.ok(native)
      assert.equal(frame.width, native.width)
      assert.equal(frame.height, native.height)
      assert.ok(Math.abs(frame.x - native.x) <= 0.05)
      assert.ok(Math.abs(frame.y - native.y) <= 0.05)
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().state.sceneVersion),
        version
      )
    } finally {
      await browser.execute(() =>
        document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
      )
      await invokeNative('browser_preview_action', { action: 'close' })
    }
  })
}
