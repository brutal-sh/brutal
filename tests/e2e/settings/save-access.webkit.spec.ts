import { expect, test } from '#tests/e2e/fixtures'
import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

for (const width of [1280, 390]) {
  test(`Save interfaces share persisted access switches at ${width}px`, async ({ page }) => {
    await mockEditorCopyServices(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?test')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    const open = async () => {
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
      if (width < 640) {
        await page.getByRole('combobox', { name: 'Settings', exact: true }).click()
        await page.getByRole('option', { name: 'MCP', exact: true }).click()
      } else await page.getByRole('tab', { name: 'MCP', exact: true }).click()
      await page.getByTestId('settings-mcp-tool-access').click()
      await page.getByRole('searchbox', { name: 'Search tools' }).fill('save')
    }
    await open()
    const uri = page.getByRole('switch', { name: 'save', exact: true })
    const legacy = page.getByRole('switch', { name: 'save_file', exact: true })
    await expect(uri).toHaveAttribute('data-state', 'checked')
    await expect(legacy).toHaveAttribute('data-state', 'checked')
    await uri.click()
    await expect(legacy).toHaveAttribute('data-state', 'unchecked')
    await page.reload()
    await canvas.waitForInit()
    await open()
    await expect(uri).toHaveAttribute('data-state', 'unchecked')
    await expect(legacy).toHaveAttribute('data-state', 'unchecked')
    await legacy.click()
    await expect(uri).toHaveAttribute('data-state', 'checked')
    await expect(legacy).toHaveAttribute('data-state', 'checked')
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath(`save-access-${width}.png`)
    })
    canvas.assertNoErrors()
  })
}
