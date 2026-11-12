import type { Locator } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'
import { documentState, setupCanvas } from '#tests/helpers/chat/render-preview'
import { installToolTitle } from '#tests/helpers/chat/tool-titles'

async function expectContained(card: Locator) {
  const header = card.locator(':scope > button')
  const bounds = await header.boundingBox()
  if (!bounds) throw new Error('Tool header is not visible')
  for (const child of await header.locator(':scope > *').all()) {
    const box = await child.boundingBox()
    if (!box) continue
    expect(box.x).toBeGreaterThanOrEqual(bounds.x)
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
  }
}

test('document Undo and Redo update an individual long-title card', async ({
  configuredChat: chat,
  page
}, info) => {
  await setupCanvas(page)
  const stream = await installToolTitle(page)
  const canvas = new CanvasHelper(page)
  const card = chat.assistantMessage().locator('[data-slot="chat-tool-call"]').last()
  try {
    await chat.submit('Add a history card')
    await expect.poll(() => stream.evaluate((s) => s.ready())).toBe(true)
    await stream.evaluate((s) => s.advance())
    await expect(card).toHaveAttribute('data-tool-state', 'pending')
    await expectContained(card)
    await stream.evaluate((s) => s.complete())
    await expect(chat.assistantMessage()).toContainText('Rendered.')
    const committed = await documentState(page)
    expect(committed.children).toHaveLength(1)
    await expect(card).toHaveAttribute('data-undone', 'false')
    await canvas.canvas.click({ position: { x: 10, y: 10 } })
    await canvas.undo()
    await expect.poll(() => documentState(page)).toEqual({ children: [], undo: false })
    await expect(card).toHaveAttribute('data-undone', 'true')
    await expect(card.locator('[data-slot="chat-tool-undone"]')).toBeVisible()
    await expectContained(card)
    await page.screenshot({ path: info.outputPath('document-undo.png') })
    await card.locator(':scope > button').press('Enter')
    await card.getByRole('button', { name: 'Input', exact: true }).click()
    await expect(card.locator('.cm-content')).toContainText('/Users/designer/.agents/skills/')
    await canvas.canvas.click({ position: { x: 10, y: 10 } })
    await canvas.redo()
    await expect.poll(() => documentState(page)).toEqual(committed)
    await expect(card).toHaveAttribute('data-undone', 'false')
    await expect(card.locator('[data-slot="chat-tool-undone"]')).toHaveCount(0)
    await expectContained(card)
    canvas.assertNoErrors()
  } finally {
    await stream.evaluate((s) => s.dispose())
    await stream.dispose()
  }
})
