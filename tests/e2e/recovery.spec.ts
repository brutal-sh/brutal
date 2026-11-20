import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

test('keeps recovery independent from cancelling an unsaved-document close', async ({
  browser,
  baseURL
}) => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Brutal store not initialized')
    const id = store.createShape('RECTANGLE', 120, 120, 240, 140)
    await store.persistRecoveryNow()
    store.updateNode(id, { name: 'Retained recovery rectangle' })
    await store.persistRecoveryNow()
  })

  await page.keyboard.press('ControlOrMeta+t')
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  await page.getByRole('button', { name: 'Close Untitled', exact: true }).click()
  await expect(page.getByRole('alertdialog', { name: /Save changes to/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const request = indexedDB.open('open-pencil-recovery')
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        const transaction = database.transaction('meta')
        const countRequest = transaction.objectStore('meta').count()
        return new Promise<number>((resolve, reject) => {
          countRequest.onsuccess = () => resolve(countRequest.result)
          countRequest.onerror = () => reject(countRequest.error)
        })
      })
    )
    .toBe(1)

  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await expect(page.getByText('Retained recovery rectangle')).toBeVisible()

  await context.close()
})

test('Home Drafts refresh after undo and clean document close', async ({ page }) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.createShape('RECTANGLE', 100, 100, 100, 100)
    await store.persistRecoveryNow()
  })
  await page.getByRole('tab', { name: 'Home', exact: true }).click()
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('tab', { name: 'Drafts', exact: true }).click()
  await expect(home.getByRole('button', { name: /^Untitled / })).toHaveCount(1)
  await page.getByRole('tab', { name: /^Untitled/ }).click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
  await page.getByTestId('tabbar-close').click()
  await expect(home.getByText('No drafts yet', { exact: true })).toBeVisible()
  await expect(home.getByRole('button', { name: /^Untitled / })).toHaveCount(0)
})
