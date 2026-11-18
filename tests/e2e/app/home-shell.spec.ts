import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { routeModelCatalog } from '#tests/helpers/chat/catalog'
import { ChatHarness } from '#tests/helpers/chat/harness'
import { injectMockChatTransport } from '#tests/helpers/chat/transport'
import { routeVisionModel } from '#tests/helpers/chat/vision'
import { testPath } from '#tests/helpers/paths'

test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser test baseURL is required')
    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            {
              name: 'open-pencil:preferences:v1',
              value: JSON.stringify({ version: 1, onboarding: { aiSetup: 'done' } })
            },
            {
              name: 'open-pencil:recent-documents',
              value: JSON.stringify(
                ['Reading workspace', 'Mobile journal', 'Team dashboard', 'Presentation'].map(
                  (name, index) => ({
                    id: `local:/home-test-${index}.fig`,
                    kind: 'local',
                    path: `/home-test-${index}.fig`,
                    name,
                    updatedAt: '2026-10-29T12:00:00.000Z'
                  })
                )
              )
            }
          ]
        }
      ]
    })
  }
})

for (const width of [390, 1496]) {
  test(`Home creation and document controls remain usable at ${width}px`, async ({
    page
  }, testInfo) => {
    await page.setViewportSize({ width, height: 933 })
    await page.goto('/?recent-files')
    const home = page.getByTestId('recent-files-home')
    const prompt = page.getByRole('textbox', { name: 'Create anything' })
    await prompt.fill('My draft remains here')
    await page.getByRole('button', { name: 'Mobile app', exact: true }).click()
    await expect(prompt).toBeFocused()
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(prompt).toBeHidden()
    await page.getByRole('button', { name: 'Show design composer' }).click()
    await expect(prompt).toHaveValue('My draft remains here')
    await page.getByRole('button', { name: 'Send message', exact: true }).click()
    await expect(page.getByTestId('app-settings-done')).toBeVisible()
    await page.getByTestId('app-settings-done').click()
    await expect(prompt).toHaveValue('My draft remains here')
    await home.getByRole('button', { name: 'Search files…', exact: true }).click()
    await page.getByRole('searchbox').fill('Reading workspace')
    await expect(home.getByRole('button', { name: /Reading workspace/ })).toHaveCount(1)
    await expect(home.getByRole('button', { name: /Mobile journal/ })).toHaveCount(0)
    await page.getByRole('searchbox').fill('')
    await page.keyboard.press('Escape')
    await home.getByRole('tab', { name: 'Drafts', exact: true }).click()
    await expect(home.getByRole('tabpanel')).toBeVisible()
    await home.getByRole('tab', { name: 'Design Systems', exact: true }).click()
    await home.getByRole('button', { name: 'Manage libraries' }).click()
    const libraries = page.getByRole('dialog', { name: 'Manage libraries', exact: true })
    await expect(libraries.locator(':focus')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(libraries).toBeHidden()
    await home.getByRole('tab', { name: 'Recents', exact: true }).click()
    await expect(home).toHaveJSProperty(
      'scrollWidth',
      await home.evaluate((element) => element.clientWidth)
    )
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) })
    await page.getByTestId('home-new-document').click()
    await new CanvasHelper(page).waitForInit()
    await expect(home).toBeHidden()
    await page.getByRole('tab', { name: 'Home', exact: true }).click()
    await expect(home).toBeVisible()
  })
}

test('Home prompt and image enter the new document Agent exactly once', async ({ page }) => {
  await routeModelCatalog(page)
  await routeVisionModel(page)
  await page.goto('/?recent-files')
  await page.getByTestId('home-new-document').click()
  await new CanvasHelper(page).waitForInit()
  await injectMockChatTransport(page)
  const chat = new ChatHarness(page)
  await chat.configureOpenRouter('sk-or-test-key-12345')
  await page.getByRole('tab', { name: 'Home', exact: true }).click()
  const prompt = page.getByRole('textbox', { name: 'Create anything' })
  await page.getByRole('button', { name: 'Mobile app', exact: true }).click()
  await prompt.fill('Use this reference for a calm reading experience')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add to context', exact: true }).click()
  await (await chooser).setFiles(testPath('fixtures/vectorize/pilot_avatar.png'))
  await expect(page.getByRole('button', { name: 'Remove pilot_avatar.png' })).toBeVisible()
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(chat.userMessage()).toContainText('Use this reference for a calm reading experience')
  await expect(
    chat.userMessage().getByRole('button', { name: 'View attachment pilot_avatar.png' })
  ).toBeVisible()
  await expect(chat.assistantMessage()).toBeVisible()
  await expect(page.getByTestId('chat-message-user')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute(
    'data-last-chat-request',
    /mobile app.*calm reading experience/i
  )
  await page.getByRole('tab', { name: 'Home', exact: true }).click()
  await expect(prompt).toHaveValue('')
  await page.getByTestId('tabbar-tab').last().click()
  await expect(page.getByTestId('chat-message-user')).toHaveCount(1)
})
