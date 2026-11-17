import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { meshDriver } from '#tests/helpers/canvas/mesh/driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { propertyItems } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers', mockOfficialCloudDiscovery)
const mesh = meshDriver(() => editor.page)

test('a closed format menu releases the parent Tab loop before deferred timers run', async () => {
  const id = await mesh.show()
  await mesh.bind(id, 'fills')
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.getByTestId('mesh-gradient-editor')
  await popup.getByRole('button', { name: 'Colors 1', exact: true }).click()
  await popup.getByRole('button', { name: 'Edit color', exact: true }).click()
  await editor.page.getByTestId('color-format-select').click()
  const option = editor.page.getByRole('option', { name: 'HEX', exact: true })
  await option.focus()
  await option.click({ trial: true })

  const time = Date.now()
  await editor.page.clock.install({ time })
  await editor.page.clock.pauseAt(time + 1000)
  try {
    await editor.page.keyboard.press('Enter')
    const hex = editor.page.getByRole('textbox', { name: 'HEX', exact: true })
    await hex.fill('112233')
    await hex.press('Tab')
    await expect(popup).toBeVisible()
    await expect(
      editor.page.getByRole('slider', { name: 'Saturation, Brightness', exact: true })
    ).toBeFocused()
  } finally {
    await editor.page.clock.resume()
  }
  editor.canvas.assertNoErrors()
})
