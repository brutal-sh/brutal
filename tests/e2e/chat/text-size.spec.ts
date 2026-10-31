import type { Page } from '@playwright/test'

import { test, expect } from '#tests/helpers/chat/fixture'
import { injectMockChatTransport } from '#tests/helpers/chat/transport'
import { openAppMenu } from '#tests/helpers/menu'

async function textSizeMenu(page: Page) {
  const view = await openAppMenu(page, 'View')
  await view.getByRole('menuitem', { name: 'Agent Chat Text Size', exact: true }).click()
  return page.getByRole('menu', { name: 'Agent Chat Text Size', exact: true })
}

test('View changes transcript text size exclusively and retains it after reload', async ({
  configuredChat: chat,
  page
}) => {
  await chat.submit('Transcript type sample with a markdown table')
  await expect(chat.assistantMessage()).toBeVisible()
  const userText = chat.userMessage().getByTestId('chat-text-bubble')
  const assistantText = chat.assistantMessage().getByTestId('chat-text-bubble')
  const paragraph = assistantText.locator('[data-stream-markdown="p"]').first()
  const cell = assistantText.locator('[data-stream-markdown="td"]').first()
  const composerSize = await chat.input.evaluate((element) => getComputedStyle(element).fontSize)
  await expect(userText).toHaveCSS('font-size', '12px')
  await expect(paragraph).toHaveCSS('font-size', '11px')
  for (const [label, pixels, markdownPixels] of [
    ['Medium', '12.9px', '11.825px'],
    ['Large', '13.8px', '12.65px']
  ] as const) {
    const menu = await textSizeMenu(page)
    await menu.getByRole('menuitemcheckbox', { name: label, exact: true }).click()
    await expect(userText).toHaveCSS('font-size', pixels)
    await expect(assistantText).toHaveCSS('font-size', pixels)
    await expect(paragraph).toHaveCSS('font-size', markdownPixels)
    await expect(cell).toHaveCSS('font-size', markdownPixels)
    await expect(chat.input).toHaveCSS('font-size', composerSize)
  }
  const menu = await textSizeMenu(page)
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Large', exact: true })).toBeChecked()
  await expect(
    menu.getByRole('menuitemcheckbox', { name: 'Medium', exact: true })
  ).not.toBeChecked()
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Small', exact: true })).not.toBeChecked()
  await menu.getByRole('menuitemcheckbox', { name: 'Large', exact: true }).click()
  await page.reload()
  await chat.chatTab.click()
  await injectMockChatTransport(page)
  await chat.submit('Retained transcript type sample')
  await expect(chat.assistantMessage()).toBeVisible()
  await expect(userText).toHaveCSS('font-size', '13.8px')
  await expect(assistantText).toHaveCSS('font-size', '13.8px')
  await expect(chat.input).toHaveCSS('font-size', composerSize)
})
