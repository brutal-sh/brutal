import { expect, type Page } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import type { CanvasHelper } from '#tests/helpers/canvas'
import {
  pickOwnedFile,
  savePicker,
  readOwnedFile,
  showLayers
} from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import {
  recoveryRow,
  reloadRecovery,
  restoreDraft
} from '#tests/helpers/document/recovery/decisions'
import { openAppMenu } from '#tests/helpers/menu'

export const TARGET_NAME = 'target-file'
export const UNRELATED_NAME = 'unrelated-file'
export const TARGET_FILE = `${TARGET_NAME}.pen`
export const UNRELATED_FILE = `${UNRELATED_NAME}.pen`
export const COPY_FILE = 'target-copy.pen'

async function seedFile(page: Page, name: string, width: number) {
  await page.evaluate(
    async ({ name, width }) => {
      const directory = await navigator.storage.getDirectory()
      const handle = await directory.getFileHandle(name, { create: true })
      const writable = await handle.createWritable()
      await writable.write(
        JSON.stringify({
          version: '2.22',
          children: [{ id: 'original', type: 'rectangle', name, width, height: 64 }]
        })
      )
      await writable.close()
    },
    { name, width }
  )
}

async function editFile(page: Page, name: string) {
  const canvas = await pickOwnedFile(page, name)
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  // Fixture persistence isolates decisions; automatic debounce is covered separately.
  await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing existing-file editor')
    await store.persistRecoveryNow()
  })
  return canvas
}

export async function prepareFileDecisions(page: Page) {
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await seedFile(page, TARGET_FILE, 64)
  await seedFile(page, UNRELATED_FILE, 91)
  const targetOriginal = await readOwnedFile(page, TARGET_FILE)
  const unrelatedOriginal = await readOwnedFile(page, UNRELATED_FILE)
  await editFile(page, TARGET_FILE)
  const targetBackups = await recoveryBytes(page)
  expect(targetBackups).toHaveLength(1)
  const canvas = await editFile(page, UNRELATED_FILE)
  const both = await recoveryBytes(page)
  expect(both).toHaveLength(2)
  const unrelated = both.find((backup) => backup.digest !== targetBackups[0]?.digest)
  if (!unrelated) throw new Error('Missing distinct unrelated file backup')
  expect(await readOwnedFile(page, TARGET_FILE)).toEqual(targetOriginal)
  expect(await readOwnedFile(page, UNRELATED_FILE)).toEqual(unrelatedOriginal)
  await reloadRecovery(page)
  expect(await recoveryBytes(page)).toEqual(both)
  return { canvas, both, unrelated, targetOriginal, unrelatedOriginal }
}

export async function saveFileDecision(page: Page, saveAs = false) {
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: saveAs ? /^Save as…/ : /^Save(?:\s|$)/ })
    .first()
    .click()
  const active = page.getByTestId('tabbar-tab').and(page.locator('[aria-selected="true"]'))
  await expect(active).toBeVisible()
  await expect(active.getByRole('img', { name: 'Unsaved changes' })).toHaveCount(0)
}

export async function expectFileShapes(page: Page, name: string, width: number) {
  const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name,
    data: await readOwnedFile(page, name)
  })
  const rectangles = [...document.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
  expect(rectangles).toHaveLength(2)
  for (const rectangle of rectangles) expect(rectangle).toMatchObject({ width, height: 64 })
}

export async function finishUnrelatedFile(page: Page, canvas: CanvasHelper) {
  await restoreDraft(page, UNRELATED_NAME)
  await showLayers(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  expect(
    await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing restored unrelated file')
      return store.graph
        .getChildren(store.state.currentPageId)
        .map(({ width, height }) => ({ width, height }))
    })
  ).toEqual([
    { width: 91, height: 64 },
    { width: 91, height: 64 }
  ])
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await saveFileDecision(page)
  const tab = page.getByRole('tab', { name: UNRELATED_NAME, exact: true })
  await expect(tab).toBeVisible()
  await expect(tab.getByRole('img', { name: 'Unsaved changes' })).toHaveCount(0)
  await expectFileShapes(page, UNRELATED_FILE, 91)
  await page.getByRole('button', { name: 'Close unrelated-file', exact: true }).click()
  await pickOwnedFile(page, UNRELATED_FILE)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  canvas.assertNoErrors()
}

export type FileDecision = 'Save' | 'Save As' | 'Cancel' | 'Close' | 'Discard'

export async function decideFile(page: Page, decision: FileDecision) {
  if (decision === 'Discard') {
    await recoveryRow(page, TARGET_NAME)
      .getByRole('button', { name: 'Discard', exact: true })
      .click()
  } else if (decision === 'Close') {
    await page.getByRole('alertdialog').getByRole('button', { name: 'Close', exact: true }).click()
  } else {
    await restoreDraft(page, TARGET_NAME)
    if (decision === 'Cancel') {
      await page.getByTestId('tabbar-close').click()
      await page
        .getByRole('alertdialog', { name: /Save changes to/ })
        .getByRole('button', { name: 'Cancel', exact: true })
        .click()
      await expect(page.getByRole('tab', { name: /^target-file / })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    } else await saveRecoveredTarget(page, decision === 'Save As')
  }
}

async function saveRecoveredTarget(page: Page, saveAs: boolean) {
  const picker = saveAs ? await savePicker(page, COPY_FILE) : null
  try {
    await saveFileDecision(page, saveAs)
    await expectFileShapes(page, saveAs ? COPY_FILE : TARGET_FILE, 64)
  } finally {
    if (picker) {
      await picker.evaluate((restore) => restore())
      await picker.dispose()
    }
  }
}

export async function refuseTargetWrite(page: Page) {
  return page.evaluateHandle(() => {
    const prototype = FileSystemFileHandle.prototype
    const descriptor: TypedPropertyDescriptor<FileSystemFileHandle['createWritable']> | undefined =
      Object.getOwnPropertyDescriptor(prototype, 'createWritable')
    const original = descriptor?.value
    if (!original) throw new Error('Missing file write method')
    prototype.createWritable = async function (this: FileSystemFileHandle, options) {
      if (this.name === 'target-file.pen')
        throw new DOMException('Fixture target write refused', 'NotAllowedError')
      return original.call(this, options)
    }
    return () => {
      prototype.createWritable = original
    }
  })
}

export async function holdUnrelatedRestore(page: Page) {
  return page.evaluateHandle(() => {
    const prototype = Blob.prototype
    const descriptor: TypedPropertyDescriptor<Blob['arrayBuffer']> | undefined =
      Object.getOwnPropertyDescriptor(prototype, 'arrayBuffer')
    const original = descriptor?.value
    if (!original) throw new Error('Missing file byte reader')
    let started = false
    let release: (() => void) | undefined
    const reading = new Promise<void>((resolve) => {
      release = resolve
    })
    prototype.arrayBuffer = async function (this: Blob) {
      if (this instanceof File && this.name === 'unrelated-file.fig') {
        started = true
        await reading
      }
      return original.call(this)
    }
    return {
      started: () => started,
      release: () => release?.(),
      restore: () => {
        release?.()
        prototype.arrayBuffer = original
      }
    }
  })
}
