import { expect, test } from '@playwright/test'

import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'
import { storyOutcome } from '#tests/helpers/storybook/outcome'

const CONNECTION_STORY = 'app-settings-ai-setup-connection'
const THEMES = ['dark', 'light'] as const

for (const theme of THEMES) {
  for (const story of [
    'coding-agent-signed-in',
    'coding-agent-tools-unreachable',
    'coding-agent-needs-adapter',
    'pi-outdated-mcp-from-bun'
  ]) {
    test(`${story} keeps its interaction and accessibility checks in ${theme}`, async ({
      page
    }) => {
      await page.goto(
        `/iframe.html?id=${CONNECTION_STORY}--${story}&viewMode=story&globals=theme:${theme}`
      )
      expect(await storyOutcome(page)).toBe('ok')
    })
  }
}

for (const theme of THEMES) {
  for (const look of ['command', 'plain']) {
    test(`copy field ${look} keeps its accessibility checks in ${theme}`, async ({
      page
    }, testInfo) => {
      await page.goto(
        `/iframe.html?id=design-system-inputs-copy-field--${look}&viewMode=story&globals=theme:${theme}`
      )
      const outcome = await storyOutcome(page)
      await page
        .locator('[data-slot="copy-field"]')
        .screenshot({ path: testInfo.outputPath(`${look}-${theme}.png`) })
      expect(outcome).toBe('ok')
    })
  }
}

for (const labels of AI_SETUP_LABELS) {
  test.describe(labels.locale, () => {
    test.use({
      storageState: async ({ baseURL }, use) => {
        if (!baseURL) throw new Error('Storybook test baseURL is required')
        await use({
          cookies: [],
          origins: [
            {
              origin: new URL(baseURL).origin,
              localStorage: [{ name: 'open-pencil-locale', value: labels.locale }]
            }
          ]
        })
      }
    })
    for (const theme of THEMES) {
      test(`translated setup failure states name Open Pen in ${theme}`, async ({
        page
      }, testInfo) => {
        await page.goto(
          `/iframe.html?id=${CONNECTION_STORY}--copy-states&viewMode=story&globals=theme:${theme}`
        )
        expect(await storyOutcome(page)).toBe('ok')
        const cases = [
          ['blocked', labels.aiSetupOpenRouterBlocked],
          ['adapter', labels.aiSetupAgentNeedsAdapter],
          ['manual-mcp', labels.aiSetupAgentMCPInstall],
          ['tools', labels.aiSetupAgentToolsFailed.replaceAll('{agent}', 'Codex')],
          [
            'other-adapter',
            labels.aiSetupAgentAdapterMismatch.replaceAll('{path}', '/Users/ada/.bun/bin/codex-acp')
          ],
          ['pi', labels.aiSetupPiDescription],
          ['start-failed', labels.aiSetupAgentMCPStartFailed]
        ]
        for (const [id, text] of cases) {
          const state = page.locator(`[data-copy-state="${id}"]`)
          await state.scrollIntoViewIfNeeded()
          await expect(state).toContainText(text)
          await expect(state).not.toContainText('OpenPencil')
          if (id === 'tools') await expect(state).toContainText(labels.aiSetupAgentToolsHint)
          expect(
            await state.evaluate((element) => element.scrollWidth <= element.clientWidth)
          ).toBe(true)
          await state.screenshot({
            path: testInfo.outputPath(`${labels.locale}-${theme}-${id}.png`)
          })
        }
      })
    }
  })
}
