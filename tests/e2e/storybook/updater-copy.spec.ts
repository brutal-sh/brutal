import { expect, test, type Locator, type TestInfo } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { storyOutcome } from '#tests/helpers/storybook/outcome'

const NOTES_URL = 'https://github.com/brutal-sh/open-pen-feedback/releases/tag/v0.16.1'
const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'pl', 'ru', 'zh-CN'] as const
const STATES = {
  release: [
    ['available', 'available'],
    ['without-notes', 'available'],
    ['available-on-windows', 'available'],
    ['downloading', 'downloading'],
    ['downloading-unknown-size', 'downloading'],
    ['installed', 'installed'],
    ['installing', 'installing']
  ],
  checksAndFailures: [
    ['download-failed', 'failed'],
    ['install-failed', 'failed'],
    ['checking', 'checking'],
    ['up-to-date', 'up-to-date'],
    ['check-failed', 'failed'],
    ['unavailable', 'failed']
  ]
} as const

async function capture(prompt: Locator, testInfo: TestInfo, story: string) {
  await prompt.screenshot({ animations: 'disabled', path: testInfo.outputPath(`${story}.png`) })
  const layout = await prompt.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const empty = element.querySelector('[data-slot="update-notes"] > p')
    return {
      emptyNotes: empty
        ? {
            foreground: getComputedStyle(empty).color,
            background: getComputedStyle(empty.parentElement ?? empty).backgroundColor
          }
        : null,
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
  await testInfo.attach(story, { body: JSON.stringify(layout), contentType: 'application/json' })
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
      for (const [group, states] of Object.entries(STATES)) {
        test(`${group} retain actions, versions and own notes in ${theme}`, async ({
          page,
          context
        }, testInfo) => {
          const interceptedURLs = await mockEditorCopyServices(page)
          const notesRequests: string[] = []
          const errors: string[] = []
          page.on('pageerror', (error) => errors.push(error.message))
          await context.route(NOTES_URL, async (route) => {
            notesRequests.push(route.request().url())
            await route.fulfill({
              contentType: 'text/html',
              body: '<title>Brutal change history fixture</title>'
            })
          })
          for (const [story, status] of states) {
            await page.goto(
              `/iframe.html?id=app-shell-update-prompt--${story}&viewMode=story&globals=theme:${theme}`
            )
            const outcome = await storyOutcome(page)
            const prompt = page.locator('[data-slot="update-prompt"]')
            await expect(prompt).toHaveAttribute('data-status', status)
            await capture(prompt, testInfo, story)
            expect(outcome, `${story} (${locale}, ${theme})`).toBe('ok')
            if (story === 'available') {
              const notes = prompt.getByRole('link')
              await expect(notes).toHaveAttribute('href', NOTES_URL)
              const opening = page.waitForEvent('popup')
              await notes.focus()
              await page.keyboard.press('Enter')
              const history = await opening
              try {
                await expect(history).toHaveURL(NOTES_URL)
              } finally {
                await history.close()
              }
              await expect(prompt).toHaveAttribute('data-status', status)
            }
          }
          expect(notesRequests).toEqual(group === 'release' ? [NOTES_URL] : [])
          expect(interceptedURLs).toEqual([])
          expect(errors).toEqual([])
        })
      }
    }
  })
}
