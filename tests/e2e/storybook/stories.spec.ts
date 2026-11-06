import { expect, test } from '@playwright/test'
import * as v from 'valibot'

import { STORY_TIMEOUT_MS, storyOutcome } from '#tests/helpers/storybook/outcome'

const storyIndexSchema = v.object({
  entries: v.record(v.string(), v.object({ id: v.string(), type: v.string() }))
})

/** Each story is checked in both app themes, since their tokens meet contrast separately. */
const THEMES = ['dark', 'light'] as const

// Storybook's index exists only once its server runs, after Playwright has collected tests,
// so one test walks every story and reports each failure separately.
test('every story renders, passes its play function, and meets axe in both themes', async ({
  page,
  request
}) => {
  const text = await (await request.get('/index.json')).text()
  const index = v.parse(v.pipe(v.string(), v.parseJson(), storyIndexSchema), text)
  const stories = Object.values(index.entries).filter((entry) => entry.type === 'story')
  test.setTimeout(stories.length * THEMES.length * STORY_TIMEOUT_MS)
  expect(stories.length).toBeGreaterThan(0)

  for (const theme of THEMES) {
    for (const story of stories) {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`)
      expect.soft(await storyOutcome(page), `${story.id} (${theme})`).toBe('ok')
    }
  }
})
