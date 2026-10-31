import { readFile } from 'node:fs/promises'

import { unzipSync } from 'fflate'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { fragmentShaderOf, readShaderPaints } from '@open-pencil/scene-graph/shaders'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { shaderDriver } from '#tests/helpers/canvas/shader-driver'
import { openAppMenu } from '#tests/helpers/menu'
import { repoPath, testPath } from '#tests/helpers/paths'
import { propertyItems } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear('/?test&no-rulers')
const shader = shaderDriver(() => editor.page)

test('snapshot reports unsupported content without opening a deliverable or changing the design', async () => {
  const { page } = editor
  const extraPage = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.addPage('Second').id
  })
  try {
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: 'Export Snapshot…', exact: true })
      .click()
    const error = page.getByRole('region', { name: /Notifications/ }).getByRole('listitem')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('data-tone', 'error')
    await expect(
      page.getByRole('dialog', { name: 'Export snapshot', exact: true })
    ).not.toBeVisible()
    expect(await page.evaluate(() => window.openPencil?.getStore?.().graph.getPages().length)).toBe(
      2
    )
  } finally {
    await page.evaluate((id) => window.openPencil?.getStore?.().graph.deleteNode(id), extraPage)
  }
})

test('File snapshot previews dependencies, cancels safely and downloads a relocatable design', async () => {
  const { page, canvas } = editor
  await canvas.drawRect(300, 300, 320, 240)
  await propertyItems(page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  await page.getByRole('button', { name: 'Shader', exact: true }).click()
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose shader file', exact: true }).click()
  await (await choosing).setFiles(testPath('fixtures/shaders/checks.glsl'))
  await expect.poll(async () => (await shader.read())?.fragment?.url).toBe('checks.glsl')
  const size = page.getByRole('spinbutton', { name: 'Size', exact: true })
  await size.focus()
  await size.fill('24')
  await size.press('Tab')
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms.u_size).toBe(24)
  await shader.settle()
  await page.keyboard.press('Escape')
  const before = await getSelectedNode(page)
  const original = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return {
      name: store.state.documentName,
      path: store.getDocumentFilePath(),
      dirty: store.hasUnsavedChanges()
    }
  })
  async function openSnapshot() {
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: 'Export Snapshot…', exact: true })
      .click()
    return page.getByRole('dialog', { name: 'Export snapshot', exact: true })
  }
  const dialog = await openSnapshot()
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleDescription(/ZIP/)
  await dialog.screenshot({ path: repoPath('local-evidence/openpen-snapshot-dialog-browser.png') })
  await dialog.locator('summary').click()
  await expect(dialog.getByRole('listitem')).toHaveText('checks.glsl')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await openSnapshot()
  // The browser without File System Access delivers a download rather than an OS picker.
  await page.evaluate(() => {
    window.showSaveFilePicker = undefined
  })
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Export Snapshot', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Untitled-snapshot.zip')
  const path = await download.path()
  expect(path).toBeTruthy()
  if (!path) throw new Error('Snapshot download unavailable')
  const archive = unzipSync(await readFile(path))
  expect(Object.keys(archive).sort()).toEqual(['Untitled.pen', 'shaders/1.glsl'])
  const requested: string[] = []
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const { graph } = await io.readDocument({
    name: 'different-machine/Untitled.pen',
    data: archive['Untitled.pen'],
    readAsset: async (asset) => {
      requested.push(asset)
      return archive[asset] ?? null
    }
  })
  expect(requested).toEqual(['shaders/1.glsl'])
  const reopened = before && graph.getNode(before.id)
  expect(reopened).toBeTruthy()
  if (!reopened) throw new Error('Snapshot lost the selected layer')
  expect(fragmentShaderOf(readShaderPaints(reopened)[0].preset)?.source).toBe(
    await readFile(testPath('fixtures/shaders/checks.glsl'), 'utf8')
  )
  expect(fragmentShaderOf(readShaderPaints(reopened)[0].preset)?.uniforms).toEqual({ u_size: 24 })
  await expect(dialog).not.toBeVisible()
  expect(await getSelectedNode(page)).toEqual(before)
  expect(
    await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      return {
        name: store.state.documentName,
        path: store.getDocumentFilePath(),
        dirty: store.hasUnsavedChanges()
      }
    })
  ).toEqual(original)
  await canvas.undo()
  await expect.poll(async () => (await shader.read())?.fragment?.uniforms).toEqual({})
  canvas.assertNoErrors()
})
