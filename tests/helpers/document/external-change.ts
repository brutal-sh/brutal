import { expect, type Page, type TestInfo } from '@playwright/test'

import {
  prepareExistingFileRecovery,
  readOwnedFile,
  showLayers
} from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'

const externalDesign = JSON.stringify({
  version: '2.21',
  children: [
    {
      id: 'external',
      type: 'rectangle',
      name: 'External version',
      width: 91,
      height: 53,
      fill: '#ef4444'
    }
  ]
})

export async function replaceOwnedFileExternally(page: Page) {
  await page.evaluate(async (content) => {
    const directory = await navigator.storage.getDirectory()
    const file = await directory.getFileHandle('existing.pen')
    const writable = await file.createWritable()
    await writable.write(content)
    await writable.close()
  }, externalDesign)
  return new TextEncoder().encode(externalDesign)
}

export async function prepareExternalChange(page: Page) {
  const state = await prepareExistingFileRecovery(page)
  await page.getByRole('tab', { name: /^existing\b/ }).click()
  await state.canvas.waitForInit()
  await showLayers(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  const backup = await recoveryBytes(page)
  const external = await replaceOwnedFileExternally(page)
  await expect(page.getByRole('alertdialog', { name: 'File changed', exact: true })).toBeVisible()
  return { ...state, backup, external }
}

export async function attachExternalBoundaries(
  page: Page,
  info: TestInfo,
  state: Awaited<ReturnType<typeof prepareExternalChange>>
) {
  await info.attach('owned-version-boundaries', {
    contentType: 'application/json',
    body: JSON.stringify({
      original: Array.from(state.original),
      external: Array.from(state.external),
      disk: Array.from(await readOwnedFile(page)),
      originalBackup: state.backup,
      currentBackup: await recoveryBytes(page),
      visibleLayers: await page.getByTestId('layers-item').allTextContents(),
      dirty: await page
        .getByRole('img', { name: 'Unsaved changes', includeHidden: true })
        .isVisible()
    })
  })
}

export async function interceptOwnedFileOperation(
  page: Page,
  operation: 'read' | 'copy' | 'hold-copy'
) {
  return page.evaluateHandle((operation) => {
    const method = operation === 'read' ? 'getFile' : 'createWritable'
    const name = operation === 'read' ? 'existing.pen' : 'conflict-copy.pen'
    const error = operation === 'read' ? 'NotReadableError' : 'QuotaExceededError'
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let started = false
    const prototype = FileSystemFileHandle.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method)
    if (!descriptor || typeof descriptor.value !== 'function')
      throw new Error('Owned file method missing')
    Object.defineProperty(prototype, method, {
      ...descriptor,
      value: async function (this: FileSystemFileHandle, ...args: unknown[]): Promise<unknown> {
        if (this.name === name) {
          started = true
          if (operation === 'hold-copy') await gate
          else throw new DOMException('Fixture operation refused', error)
        }
        return Reflect.apply(descriptor.value, this, args)
      }
    })
    return {
      started: () => started,
      release,
      restore: () => {
        release()
        Object.defineProperty(prototype, method, descriptor)
      }
    }
  }, operation)
}

export async function saveConflictCopy(page: Page) {
  await page.getByRole('alertdialog').getByRole('button', { name: 'Save as…', exact: true }).click()
}

export async function expectFailedConflictReload(page: Page, info?: TestInfo) {
  const refusal = await interceptOwnedFileOperation(page, 'read')
  try {
    const dialog = page.getByRole('alertdialog')
    await dialog.getByRole('button', { name: 'Reload', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveAttribute('data-tone', 'error')
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    if (info)
      await info.attach('conflict-read-failure', {
        body: await dialog.screenshot(),
        contentType: 'image/png'
      })
  } finally {
    await refusal.evaluate((gate) => gate.restore())
    await refusal.dispose()
  }
}
