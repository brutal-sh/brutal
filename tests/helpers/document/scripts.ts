import { expect, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const source = `/**
 * @schema 2.21
 * @input columns: number(min=1, max=5) = 3
 * @input ink: color = #34A878
 * @input caption: string = "Probe"
 * @input filled: boolean = true
 * @input distribution: enum("even", "alternate") = "even"
 */
return Array.from({length: Math.floor(pencil.input.columns)}, (_, index) => ({
  type: 'rectangle', name: pencil.input.caption + ' ' + (index + 1),
  x: index * pencil.width / pencil.input.columns,
  y: pencil.input.distribution === 'alternate' ? index % 2 * 10 : 0,
  width: pencil.width / pencil.input.columns - 6, height: pencil.height - 30,
  fill: pencil.input.filled ? pencil.input.ink : '#FFFFFF00'
}));`

export async function generated(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    return node && store
      ? {
          id: node.id,
          type: node.type,
          width: node.width,
          height: node.height,
          children: store.graph.getChildren(node.id).map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
            width: child.width,
            height: child.height,
            x: child.x,
            y: child.y,
            opacity: child.fills[0]?.opacity,
            color: child.fills[0]?.color
          }))
        }
      : null
  })
}

export async function exportScript(page: Page) {
  return page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node) throw new Error('No Script selected')
    const bytes = await store.renderExportImage([node.id], 1, 'PNG')
    if (!bytes) throw new Error('Script export did not produce an image')
    return Array.from(bytes)
  })
}

export async function chooseSource(page: Page, code = source) {
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose script file', exact: true }).click()
  await (
    await choosing
  ).setFiles({ name: 'probe.js', mimeType: 'text/javascript', buffer: Buffer.from(code) })
}

export async function create(page: Page) {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.getByRole('button', { name: 'Primitives', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Script', exact: true }).click()
  await canvas.click(300, 250)
  await expect(page.getByRole('textbox', { name: 'Script file', exact: true })).toBeVisible()
  await expect.poll(() => generated(page)).toMatchObject({ width: 200, height: 200 })
  await expect(page.getByRole('spinbutton', { name: 'Radius', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true'
  )
  return canvas
}
