import { expect, test } from '@playwright/test'

import { storyEntries } from '#tests/helpers/storybook'
import { STORY_TIMEOUT_MS, storyOutcome } from '#tests/helpers/storybook/outcome'

/** Each story is checked in both app themes, since their tokens meet contrast separately. */
const THEMES = ['dark', 'light'] as const

// Storybook's index exists only once its server runs, after Playwright has collected tests,
// so one test walks every story and reports each failure separately.
test('every story renders, passes its play function, and meets axe in both themes', async ({
  page,
  request
}) => {
  const stories = await storyEntries(request)
  test.setTimeout(stories.length * THEMES.length * STORY_TIMEOUT_MS)
  expect(stories.length).toBeGreaterThan(0)

  for (const theme of THEMES) {
    for (const story of stories) {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
      expect.soft(await storyOutcome(page), `${story.id} (${theme})`).toBe('ok')
    }
  }
})
