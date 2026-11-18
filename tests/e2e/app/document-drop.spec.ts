import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'
import { unzipSync, zipSync } from 'fflate'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { showLayers } from '#tests/helpers/document/existing-file-recovery'

test.beforeEach(({ page }) => mockOfficialCloudDiscovery(page))

/** Drops files on the canvas the way a drag from the desktop delivers them. */
async function dropOnCanvas(page: Page, files: Array<{ name: string; bytes: number[] }>) {
  await page.getByTestId('canvas-element').evaluate((canvas, dropped) => {
    const bounds = canvas.getBoundingClientRect()
    const transfer = new DataTransfer()
    for (const { name, bytes } of dropped)
      transfer.items.add(new File([new Uint8Array(bytes)], name))
    const options = {
      bubbles: true,
      cancelable: true,
      clientX: bounds.left + 200,
      clientY: bounds.top + 200,
      dataTransfer: transfer
    }
    canvas.dispatchEvent(new DragEvent('dragover', options))
    canvas.dispatchEvent(new DragEvent('drop', options))
  }, files)
}

test('a document dropped on the canvas opens in a new tab', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const tabs = page.getByRole('tablist').filter({ has: page.getByTestId('tabbar-tab') })

  const bytes = [...(await readFile('tests/fixtures/circle-text.fig'))]
  await dropOnCanvas(page, [{ name: 'circle-text.fig', bytes }])

  await expect(tabs.getByRole('tab').last()).toContainText('circle-text')
  await expect(tabs.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true')
})

test('a dropped FigJam board opens as an editable document tab', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const archive = unzipSync(await readFile('tests/fixtures/circle-text.fig'))
  // Use Figma Design fixture records in a synthetic FigJam envelope.
  archive['canvas.fig'].set(new TextEncoder().encode('fig-jam.'))
  await dropOnCanvas(page, [{ name: 'board.jam', bytes: [...zipSync(archive)] }])

  const tab = page.getByRole('tab', { name: 'board' })
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  await showLayers(page)
  const layer = page.getByTestId('layers-item').first()
  await expect(layer).toBeVisible()
  await layer.click()
  await expect(layer).toHaveAttribute('data-selected', 'true')
  canvas.assertNoErrors()
})

test('a dropped file that is neither a document nor an image reports that it cannot open', async ({
  page
}) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const tabs = page.getByRole('tablist').filter({ has: page.getByTestId('tabbar-tab') })

  await dropOnCanvas(page, [{ name: 'notes.txt', bytes: [...new TextEncoder().encode('hello')] }])

  await expect(page.getByText('Could not open “notes.txt”', { exact: false })).toBeVisible()
  await expect(tabs.getByRole('tab')).toHaveCount(1)
})

test('a design token file dropped on the canvas opens the variables import', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const tokens = { color: { $type: 'color', brand: { $value: '#2563eb' } } }

  await dropOnCanvas(page, [
    {
      name: 'brand.tokens.json',
      bytes: [...new TextEncoder().encode(JSON.stringify(tokens))]
    }
  ])

  await expect(page.getByRole('dialog', { name: 'Import design tokens' })).toBeVisible()
  await expect(page.getByText('Could not open', { exact: false })).toHaveCount(0)
  // The modal dialog hides the tab bar from the accessibility tree, so tabs are counted by id.
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)
})

test('an SVG dropped on the canvas is placed, not opened as a document', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const tabs = page.getByRole('tablist').filter({ has: page.getByTestId('tabbar-tab') })
  const tabName = (await tabs.getByRole('tab').first().textContent()) ?? ''
  const svg = '<svg width="20" height="20"><rect width="20" height="20" fill="#f00"/></svg>'

  await dropOnCanvas(page, [{ name: 'mark.svg', bytes: [...new TextEncoder().encode(svg)] }])

  await showLayers(page)
  await expect(page.getByTestId('layers-item').filter({ hasText: 'mark' })).toHaveCount(1)
  await expect(page.getByText('Could not open', { exact: false })).toHaveCount(0)
  await expect(tabs.getByRole('tab')).toHaveCount(1)
  await expect(tabs.getByRole('tab').first()).toHaveText(tabName)
})

test('unsupported .pen content reports its loss and preserves the current unsaved design', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(100, 100, 120, 80)
  const tabs = page.getByTestId('tabbar-tab')
  const current = await tabs.first().textContent()
  const document = {
    version: '2.21',
    children: [
      {
        id: 'browser',
        type: 'browser',
        name: 'Unsupported page',
        width: 800,
        height: 600
      }
    ]
  }

  await dropOnCanvas(page, [
    {
      name: 'unsupported.pen',
      bytes: [...new TextEncoder().encode(JSON.stringify(document))]
    }
  ])

  const notifications = page.getByRole('region', { name: 'Notifications (F8)' })
  await expect(notifications.getByText('Could not open “unsupported.pen”')).toBeVisible()
  await expect(
    notifications.getByText(/Node type browser has no equivalent editor behavior/)
  ).toBeVisible()
  await expect(tabs).toHaveCount(1)
  await expect(tabs.first()).toHaveText(current ?? '')
  await showLayers(page)
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Rectangle 1' })).toHaveCount(1)
  await expect(tabs.first().getByRole('img', { name: 'Unsaved changes' })).toHaveCount(1)
})

test('a supported .pen opens as an editable document while preserving the original tab', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(100, 100, 120, 80)
  const document = {
    version: '2.21',
    children: [
      {
        id: 'card',
        type: 'rectangle',
        name: 'Imported card',
        x: 80,
        y: 80,
        width: 240,
        height: 160,
        fill: '#2277DD'
      }
    ]
  }

  await dropOnCanvas(page, [
    {
      name: 'editable.pen',
      bytes: [...new TextEncoder().encode(JSON.stringify(document))]
    }
  ])

  const tabs = page.getByTestId('tabbar-tab')
  await expect(tabs).toHaveCount(2)
  await expect(tabs.last()).toContainText('editable')
  await showLayers(page)
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Imported card' })).toHaveCount(1)
  await page.getByTestId('layers-item').filter({ hasText: 'Imported card' }).click()
  await page.keyboard.press('Meta+d')
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Imported card' })).toHaveCount(2)
  await page.keyboard.press('Meta+z')
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Imported card' })).toHaveCount(1)
  await tabs.first().click()
  await showLayers(page)
  await expect(page.getByTestId('layers-item').filter({ hasText: 'Rectangle 1' })).toHaveCount(1)
  canvas.assertNoErrors()
})
