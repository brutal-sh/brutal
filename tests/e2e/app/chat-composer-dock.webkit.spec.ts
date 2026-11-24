import type { Locator } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'
import { ChatHarness } from '#tests/helpers/chat/harness'

test('the chat composer slides out of the sidebar and keeps its draft and images', async ({
  page
}, testInfo) => {
  const canvas = new CanvasHelper(page)
  const chat = new ChatHarness(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?test')
  await canvas.waitForInit()
  await chat.configureOpenRouter('test-only-key')
  await chat.input.fill('A draft to keep')
  const input = await chat.input.elementHandle()
  const sidebar = page.getByTestId('chat-panel')
  const surface = page.getByTestId('editor-canvas-surface')
  const composer = page.getByTestId('chat-composer-dock')
  const toggle = page.getByRole('button', { name: 'Toggle sidebar', exact: true })
  await expect(sidebar.getByTestId('chat-composer-dock')).toBeVisible()

  await expectComposerSlide(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(surface.getByTestId('chat-composer-dock')).toBeVisible()
  const canvasBounds = expectDefined(await surface.boundingBox(), 'canvas bounds')
  await expect
    .poll(async () => {
      const bounds = expectDefined(await composer.boundingBox(), 'floating composer bounds')
      return Math.abs(bounds.x + bounds.width / 2 - (canvasBounds.x + canvasBounds.width / 2))
    })
    .toBeLessThan(2)

  const accepted = await composer.evaluate(async (element) => {
    const image = new OffscreenCanvas(8, 8)
    const context = image.getContext('2d')
    if (!context) throw new Error('Could not create an image')
    context.fillStyle = '#08f'
    context.fillRect(0, 0, 8, 8)
    const blob = await image.convertToBlob({ type: 'image/png' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(new File([blob], 'dock.png', { type: 'image/png' }))
    const options = { bubbles: true, cancelable: true, dataTransfer }
    element.dispatchEvent(new DragEvent('dragenter', options))
    return !element.dispatchEvent(new DragEvent('drop', options))
  })
  expect(accepted).toBe(true)
  await expect(composer.getByText('dock.png', { exact: true })).toBeVisible()
  await expect(chat.input).toHaveText('A draft to keep')
  await expect(page.getByTestId('chat-input')).toHaveCount(1)

  await page.screenshot({ path: testInfo.outputPath('brutal-composer-floating.png') })

  await page.getByRole('button', { name: 'Toggle inspector', exact: true }).click()
  const inspector = expectDefined(
    await page.getByTestId('properties-panel').boundingBox(),
    'inspector bounds'
  )
  const floating = expectDefined(await composer.boundingBox(), 'composer beside inspector')
  expect(floating.x + floating.width).toBeLessThan(inspector.x)
  await page.getByRole('button', { name: 'Toggle inspector', exact: true }).click()

  await expectComposerSlide(toggle)
  await expect(sidebar.getByTestId('chat-composer-dock')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await toggle.click()
  await expect(surface.getByTestId('chat-composer-dock')).toBeVisible()
  expect(await composer.evaluate((element) => element.getAnimations().length)).toBe(0)
  await toggle.click()
  await expect(sidebar.getByTestId('chat-composer-dock')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(await input.evaluate((element) => element.isConnected)).toBe(true)
  expect(await composer.evaluate((element) => element.getAnimations().length)).toBe(0)
  await expect(chat.input).toHaveText('A draft to keep')
  await expect(composer.getByText('dock.png', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('brutal-composer-in-sidebar.png') })
  canvas.assertNoErrors()
})

test('the centered composer switches recent chats and reopens their transcript', async ({
  page,
  configuredChat: chat
}, testInfo) => {
  const canvas = page.getByTestId('editor-canvas-surface')
  const composer = canvas.getByTestId('chat-composer-dock')
  const toggle = page.getByRole('button', { name: 'Toggle sidebar', exact: true })
  const sidebar = page.getByTestId('chat-panel')
  const firstChat = 'Plan the homepage'
  const secondChat = 'Review the navigation'
  const thirdChat = 'Choose a color palette'

  await chat.submit(firstChat)
  await expect(chat.assistantMessage()).toBeVisible()
  await toggle.click()
  await expect(composer.getByRole('button', { name: 'Chat history' })).toHaveText(firstChat)

  const newChat = composer.getByRole('button', { name: 'New chat', exact: true })
  await newChat.click()
  const history = composer.getByRole('button', { name: 'Chat history', exact: true })
  await expect(history).toHaveText('New chat')
  await chat.submit(secondChat)
  await expect(history).toHaveText(secondChat)
  await newChat.click()
  await expect(history).toHaveText('New chat')
  await chat.submit(thirdChat)
  await expect(history).toHaveText(thirdChat)
  const recent = composer.getByRole('button', { name: firstChat, exact: true })
  await expect(recent).toBeVisible()
  await recent.press('Enter')
  await expect(history).toHaveText(firstChat)
  await expect(history).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(composer.getByRole('button', { name: secondChat, exact: true })).toBeVisible()
  await expect(composer.getByRole('button', { name: thirdChat, exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('brutal-centered-recent-chats.png') })

  await composer.getByRole('button', { name: 'Conversation actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible()
  await page.keyboard.press('Escape')
  await history.click()
  const search = page.getByRole('textbox', { name: 'Search conversations…' })
  await expect(search).toBeVisible()
  await search.fill('navigation')
  await page
    .getByRole('dialog', { name: 'Chat history' })
    .getByRole('button', {
      name: secondChat,
      exact: true
    })
    .click()
  await expect(history).toHaveText(secondChat)
  await composer.getByRole('button', { name: 'Open conversation', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(sidebar.getByTestId('chat-message-user').last()).toContainText(secondChat)
  await expect(chat.assistantMessage()).toBeVisible()
})

async function expectComposerSlide(toggle: Locator) {
  // Sample the whole move, including frames before the locator becomes stable.
  const { from, to, positions } = await toggle.evaluate(async (button) => {
    const composer = document.querySelector('[data-test-id="chat-composer-dock"]')
    if (!(button instanceof HTMLButtonElement) || !composer) {
      throw new Error('Could not find the sidebar toggle or composer')
    }
    const from = composer.getBoundingClientRect().x
    const positions: number[] = []
    button.click()
    for (let frame = 0; frame < 35; frame++) {
      await new Promise(requestAnimationFrame)
      positions.push(composer.getBoundingClientRect().x)
    }
    return { from, to: composer.getBoundingClientRect().x, positions }
  })
  const left = Math.min(from, to)
  const right = Math.max(from, to)
  expect(positions.some((x) => x > left + 5 && x < right - 5)).toBe(true)
}
