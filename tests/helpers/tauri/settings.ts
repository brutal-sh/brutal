export async function chooseLocale(name: string): Promise<void> {
  const trigger = await $('[data-test-id="settings-language"]')
  await trigger.waitForDisplayed()
  const open = (await trigger.getAttribute('aria-expanded')) === 'true'
  if (!open && (await trigger.getText()).trim() === name) return
  if (!open) {
    await trigger.click()
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await browser.keys('Space')
  }
  await (await $('[role="listbox"]')).waitForDisplayed()
  // Fixture setup targets the option; Enter still traverses the native WebView's UI handler.
  await browser.execute((language) => {
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element) => element.textContent?.trim() === language
    )
    if (!option) throw new Error(`Native locale option missing: ${language}`)
    option.focus()
  }, name)
  await browser.keys('Enter')
  await browser.waitUntil(
    async () => (await (await $('[data-test-id="settings-language"]')).getText()).includes(name),
    { timeoutMsg: `Native language did not change to ${name}` }
  )
}

export async function closeOwnedDialogs(): Promise<void> {
  const listbox = await $('[role="listbox"]')
  if (await listbox.isExisting()) {
    await browser.keys('Escape')
    await listbox.waitForExist({ reverse: true })
  }
  const setup = await $('[data-test-id="ai-setup-dialog"]')
  if (await setup.isExisting()) {
    await (await setup.$('[data-slot="dialog-close"]')).click()
    await setup.waitForExist({ reverse: true })
  }
  const settings = await $('[data-test-id="app-settings-dialog"]')
  if (await settings.isExisting()) {
    await (await $('[data-test-id="settings-section-general"]')).click()
    await (await $('[data-test-id="app-settings-done"]')).click()
    await settings.waitForExist({ reverse: true })
  }
}
