import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { addPages } from '#tests/helpers/pages'

test('model editing keeps the Settings shell stable and isolates the form', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.keyboard.press('ControlOrMeta+,')
  await page.getByTestId('settings-section-ai').click()
  const dialog = page.getByTestId('app-settings-dialog')
  await expect(dialog).toBeVisible()
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  const before = await dialog.boundingBox()
  await page.getByTestId('settings-add-model').click()
  const editor = page.getByTestId('settings-model-editor')
  await expect(editor).toBeVisible()
  await expect(dialog.getByText('Chat', { exact: true })).not.toBeVisible()
  const breadcrumb = page.getByTestId('settings-breadcrumb')
  const back = breadcrumb.getByRole('button', { name: 'Back: Models', exact: true })
  await expect(breadcrumb.getByRole('button')).toHaveCount(1)
  await expect(breadcrumb.getByText('Settings', { exact: true })).toBeVisible()
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Add model')
  await expect(back).toHaveCSS('text-decoration-line', 'underline')
  await expect(back).toHaveCSS('cursor', 'pointer')
  await expect(page.getByTestId('app-settings-done')).toHaveCount(0)
  expect(await dialog.boundingBox()).toEqual(before)

  // An untouched form goes back through the breadcrumb without asking.
  await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(back).toBeFocused()
  await expect(back).not.toHaveCSS('box-shadow', 'none')
  await page.keyboard.press('Enter')
  await expect(editor).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByTestId('settings-breadcrumb')).toHaveCount(0)
  await page.getByTestId('settings-add-model').click()
  await expect(editor).toBeVisible()
  // So does its page, picked again in the sidebar.
  await page.getByTestId('settings-section-ai').click()
  await expect(editor).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByTestId('settings-add-model').click()
  await expect(editor).toBeVisible()
  await editor.locator('[data-provider="openrouter"]').click()

  // Accidental dismissal must not throw away an in-progress profile.
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Draft profile')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(editor).toBeVisible()
  await back.click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Draft profile'
  )
  await back.click()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await expect(page.getByTestId('app-settings-done')).toBeVisible()
  expect(await dialog.boundingBox()).toEqual(before)
})

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`model editing restores focus across repeated transitions with ${reducedMotion} motion`, async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.setViewportSize({ width: 900, height: 700 })
    await page.goto('/?test')
    await new CanvasHelper(page).waitForInit()
    await page.keyboard.press('ControlOrMeta+,')
    await page.getByTestId('settings-section-ai').click()
    const dialog = page.getByTestId('app-settings-dialog')
    if (reducedMotion === 'reduce') await expect(dialog).toHaveCSS('animation-name', 'none')
    const add = page.getByTestId('settings-add-model')
    for (let attempt = 0; attempt < 3; attempt++) {
      await add.click()
      const editor = page.getByTestId('settings-model-editor')
      // A new model opens on its first provider choice.
      await expect(editor.locator('[data-provider]').first()).toBeFocused()
      await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(add).toBeFocused()
      await expect(dialog.getByRole('tabpanel')).toHaveCount(1)
    }
    await page.getByTestId('app-settings-done').click()
    await expect(dialog).not.toBeVisible()
  })
}

for (const theme of ['light', 'dark']) {
  test(`mobile Settings breadcrumb returns from Storage setup in ${theme} mode`, async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?test')
    await new CanvasHelper(page).waitForInit()
    await page.evaluate(async (value) => {
      const path = '/src/app/shell/theme.ts'
      const themeModule = await import(path)
      themeModule.useAppTheme().setTheme(value)
    }, theme)
    await page.keyboard.press('ControlOrMeta+,')
    await page.getByRole('combobox', { name: 'Settings', exact: true }).click()
    await page.getByRole('option', { name: 'Storage', exact: true }).click()
    const storage = page.getByTestId('settings-storage-panel')
    const edit = storage.getByRole('button', { name: /Edit/ })
    await edit.click()
    const back = page.getByRole('button', { name: 'Back: Storage', exact: true })
    await expect(back).toHaveCSS('text-decoration-line', 'underline')
    await back.press('Enter')
    await expect(back).toHaveCount(0)
    await expect(edit).toBeVisible()
  })
}

test('page rows keep the same compact height while renaming', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await addPages(page, ['Second page'])
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  const row = page.getByTestId('pages-row').first()
  await expect(row).toHaveCSS('height', '24px')
  await row.getByRole('button').dblclick()
  await expect(page.getByTestId('pages-item-input')).toBeVisible()
  await expect(row).toHaveCSS('height', '24px')
  await page.getByTestId('pages-item-input').press('Escape')
  await expect(row).toHaveCSS('height', '24px')
})
