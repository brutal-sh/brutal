import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { validateExtractedPage } from '@/app/browser-preview/dom/schema'
import {
  validateBrowserPicker,
  type BrowserPickerAction
} from '@/app/browser-preview/picker/schema'

import { repoPath } from '#tests/helpers/paths'

import { expect, test } from '../fixtures'

const script = await readFile(repoPath('desktop/src/network/browser/picker.js'), 'utf8')
const extractScript = await readFile(repoPath('desktop/src/network/browser/extract.js'), 'utf8')
const fixture =
  '<!doctype html><style>body{margin:0}section{padding:20px}p,a{display:block;width:200px;height:50px;margin:0}</style><section id="parent"><p id="first" class="message">Selected paragraph</p><a id="second" href="#navigated">Other element</a><input type="password" value="excluded-password"></section>'

test.beforeEach(async ({ page }) => {
  await page.route('**/picker-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: fixture })
  )
  await page.goto('/picker-fixture')
  await page.addScriptTag({ content: script })
})

function control(page: Page, action: BrowserPickerAction, index?: number) {
  const requestId = randomUUID()
  return page
    .evaluate<unknown>(`controlPicker(${JSON.stringify({ action, requestId, index })})`)
    .then((result) => validateBrowserPicker(result, requestId, page.url()))
}

test('picks and repicks real elements while preventing the page action', async ({ page }) => {
  expect((await control(page, 'start')).picking).toBe(true)
  await page.getByText('Selected paragraph', { exact: true }).click()
  const selected = await control(page, 'read')
  expect(selected.picking).toBe(false)
  expect(selected.pick?.id).toBe('first')
  expect(selected.pick?.classes).toBe('message')
  expect(selected.pick?.box).toEqual({ x: 20, y: 20, width: 200, height: 50 })
  expect(selected.pick?.path.map((part) => part.tag)).toEqual(['body', 'section', 'p'])
  expect(JSON.stringify(selected)).not.toContain('excluded-password')
  await page.getByRole('link', { name: 'Other element' }).click()
  expect((await control(page, 'read')).pick?.id).toBe('second')
  expect(new URL(page.url()).hash).toBe('')
})

test('navigates parents, remembered children and siblings and delivers keyboard actions once', async ({
  page
}) => {
  await control(page, 'start')
  await page.getByText('Selected paragraph', { exact: true }).click()
  await page.keyboard.press('ArrowUp')
  expect((await control(page, 'read')).pick?.id).toBe('parent')
  await page.keyboard.press('ArrowDown')
  expect((await control(page, 'read')).pick?.id).toBe('first')
  await page.keyboard.press('ArrowRight')
  expect((await control(page, 'read')).pick?.id).toBe('second')
  await page.keyboard.press('ArrowLeft')
  expect((await control(page, 'read')).pick?.id).toBe('first')
  await page.keyboard.press('Enter')
  expect((await control(page, 'read')).action).toBe('import')
  expect((await control(page, 'read')).action).toBeNull()
  await page.keyboard.press('Control+Enter')
  expect((await control(page, 'read')).action).toBe('capture')
  await page.keyboard.press('Escape')
  expect((await control(page, 'read')).pick).toBeNull()
  await page.getByRole('link', { name: 'Other element' }).click()
  expect(new URL(page.url()).hash).toBe('#navigated')
})

test('breadcrumb selection, disconnected targets and stopping retain page content and restore clicks', async ({
  page
}) => {
  await control(page, 'start')
  await page.getByText('Selected paragraph', { exact: true }).click()
  expect((await control(page, 'select', 1)).pick?.id).toBe('parent')
  await page.evaluate(() => document.getElementById('parent')?.remove())
  expect((await control(page, 'read')).pick).toBeNull()
  await control(page, 'stop')
  await expect(page.locator('[data-open-pen-picker]')).toHaveCount(0)
  expect((await control(page, 'read')).picking).toBe(false)
})

test('extracts only the selected subtree at its own origin and rejects a removed selection', async ({
  page
}) => {
  await control(page, 'start')
  await page.getByText('Selected paragraph', { exact: true }).click()
  const requestId = randomUUID()
  const response = await page.evaluate<unknown>(
    `(${extractScript})(${JSON.stringify(requestId)}, true)`
  )
  const extracted = validateExtractedPage(response, requestId, page.url())
  expect(extracted.width).toBe(200)
  expect(extracted.height).toBe(50)
  expect(extracted.nodes[0]?.box).toEqual({ x: 0, y: 0, width: 200, height: 50 })
  expect(extracted.nodes.filter((node) => node.type === 'text').map((node) => node.text)).toEqual([
    'Selected paragraph'
  ])
  expect(JSON.stringify(extracted)).not.toContain('excluded-password')
  await page.evaluate(() => document.getElementById('first')?.remove())
  const removed = await page.evaluate<unknown>(
    `(${extractScript})(${JSON.stringify(requestId)}, true)`
  )
  expect(() => validateExtractedPage(removed, requestId, page.url())).toThrow()
})

test('explicit page import ignores a live selection and expired selection import cannot fall back to the page', async ({
  page
}) => {
  await page.locator('input').evaluate((element) => element.remove())
  await control(page, 'start')
  await page.getByText('Selected paragraph', { exact: true }).click()
  const requestId = randomUUID()
  const full = await page.evaluate<unknown>(
    `(${extractScript})(${JSON.stringify(requestId)}, false)`
  )
  const extracted = validateExtractedPage(full, requestId, page.url())
  expect(extracted.nodes.filter((node) => node.type === 'text').map((node) => node.text)).toEqual([
    'Selected paragraph',
    'Other element'
  ])
  await control(page, 'stop')
  const expired = await page.evaluate<unknown>(
    `(${extractScript})(${JSON.stringify(requestId)}, true)`
  )
  expect(() => validateExtractedPage(expired, requestId, page.url())).toThrow()
})
