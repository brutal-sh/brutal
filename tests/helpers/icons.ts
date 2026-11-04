import type { Page } from '@playwright/test'

export function getSelectedIconGeometry(page: Page) {
  return page.evaluate(() => {
    const editor = window.openPencil?.getStore?.()
    if (!editor) throw new Error('Editor unavailable')
    const id = [...editor.state.selectedIds][0]
    return id ? editor.graph.getChildren(id).map((path) => path.vectorNetwork) : []
  })
}
