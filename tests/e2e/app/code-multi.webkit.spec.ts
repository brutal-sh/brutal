import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

import type { PenNode } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { layerDriver } from '#tests/helpers/canvas/layers'
import { openAppMenu } from '#tests/helpers/menu'

async function setup(page: Page, children?: PenNode[]) {
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
    name: 'multi-code.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: children ?? [
          {
            id: 'code-a',
            type: 'frame',
            name: 'Code A',
            x: 0,
            y: 0,
            width: 120.5,
            height: 80.75,
            layout: 'none',
            fill: '#7799BB'
          },
          {
            id: 'code-b',
            type: 'frame',
            name: 'Code B',
            x: 180,
            y: 0,
            width: 80.25,
            height: 45.5,
            layout: 'none',
            fill: '#AA6677'
          },
          {
            id: 'code-c',
            type: 'frame',
            name: 'Unselected C',
            x: 400,
            y: 0,
            width: 50,
            height: 50,
            layout: 'none',
            fill: '#22AA66'
          }
        ]
      })
    )
  })
  await canvas.waitForInit()
  if (children) await layerDriver(() => page).select(['code-a', 'code-b'])
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Code A' }).click()
  await page
    .getByTestId('layers-item')
    .filter({ hasText: 'Code B' })
    .click({ modifiers: ['Shift'] })
  const section = page
    .getByTestId('properties-panel')
    .getByRole('region', { name: 'Code', exact: true })
  return { canvas, section }
}

async function exportBytes(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export HTML', exact: true }).click()
  const result = await download
  return { name: result.suggestedFilename(), bytes: await readFile(await result.path()) }
}

for (const format of ['HTML + Tailwind', 'HTML + CSS']) {
  test(`multi-selection ${format} exports one positioned document containing only the selected roots`, async ({
    page
  }) => {
    const { canvas, section } = await setup(page)
    await expect(section).toBeVisible()
    await section.getByRole('combobox', { name: 'Select code export format', exact: true }).click()
    await page.getByRole('option', { name: format, exact: true }).click()
    const before = await page.evaluate(() => ({
      version: window.openPencil?.getStore?.().state.sceneVersion,
      selected: [...(window.openPencil?.getStore?.().state.selectedIds ?? [])]
    }))
    const { name, bytes } = await exportBytes(page)
    expect(name).toBe('multi-code-export.html')
    const html = bytes.toString()
    expect(html).not.toContain('Unselected C')
    const preview = await page.context().newPage()
    try {
      await preview.setContent(html)
      const first = preview.locator('[data-layer-name="Code A"]')
      const second = preview.locator('[data-layer-name="Code B"]')
      await expect(first).toHaveCSS('width', '120.5px')
      await expect(first).toHaveCSS('height', '80.75px')
      await expect(second).toHaveCSS('width', '80.25px')
      await expect(second).toHaveCSS('height', '45.5px')
      await expect(first).toHaveCSS('background-color', 'rgb(119, 153, 187)')
      await expect(second).toHaveCSS('background-color', 'rgb(170, 102, 119)')
      const a = await first.boundingBox()
      const b = await second.boundingBox()
      const stage = await first.locator('..').boundingBox()
      if (!a || !b || !stage) throw new Error('Exported geometry missing')
      expect([b.x - a.x, b.y - a.y, stage.width, stage.height]).toEqual([180, 0, 260.25, 80.75])
    } finally {
      await preview.close()
    }
    expect(
      await page.evaluate(() => ({
        version: window.openPencil?.getStore?.().state.sceneVersion,
        selected: [...(window.openPencil?.getStore?.().state.selectedIds ?? [])]
      }))
    ).toEqual(before)
    canvas.assertNoErrors()
  })
}

test('multi-selection Code settings apply to both roots in a fragment and a single external bundle', async ({
  page
}) => {
  const { canvas, section } = await setup(page)
  await expect(section).toBeVisible()
  await section.getByRole('button', { name: 'Code export settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Code export settings', exact: true })
  await settings.getByRole('checkbox', { name: 'Include layer names', exact: true }).uncheck()
  await settings.getByRole('checkbox', { name: 'Include layer IDs', exact: true }).check()
  await settings.getByRole('checkbox', { name: 'Include HTML scaffold', exact: true }).uncheck()
  await expect(
    settings.getByRole('checkbox', { name: 'Center body contents', exact: true })
  ).toBeEnabled()
  await page.keyboard.press('Escape')
  const fragment = (await exportBytes(page)).bytes.toString()
  expect(fragment).not.toMatch(/<!doctype html>|<html|<body/i)
  expect(fragment).not.toContain('data-layer-name')
  expect(fragment).toContain('data-open-pencil-node-id="code-a"')
  expect(fragment).toContain('data-open-pencil-node-id="code-b"')
  expect(fragment).not.toContain('data-open-pencil-node-id="code-c"')
  await section.getByRole('button', { name: 'Code export settings', exact: true }).click()
  await settings.getByRole('checkbox', { name: 'Include HTML scaffold', exact: true }).check()
  await settings.getByRole('combobox', { name: 'Select asset export mode', exact: true }).click()
  await page.getByRole('option', { name: 'Relative paths (ZIP bundle)', exact: true }).click()
  await page.keyboard.press('Escape')
  const bundle = await exportBytes(page)
  expect(bundle.name).toMatch(/\.zip$/)
  const files = unzipSync(bundle.bytes)
  const htmlFiles = Object.keys(files).filter((name) => name.endsWith('.html'))
  expect(htmlFiles).toHaveLength(1)
  const html = strFromU8(files[htmlFiles[0]])
  expect(html).toContain('data-open-pencil-node-id="code-a"')
  expect(html).toContain('data-open-pencil-node-id="code-b"')
  expect(html).not.toContain('data-open-pencil-node-id="code-c"')
  expect(Object.keys(files).some((name) => name.endsWith('.css'))).toBe(true)
  const preview = await page.context().newPage()
  try {
    await preview.route('https://multi-export.test/**', async (route) => {
      const path = decodeURIComponent(new URL(route.request().url()).pathname.slice(1))
      const content = files[path]
      if (!content) return route.abort()
      await route.fulfill({
        body: Buffer.from(content),
        contentType: path.endsWith('.css') ? 'text/css' : 'text/html'
      })
    })
    await preview.goto(`https://multi-export.test/${htmlFiles[0]}`)
    await expect(preview.locator('[data-open-pencil-node-id="code-a"]')).toHaveCSS(
      'width',
      '120.5px'
    )
    await expect(preview.locator('[data-open-pencil-node-id="code-b"]')).toHaveCSS(
      'width',
      '80.25px'
    )
  } finally {
    await preview.close()
  }
  canvas.assertNoErrors()
})

test('multi-selection Copy HTML hands both selected roots to the browser clipboard integration', async ({
  page
}) => {
  const { canvas, section } = await setup(page)
  await expect(section).toBeVisible()
  const clipboard = await page.evaluateHandle(() => {
    const target = navigator.clipboard
    const originalWrite = target.write
    const originalExec = document.execCommand
    let copied = ''
    target.write = async (items) => {
      const item = items.find((item) => item.types.includes('text/plain'))
      if (!item) throw new Error('Missing plain-text clipboard item')
      copied = await (await item.getType('text/plain')).text()
    }
    document.execCommand = (command, ...args) => {
      if (command.toLowerCase() !== 'copy') return originalExec.call(document, command, ...args)
      const active = document.activeElement
      copied =
        active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement
          ? active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0)
          : (document.getSelection()?.toString() ?? '')
      return true
    }
    return {
      read: () => copied,
      restore: () => {
        target.write = originalWrite
        document.execCommand = originalExec
      }
    }
  })
  try {
    await section.getByRole('button', { name: 'Copy HTML', exact: true }).click()
    await expect(section.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
    const html = await clipboard.evaluate((probe) => probe.read())
    expect(html).toContain('data-layer-name="Code A"')
    expect(html).toContain('data-layer-name="Code B"')
    expect(html).not.toContain('Unselected C')
  } finally {
    await clipboard.evaluate((probe) => probe.restore())
    await clipboard.dispose()
  }
  canvas.assertNoErrors()
})

for (const format of ['HTML + Tailwind', 'HTML + CSS']) {
  test(`multi-selection ${format} matches Pen's local root placement and selection order`, async ({
    page
  }) => {
    const { canvas, section } = await setup(page, [
      {
        id: 'parent-a',
        type: 'frame',
        name: 'Parent A',
        x: 100,
        y: 40,
        width: 300,
        height: 200,
        layout: 'none',
        children: [
          {
            id: 'code-a',
            type: 'rectangle',
            name: 'Code A',
            x: 0,
            y: 0,
            width: 120,
            height: 80,
            fill: '#FF0000'
          }
        ]
      },
      {
        id: 'parent-b',
        type: 'frame',
        name: 'Parent B',
        x: 150,
        y: 60,
        width: 300,
        height: 200,
        layout: 'none',
        rotation: -90,
        children: [
          {
            id: 'code-b',
            type: 'frame',
            name: 'Code B',
            x: 0,
            y: 0,
            width: 80,
            height: 50,
            layout: 'none',
            fill: '#0000FF'
          }
        ]
      }
    ])
    await layerDriver(() => page).select(['code-b', 'code-a'])
    await expect(section).toBeVisible()
    await section.getByRole('combobox', { name: 'Select code export format', exact: true }).click()
    await page.getByRole('option', { name: format, exact: true }).click()
    const html = (await exportBytes(page)).bytes.toString()
    const preview = await page.context().newPage()
    try {
      await preview.setContent(html)
      const first = preview.locator('[data-layer-name="Code A"]')
      const second = preview.locator('[data-layer-name="Code B"]')
      const a = await first.boundingBox()
      const b = await second.boundingBox()
      if (!a || !b) throw new Error('Exported selected-root geometry missing')
      // Actual Pen's owned native export omits ancestor placement/rotation and retains selection order.
      expect([b.x - a.x, b.y - a.y, b.width, b.height]).toEqual([0, 0, 80, 50])
      expect(
        await preview
          .locator('.op-stage > [data-layer-name]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-layer-name')))
      ).toEqual(['Code B', 'Code A'])
      expect(
        await preview.evaluate(
          ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-layer-name'),
          { x: b.x + 10, y: b.y + 10 }
        )
      ).toBe('Code A')
      await expect(preview.locator('.op-stage')).toHaveCSS('width', '120px')
      await expect(preview.locator('.op-stage')).toHaveCSS('height', '80px')
    } finally {
      await preview.close()
    }
    canvas.assertNoErrors()
  })
}
