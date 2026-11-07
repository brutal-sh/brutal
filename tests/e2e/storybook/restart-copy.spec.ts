import { expect, test, type Locator, type TestInfo } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { storyOutcome } from '#tests/helpers/storybook/outcome'

const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'pl', 'ru', 'zh-CN'] as const

async function capture(prompt: Locator, testInfo: TestInfo, name: string) {
  await prompt.screenshot({ animations: 'disabled', path: testInfo.outputPath(`${name}.png`) })
  const layout = await prompt.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
      height: element.clientHeight,
      scrollHeight: element.scrollHeight,
      controls: Array.from(element.querySelectorAll('button,a'), (control) => {
        const box = control.getBoundingClientRect()
        return {
          left: box.left - bounds.left,
          right: box.right - bounds.left,
          top: box.top - bounds.top,
          bottom: box.bottom - bounds.top,
          width: box.width
        }
      })
    }
  })
  await testInfo.attach(name, { body: JSON.stringify(layout), contentType: 'application/json' })
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height)
  for (const control of layout.controls) {
    expect(control.width).toBeGreaterThan(0)
    expect(control.left).toBeGreaterThanOrEqual(0)
    expect(control.right).toBeLessThanOrEqual(layout.width)
    expect(control.top).toBeGreaterThanOrEqual(0)
    expect(control.bottom).toBeLessThanOrEqual(layout.height)
  }
}

for (const locale of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    for (const theme of ['dark', 'light']) {
      for (const story of ['denied', 'relaunch-rejected']) {
        test(`${story} retains safe restart feedback in ${theme}`, async ({ page }, testInfo) => {
          const interceptedURLs = await mockEditorCopyServices(page)
          const errors: string[] = []
          page.on('pageerror', (error) => errors.push(error.message))
          await page.goto(
            `/iframe.html?id=app-shell-update-restart--${story}&viewMode=story&globals=theme:${theme}`
          )
          const outcome = await storyOutcome(page)
          const prompt = page.locator('[data-slot="update-prompt"]')
          await capture(prompt, testInfo, story)
          expect(outcome).toBe('ok')
          for (const name of ['check', 'download', 'install', 'confirmRestart']) {
            await expect(page.getByLabel(`${name} calls`, { exact: true })).toHaveText('1')
          }
          await expect(page.getByLabel('relaunch calls', { exact: true })).toHaveText(
            story === 'denied' ? '0' : '1'
          )
          await expect(prompt).toHaveAttribute(
            'data-status',
            story === 'denied' ? 'installed' : 'failed'
          )
          if (story === 'relaunch-rejected') {
            await expect(prompt.getByRole('alert')).toContainText('test-owned relaunch refused')
            await expect(prompt.getByRole('heading', { level: 1 })).toContainText('0.16.1')
            const controls = prompt.getByRole('button')
            await expect(controls).toHaveCount(2)
            await controls.nth(1).click()
            await expect(page.getByLabel('confirmRestart calls', { exact: true })).toHaveText('2')
            await expect(page.getByLabel('relaunch calls', { exact: true })).toHaveText('2')
            await expect(prompt).toHaveAttribute('data-status', 'installed')
            await capture(prompt, testInfo, 'retry-installed')
            for (const name of ['check', 'download', 'install']) {
              await expect(page.getByLabel(`${name} calls`, { exact: true })).toHaveText('1')
            }
          }
          await expect(prompt.getByRole('heading', { level: 1 })).toContainText('0.16.1')
          await expect(page.getByLabel('close calls', { exact: true })).toHaveText('0')
          await expect(page.getByLabel('closeWindow calls', { exact: true })).toHaveText('0')
          await prompt.getByRole('button').first().click()
          await expect(page.getByLabel('close calls', { exact: true })).toHaveText('1')
          await expect(page.getByLabel('closeWindow calls', { exact: true })).toHaveText('1')
          expect(interceptedURLs).toEqual([])
          expect(errors).toEqual([])
        })
      }
    }
  })
}
