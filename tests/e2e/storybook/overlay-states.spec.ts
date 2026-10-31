import { expect, test, type Page } from '@playwright/test'

import { overlayContents, recordOverlayFrames } from '#tests/helpers/overlay/states'

// Overlays flicker only while they animate, which reduced motion turns off.
test.use({ contextOptions: { reducedMotion: 'no-preference' } })

async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await expect(page.locator('#storybook-root')).not.toBeEmpty()
}

for (const theme of ['dark', 'light']) {
  test(`a composed dialog retains its accessible description in ${theme}`, async ({ page }) => {
    await page.goto(
      `/iframe.html?id=design-system-overlays-dialog--semantic-wrapper&viewMode=story&globals=theme:${theme}`
    )
    await expect(page.locator('#storybook-root')).not.toBeEmpty()
    await page.getByRole('button', { name: 'Open semantic dialog', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Semantic dialog', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleDescription('Composed with the shared wrapper.')
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(dialog).not.toBeVisible()
  })
}

test('a targeted confirmation keeps its content while it animates closed', async ({ page }) => {
  await openStory(page, 'design-system-overlays-dialog--targeted-confirmation')
  const opening = await recordOverlayFrames(page, () =>
    page.getByRole('button', { name: 'Remove Alpha' }).click()
  )
  expect(overlayContents(opening)).toHaveLength(1)

  const dialog = page.getByRole('alertdialog')
  const shown = await dialog.innerText()
  const closing = await recordOverlayFrames(page, () =>
    dialog.getByRole('button', { name: 'Cancel' }).click()
  )
  expect(new Set(overlayContents(closing))).toEqual(new Set([shown.replace(/\s+/g, ' ').trim()]))
  expect(closing.at(-1)).toBeNull()
})
