import { expect, test, type Locator, type Page } from '@playwright/test'

import { storyOutcome } from '#tests/helpers/storybook/outcome'

const COMMAND = 'rg --files /Users/designer/.agents/skills/design-system-extraction/references'
const STATES = [
  { story: 'long-command', state: 'done', expandable: true, undone: false },
  { story: 'long-pending', state: 'pending', expandable: false, undone: false },
  { story: 'long-streaming-source', state: 'pending', expandable: true, undone: false },
  { story: 'long-command-error', state: 'error', expandable: true, undone: false },
  { story: 'long-command-undone', state: 'done', expandable: true, undone: true },
  { story: 'long-commands-grouped-undone', state: 'done', expandable: true, undone: true }
] as const

async function openStory(page: Page, story: string, width: number, theme: string) {
  await page.goto(
    `/iframe.html?id=app-chat-tool-calls--${story}&args=width:${width}&viewMode=story&globals=theme:${theme}`
  )
  expect(await storyOutcome(page)).toBe('ok')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  const card = page.locator('[data-slot="chat-tool-call"]').last()
  await expect(card).toBeVisible()
  expect((await card.boundingBox())?.width).toBe(width)
  return card
}

async function expectContained(header: Locator) {
  const bounds = await header.boundingBox()
  if (!bounds) throw new Error('Tool header is not visible')
  for (const child of await header.locator(':scope > *').all()) {
    const box = await child.boundingBox()
    if (!box) continue
    expect(box.x).toBeGreaterThanOrEqual(bounds.x)
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
  }
}

async function inspectHeader(card: Locator, state: (typeof STATES)[number]) {
  const header = card.locator(':scope > button')
  await expect(header).toBeVisible()
  const status = header.getByRole('img', { name: /.+/ })
  await expect(status).toBeVisible()
  await expect(status).toHaveAttribute('data-state', state.state)
  await expect(card).toHaveAttribute('data-undone', String(state.undone))
  await expect(header.locator('[data-slot="chat-tool-undone"]')).toHaveCount(state.undone ? 1 : 0)
  await expect(header.locator(':scope > svg')).toHaveCount(state.expandable ? 1 : 0)
  await expectContained(header)
  const title = header.locator('[data-tooltip-trigger]')
  const metrics = await title.evaluate((element) => ({
    width: element.clientWidth,
    fullWidth: element.scrollWidth,
    fontSize: getComputedStyle(element).fontSize,
    textOverflow: getComputedStyle(element).textOverflow
  }))
  expect(metrics.width).toBeGreaterThan(0)
  expect(metrics.fullWidth).toBeGreaterThan(metrics.width)
  expect(metrics.fontSize).toBe('13px')
  expect(metrics.textOverflow).toBe('ellipsis')
  return { header, title }
}

async function inspectInput(card: Locator, header: Locator) {
  await header.focus()
  await expect(header).toBeFocused()
  await header.press('Enter')
  await expect(card).toHaveAttribute('data-state', 'open')
  await expect(card.locator('[data-slot="code-viewer"]')).toBeVisible()
  const input = card.locator('button[aria-label="Input"]')
  if (await input.count()) await input.click()
  await expect(card.locator('.cm-content')).toContainText(COMMAND)
  await header.press('Enter')
  await expect(card).toHaveAttribute('data-state', 'closed')
}

for (const theme of ['dark', 'light']) {
  for (const width of [240, 480]) {
    for (const state of STATES) {
      test(`${state.story} preserves command access and status at ${width}px in ${theme}`, async ({
        page
      }, info) => {
        const card = await openStory(page, state.story, width, theme)
        if (state.story === 'long-commands-grouped-undone') {
          const group = page.locator('[data-slot="chat-tool-group"]')
          const trigger = group.locator(':scope > button')
          await expectContained(trigger)
          await trigger.press('Enter')
          await expect(page.locator('[data-slot="chat-tool-call"]')).toHaveCount(5)
        }
        const { header, title } = await inspectHeader(card, state)
        const fullTitle = await title.innerText()
        await title.hover()
        await expect(page.getByRole('tooltip')).toHaveText(fullTitle)
        await page.screenshot({ path: info.outputPath('long-title-state.png') })
        await page.keyboard.press('Escape')
        if (state.expandable) await inspectInput(card, header)
        else await expect(header).toBeDisabled()
        await expectContained(header)
      })
    }
  }
}

for (const theme of ['dark', 'light']) {
  for (const story of [
    'rendered',
    'streaming-render',
    'exported-image',
    'failed',
    'long-run',
    'long-command',
    'long-commands-grouped'
  ]) {
    test(`existing ${story} renders accessibly in ${theme}`, async ({ page }) => {
      await openStory(page, story, 320, theme)
    })
  }
}
