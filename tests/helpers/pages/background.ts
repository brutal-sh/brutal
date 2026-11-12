import type { Page } from '@playwright/test'

import type { Color } from '@open-pencil/scene-graph/primitives'

/** Open the real page default before CanvasHelper applies its fixture background. */
export async function openFreshPage(page: Page) {
  await page.goto('/?test')
  await page.getByTestId('canvas-element').and(page.locator('[data-ready="1"]')).waitFor()
  await page.locator('#loader').waitFor({ state: 'detached' })
}

export function pageBackgroundState(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return {
      color: { ...store.state.pageColor },
      pages: store.graph.getPages().length,
      canUndo: store.undo.canUndo,
      canRedo: store.undo.canRedo,
      dirty: store.hasUnsavedChanges()
    }
  })
}

export function setPageBackground(page: Page, color: Color) {
  return page.evaluate((background) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.setPageColor(background)
  }, color)
}
