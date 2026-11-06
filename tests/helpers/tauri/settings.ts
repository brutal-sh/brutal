export async function chooseLocale(name: string): Promise<void> {
  await (await $('[data-test-id="settings-language"]')).click()
  await browser.keys('Space')
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
  if (await (await $('[role="listbox"]')).isExisting()) await browser.keys('Escape')
  const setup = await $('[data-test-id="ai-setup-dialog"]')
  if (await setup.isExisting()) {
    await browser.keys('Escape')
    await setup.waitForExist({ reverse: true })
  }
  const settings = await $('[data-test-id="app-settings-dialog"]')
  if (await settings.isExisting()) {
    await (await $('[data-test-id="settings-section-general"]')).click()
    await (await $('[data-test-id="app-settings-done"]')).click()
    await settings.waitForExist({ reverse: true })
  }
}
