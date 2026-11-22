import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'
import { repoPath } from '#tests/helpers/paths'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function openCodeGuide() {
  const { page } = editor
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: 'Guide: How to Export Design to Code…', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Export Design to Code', exact: true })
  await expect(dialog).toBeVisible()
  return dialog
}

test('the code guide closes, reopens and reaches MCP settings without editing the design', async () => {
  const { page, canvas } = editor
  await canvas.drawRect(350, 300, 160, 100)
  const before = await getSelectedNode(page)
  const guide = await openCodeGuide()
  await expect(guide).toHaveAccessibleDescription(/MCP/)
  await expect(guide.locator('pre code')).toHaveCount(3)
  await guide.screenshot({ path: repoPath('local-evidence/openpen-code-guide-browser.png') })
  await guide.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(guide).not.toBeVisible()
  await openCodeGuide()
  await page.keyboard.press('Escape')
  await expect(guide).not.toBeVisible()
  await openCodeGuide()
  await guide.getByRole('button', { name: 'Open MCP settings', exact: true }).click()
  await expect(guide).not.toBeVisible()
  await expect(page.getByTestId('settings-mcp-panel')).toBeVisible()
  await page.getByTestId('app-settings-done').click()
  expect(await getSelectedNode(page)).toEqual(before)
})

test('the Figma guide is a repeatable nonmodal notification that preserves the selection', async () => {
  const { page, canvas } = editor
  await canvas.drawRect(350, 300, 160, 100)
  const before = await getSelectedNode(page)
  for (let attempt = 0; attempt < 2; attempt++) {
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: 'Guide: How to Import from Figma…', exact: true })
      .click()
    const notification = page.getByRole('region', { name: 'How to import from Figma (F9)' })
    const guide = notification
      .getByRole('listitem')
      .filter({ has: page.locator('[data-slot="toast-content"]') })
    await expect(guide).toBeVisible()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(guide.getByRole('list')).toBeVisible()
    await page.keyboard.press('F9')
    await expect(notification.locator('ol').first()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(guide).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(guide.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
    if (attempt === 0)
      await guide.screenshot({ path: repoPath('local-evidence/openpen-figma-guide-browser.png') })
    await page.keyboard.press('Enter')
    await expect(guide).not.toBeVisible()
  }
  expect(await getSelectedNode(page)).toEqual(before)
})

test('the CLI setup action opens this fork’s documentation', async () => {
  const { page } = editor
  const opening = page.waitForEvent('popup')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: 'Install Brutal CLI…', exact: true })
    .click()
  const popup = await opening
  try {
    await expect(popup).toHaveURL('https://github.com/jpoindexter/open-pen#cli')
  } finally {
    await popup.close()
  }
})

test('Help reaches this fork’s documentation, setup and support without editing selection', async () => {
  const { page, canvas } = editor
  await canvas.drawRect(350, 300, 160, 100)
  const before = await getSelectedNode(page)
  const website = 'https://brutal.sh/'
  const repository = 'https://github.com/jpoindexter/open-pen'
  const support = 'https://github.com/brutal-sh/open-pen-feedback'
  await page.context().route(
    (url) => url.href.startsWith(repository + '/blob/HEAD/') || url.href.startsWith(support),
    (route) => route.fulfill({ contentType: 'text/html', body: '<title>Brutal support</title>' })
  )
  for (const [label, url] of [
    ['Brutal Documentation', `${website}help/#docs`],
    ['Prompt Gallery & Tips', `${repository}/blob/HEAD/docs/PROMPTS.md`],
    ['Brutal Website', website],
    ['Cursor Setup…', `${repository}/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#cursor`],
    ['VS Code Setup…', `${repository}/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#vs-code`],
    ['Release Notes', `${support}/releases`],
    ['Report an Issue', `${support}/issues/new?template=bug.yml&version=0.16.0`],
    ['Support & Feedback', support]
  ]) {
    const opening = page.waitForEvent('popup')
    await (
      await openAppMenu(page, 'Help')
    )
      .getByRole('menuitem', { name: label, exact: true })
      .click()
    const popup = await opening
    try {
      await expect(popup).toHaveURL(url)
    } finally {
      await popup.close()
    }
    expect(await getSelectedNode(page)).toEqual(before)
  }
})

test('the light guide keeps its final example and settings action reachable in a narrow window', async () => {
  const { page } = editor
  const viewport = page.viewportSize()
  const initialGuide = await openCodeGuide()
  await initialGuide.getByRole('button', { name: 'Open MCP settings', exact: true }).click()
  await page.getByTestId('settings-section-general').click()
  const appearance = page.getByRole('region', { name: 'Appearance', exact: true })
  await appearance.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await page.getByTestId('app-settings-done').click()
  const guide = await openCodeGuide()
  await guide.screenshot({ path: repoPath('local-evidence/openpen-code-guide-light.png') })
  await page.setViewportSize({ width: 420, height: 700 })
  try {
    const finalPrompt = guide.locator('pre').last()
    await finalPrompt.scrollIntoViewIfNeeded()
    await expect(finalPrompt).toBeInViewport()
    await guide.screenshot({ path: repoPath('local-evidence/openpen-code-guide-narrow.png') })
    await guide.getByRole('button', { name: 'Open MCP settings', exact: true }).click()
    await expect(guide).not.toBeVisible()
    await expect(page.getByTestId('settings-mcp-panel')).toBeVisible()
    await page.getByTestId('app-settings-done').click()
  } finally {
    if (viewport) await page.setViewportSize(viewport)
  }
})
