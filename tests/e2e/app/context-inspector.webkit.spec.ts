import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('Context edits undo, save to .pen and reopen without losing the imported text', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'context.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'context-frame',
            name: 'Context frame',
            type: 'frame',
            width: 320,
            height: 180,
            context: 'Imported context',
            fill: '#fff'
          },
          {
            id: 'other',
            name: 'Other frame',
            type: 'frame',
            width: 100,
            height: 80,
            x: 500,
            context: 'Other context'
          }
        ]
      })
    )
  })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Context frame' }).click()
  const context = page.getByRole('textbox', { name: 'Context information', exact: true })
  await expect(context).toHaveValue('Imported context')
  await context.fill('Edited context\nKeep this on save.')
  await context.press('Tab')
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(context).toHaveValue('Imported context')
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(context).toHaveValue('Edited context\nKeep this on save.')
  await context.fill('Final context on selection')
  await page.getByTestId('layers-item').filter({ hasText: 'Other frame' }).click()
  await expect(context).toHaveValue('Other context')
  await page.getByTestId('layers-item').filter({ hasText: 'Context frame' }).click()
  await expect(context).toHaveValue('Final context on selection')
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await download
  const bytes = await readFile(await saved.path())
  expect(
    parsePenDocument(bytes.toString()).children.find((node) => node.id === 'context-frame')?.context
  ).toBe('Final context on selection')
  const reopen = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await reopen
  ).setFiles({ name: 'context-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Context frame' }).click()
  await expect(context).toHaveValue('Final context on selection')
})

test('leaving a long Context keeps the text and returns its viewport to the first line', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  await page.getByRole('button', { name: 'Context', exact: true }).click()
  const context = page.getByRole('textbox', { name: 'Context information', exact: true })
  const value = Array.from({ length: 20 }, (_, index) => `Independent line ${index + 1}`).join('\n')
  await context.fill(value)
  await context.evaluate((field) => {
    field.scrollTop = field.scrollHeight
  })
  expect(await context.evaluate((field) => field.scrollTop)).toBeGreaterThan(0)
  await context.press('Tab')
  await expect(context).toHaveValue(value)
  expect(await context.evaluate((field) => field.scrollTop)).toBe(0)
})

test('inspector layer name commits once, supports cancellation and Undo, and creates a component', async ({
  page
}, testInfo) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  const inspector = page.getByTestId('properties-panel')
  const name = inspector.getByRole('textbox', { name: 'Layer name', exact: true })
  await name.fill('Renamed layer')
  await name.press('Enter')
  await expect(name).toHaveValue('Renamed layer')
  await name.fill('Discard this name')
  await name.press('Escape')
  await expect(name).toHaveValue('Renamed layer')
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Renamed layer' })).toBeVisible()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(name).toHaveValue('Rectangle 1')
  await expect(inspector.getByRole('region', { name: 'Alignment', exact: true })).toBeVisible()
  await expect(inspector.getByRole('region', { name: 'Position', exact: true })).toBeVisible()
  await inspector.screenshot({ path: testInfo.outputPath('inspector-structure.png') })
  await inspector.getByRole('button', { name: 'Create Component', exact: true }).click()
  await page.getByRole('tab', { name: 'Components', exact: true }).click()
  await expect(page.getByTestId('assets-panel').getByTestId('asset-item')).toHaveCount(1)
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(
    inspector.getByRole('button', { name: 'Create Component', exact: true })
  ).toBeEnabled()
})

test('inline inspector HTML export renders the selected layer without changing it', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  const before = await page.evaluate(() => window.openPencil?.getStore?.().state.sceneVersion)
  await expect(page.getByRole('textbox', { name: 'Context information', exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Context', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Context information', exact: true })
  ).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export HTML', exact: true }).click()
  const html = (await readFile(await (await download).path())).toString()
  expect(html).toMatch(/<!doctype html>/i)
  expect(html).toContain('120')
  const preview = await page.context().newPage()
  try {
    await preview.setContent(html)
    const exported = preview.locator('[data-layer-name]').first()
    await expect(exported).toHaveCSS('width', '120px')
    await expect(exported).toHaveCSS('height', '80px')
  } finally {
    await preview.close()
  }

  expect(await page.evaluate(() => window.openPencil?.getStore?.().state.sceneVersion)).toBe(before)
})

test('inspector export settings affect annotations, centering, scaffold and external assets', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(150, 150, 120, 80)
  await page.getByRole('button', { name: 'Code export settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Code export settings', exact: true })
  await settings.getByRole('checkbox', { name: 'Include layer names', exact: true }).uncheck()
  await settings.getByRole('checkbox', { name: 'Include layer IDs', exact: true }).check()
  await settings.getByRole('checkbox', { name: 'Center body contents', exact: true }).uncheck()
  await settings.getByRole('combobox', { name: 'Select asset export mode', exact: true }).click()
  await page.getByRole('option', { name: 'Relative paths (ZIP bundle)', exact: true }).click()
  await page.keyboard.press('Escape')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export HTML', exact: true }).click()
  const result = await download
  expect(result.suggestedFilename()).toMatch(/\.zip$/)
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(await readFile(await result.path()))
  const htmlFile = Object.keys(files).find((path) => path.endsWith('.html'))
  if (!htmlFile) throw new Error('Missing exported page')
  const html = strFromU8(files[htmlFile])
  expect(html).toContain('data-open-pencil-node-id')
  expect(html).not.toContain('data-layer-name')
  const preview = await page.context().newPage()
  try {
    await preview.route('https://export.test/**', async (route) => {
      const path = decodeURIComponent(new URL(route.request().url()).pathname.slice(1))
      const content = files[path]
      if (!content) return route.abort()
      await route.fulfill({
        body: Buffer.from(content),
        contentType: path.endsWith('.css') ? 'text/css' : 'text/html'
      })
    })
    await preview.goto(`https://export.test/${htmlFile}`)
    await expect(preview.locator('[data-open-pencil-node-id]').first()).toHaveCSS('width', '120px')
    await expect(preview.locator('body')).toHaveCSS('display', 'block')
  } finally {
    await preview.close()
  }
  await page.getByRole('button', { name: 'Code export settings', exact: true }).click()
  await settings.getByRole('checkbox', { name: 'Include HTML scaffold', exact: true }).uncheck()
  await settings.getByRole('combobox', { name: 'Select asset export mode', exact: true }).click()
  await page
    .getByRole('option', { name: 'Embed assets (self-contained document)', exact: true })
    .click()
  await page.keyboard.press('Escape')
  const fragmentDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export HTML', exact: true }).click()
  const fragment = (await readFile(await (await fragmentDownload).path())).toString()
  expect(fragment).not.toMatch(/<!doctype html>|<html|<body/i)
  expect(fragment).toContain('data-open-pencil-node-id')
})
