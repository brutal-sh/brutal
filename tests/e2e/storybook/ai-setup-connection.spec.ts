import { expect, test } from '@playwright/test'

import { storyEntries } from '#tests/helpers/storybook'
import { STORY_TIMEOUT_MS, storyOutcome } from '#tests/helpers/storybook/outcome'

for (const theme of ['dark', 'light'] as const) {
  test(`connection states retain their interactions and accessibility in ${theme}`, async ({
    page,
    request
  }, testInfo) => {
    const stories = (await storyEntries(request)).filter((entry) =>
      entry.id.startsWith('app-settings-ai-setup-connection--')
    )
    expect(stories.length).toBeGreaterThan(0)
    // Keep the canonical sweep's existing per-story bound for this bounded family.
    test.setTimeout(stories.length * STORY_TIMEOUT_MS)
    for (const story of stories) {
      await test.step(story.id, async () => {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
        const outcome = await storyOutcome(page)
        await page.screenshot({
          path: testInfo.outputPath(`${story.id}-${theme}.png`),
          fullPage: true
        })
        expect.soft(outcome, `${story.id} (${theme})`).toBe('ok')
      })
    }
  })
}
