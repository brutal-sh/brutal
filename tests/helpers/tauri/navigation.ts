/** Keep the chosen native window selected when its JavaScript realm is replaced. */
export async function reloadNativeEditor(): Promise<void> {
  const handle = await browser.getWindowHandle()
  const origin = await browser.execute(() => performance.timeOrigin)
  await browser.refresh()
  await browser.switchToWindow(handle)
  await browser.waitUntil(
    () => browser.execute((before) => performance.timeOrigin !== before, origin),
    { timeoutMsg: 'Native reload did not replace the document' }
  )
}
