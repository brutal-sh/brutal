import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetup('/', mockOfficialCloudDiscovery)

function pageColor() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.state.pageColor
  })
}

test('page background uses the shared paint field for hex and alpha', async () => {
  await (
    await openAppMenu(editor.page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  const pageSection = propertySection(editor.page, 'Page')
  await expect(pageSection).toBeVisible()

  const hex = pageSection.getByRole('textbox', { name: 'Page background' })
  await hex.fill('336699')
  await hex.press('Enter')
  await editor.canvas.waitForRender()

  let color = await pageColor()
  expect(color.r).toBeCloseTo(0.2, 2)
  expect(color.g).toBeCloseTo(0.4, 2)
  expect(color.b).toBeCloseTo(0.6, 2)

  const opacity = pageSection.getByRole('spinbutton', { name: 'Opacity' })
  await opacity.click()
  await opacity.fill('50')
  await opacity.press('Enter')
  await editor.canvas.waitForRender()

  color = await pageColor()
  expect(color.a).toBeCloseTo(0.5, 2)
  editor.canvas.assertNoErrors()
})
