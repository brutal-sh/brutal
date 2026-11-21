import { expect, test } from '#tests/helpers/chat/fixture'

const cases = [
  {
    name: 'context-notes.txt',
    type: 'text/plain',
    text: 'Use the label Meadow and the accent #22c55e.\n'
  },
  {
    name: 'component.ts',
    type: 'text/typescript',
    text: 'export const title = "Meadow 🟢";\r\n// <script>throw new Error("reference only")</script>\n'
  }
]

for (const fixture of cases) {
  test(`the context picker delivers ${fixture.name} with an escaped history preview`, async ({
    configuredChat: chat
  }, info) => {
    const chooser = chat.page.waitForEvent('filechooser')
    await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
    await (
      await chooser
    ).setFiles({
      name: fixture.name,
      mimeType: fixture.type,
      buffer: Buffer.from(fixture.text)
    })
    await expect(chat.page.getByText(fixture.name, { exact: true })).toBeVisible()
    await chat.submit('Read the attached notes')
    await expect(chat.userMessage()).toContainText('Read the attached notes')
    await expect
      .poll(() => chat.page.locator('html').getAttribute('data-last-chat-request'))
      .toContain(JSON.stringify(fixture.text))
    await chat
      .userMessage()
      .getByRole('button', { name: `View attachment ${fixture.name}` })
      .click()
    const dialog = chat.page.getByRole('dialog')
    expect(await dialog.locator('pre').textContent()).toBe(fixture.text)
    await expect(dialog).toContainText(fixture.type)
    await chat.page.screenshot({
      path: info.outputPath('file-context-preview.png'),
      animations: 'disabled'
    })
  })
}

test('removing, cancelling and refusing a file preserves the composer', async ({
  configuredChat: chat
}) => {
  await chat.input.fill('Keep this draft')
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (
    await chooser
  ).setFiles({ name: 'remove.txt', mimeType: 'text/plain', buffer: Buffer.from('Removed context') })
  await chat.page.getByRole('button', { name: 'Remove attachment remove.txt' }).click()
  await expect(chat.page.getByText('remove.txt', { exact: true })).toHaveCount(0)
  const cancelled = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (await cancelled).setFiles([])
  const unsupported = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (
    await unsupported
  ).setFiles({
    name: 'unsupported.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7')
  })
  await expect(chat.page.locator('[data-slot="toast"]')).toContainText('UTF-8 text or source file')
  await expect(chat.input).toHaveText('Keep this draft')
  await chat.sendButton.click()
  await expect
    .poll(() => chat.page.locator('html').getAttribute('data-last-chat-request'))
    .toBe('Keep this draft')
})

test('a picked file cannot silently move into a different document', async ({
  configuredChat: chat
}) => {
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'first-document.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('First document only')
  })
  await expect(chat.page.getByText('first-document.txt', { exact: true })).toBeVisible()
  await chat.page.getByRole('button', { name: 'New design', exact: true }).click()
  await expect(chat.input).toBeVisible()
  await expect(chat.page.getByText('first-document.txt', { exact: true })).toHaveCount(0)
  await chat.submit('Second document request')
  await expect
    .poll(() => chat.page.locator('html').getAttribute('data-last-chat-request'))
    .toBe('Second document request')
})

test('a saved file preview survives reloading and reopening its conversation', async ({
  configuredChat: chat
}) => {
  const text = '  Saved reference 🟢\r\n<script>referenceOnly()</script>\n'
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'durable-reference.ts',
    mimeType: 'text/typescript',
    buffer: Buffer.from(text)
  })
  await expect(chat.page.getByText('durable-reference.ts', { exact: true })).toBeVisible()
  await chat.submit('Durable file context')
  await expect(chat.assistantMessage()).toBeVisible()
  await chat.page.getByRole('button', { name: 'New chat', exact: true }).first().click()
  await expect(chat.page.getByTestId('chat-message-user')).toHaveCount(0)
  await chat.page.reload()
  await chat.chatTab.click()
  await chat.page.getByRole('button', { name: 'Chat history', exact: true }).click()
  await chat.page.getByRole('button', { name: 'All documents', exact: true }).click()
  await chat.page.getByRole('button', { name: /Durable file context/ }).click()
  await chat
    .userMessage()
    .getByRole('button', { name: 'View attachment durable-reference.ts' })
    .click()
  expect(await chat.page.getByRole('dialog').locator('pre').textContent()).toBe(text)
  await expect(chat.page.getByRole('dialog')).toContainText('text/typescript')
})
