import type * as AppTabs from '@/app/tabs'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup('/?test')

test('document tabs stay clickable across sidebar widths while the active document loads', async () => {
  const { page } = editor
  await page.evaluate(async () => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    tabs.getActiveStore().state.documentName = 'First document'
    tabs.createTab()
    const store = tabs.getActiveStore()
    store.state.documentName = 'Tshirt designs'
  })
  const handle = page.getByTestId('left-splitter-handle')
  async function resizeSidebar(target: number) {
    const bounds = await handle.boundingBox()
    if (!bounds) throw new Error('Missing sidebar splitter')
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(target, bounds.y + bounds.height / 2, { steps: 5 })
    await page.mouse.up()
    await expect
      .poll(async () => {
        const resized = await handle.boundingBox()
        return resized ? Math.abs(resized.x + resized.width / 2 - target) : Infinity
      })
      .toBeLessThan(5)
  }
  await resizeSidebar(288)
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editor store')
    store.preparationController.begin({
      kind: 'document-open',
      phase: 'resolving-fonts',
      subject: 'Tshirt designs.pen'
    })
  })
  const loader = page.getByTestId('canvas-loading')
  await expect(loader).toBeVisible()
  const close = page.getByTestId('tabbar-close').last()
  const add = page.getByTestId('tabbar-new')
  await add.click({ trial: true, timeout: 2000 })
  for (const target of [288, 328, 500]) {
    await resizeSidebar(target)
    await expect(loader).toBeVisible()
    await close.click({ trial: true, timeout: 2000 })
    await add.click({ trial: true, timeout: 2000 })
    if (target === 288)
      await page.screenshot({ path: test.info().outputPath('loading-sidebar.png') })
  }
  await add.click()
  await expect(page.getByTestId('tabbar-close')).toHaveCount(3)
})
