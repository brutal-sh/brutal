/** Close only the isolated runner's recovery offer, retaining its snapshot bytes. */
export async function settleNativeRecovery(): Promise<void> {
  await browser.waitUntil(
    () => browser.execute(() => Boolean(window.openPencil?.test?.recoveryReady)),
    { timeout: 30_000, timeoutMsg: 'Native recovery startup did not initialize' }
  )
  const result = await browser.executeAsync<{ failure?: string }, []>(async (done) => {
    const ready = window.openPencil?.test?.recoveryReady
    if (!ready) return done({ failure: 'Missing native recovery readiness' })
    try {
      await ready
      done({})
    } catch (reason) {
      done({ failure: String(reason) })
    }
  })
  if (result.failure) throw new Error(result.failure)
  await browser.waitUntil(
    () =>
      browser.execute(() => {
        const dialog = document.querySelector('[data-test-id="recovery-dialog"][data-state="open"]')
        if (!dialog) return true
        dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.click()
        return false
      }),
    { timeout: 30_000, timeoutMsg: 'Native recovery offer did not close' }
  )
}
