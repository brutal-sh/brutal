import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useEditorSetupWithClear('/?test')

test("the Design JSX editor flags props an element does not take, and accepts each element's own", async () => {
  const page = editor.page
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Code editor', exact: true })
    .click()
  const writeJSX = page.getByTestId('code-panel-root').getByRole('button', { name: 'Write JSX' })
  const content = page.locator('[data-slot="code-editor"] .cm-content')
  await expect(content.or(writeJSX)).toBeVisible()
  if (await writeJSX.isVisible()) await writeJSX.click()
  await content.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(
    [
      '<Frame w={400} h={300}>',
      '  <Shape name="a" kind="diamond" textSize="large" typeface="bookish">A</Shape>',
      '  <Sticky color="yellow" author="Ada">Hi</Sticky>',
      '  <Connector from="a" to="a" line="curved" startCap="none" />',
      '  <Frame from="x" bogus={1} />',
      '  <UnknownWidget />',
      '</Frame>'
    ].join('\n')
  )
  const warnings = page.locator('.cm-lintRange-warning')
  await expect(warnings).toHaveText(['from', 'bogus', 'UnknownWidget'])
  await warnings.first().hover()
  await expect(page.locator('.cm-tooltip-lint')).toContainText('Unknown design property “from”.')
  await warnings.last().hover()
  await expect(page.locator('.cm-tooltip-lint')).toContainText(
    'Unknown design element <UnknownWidget>.'
  )
})
