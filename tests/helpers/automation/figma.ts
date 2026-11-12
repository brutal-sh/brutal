import { readFile } from 'node:fs/promises'

import { expect, type Page } from '@playwright/test'
import * as v from 'valibot'

import type { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

const groupResultSchema = v.object({
  ok: v.literal(true),
  result: v.object({
    id: v.string(),
    name: v.string(),
    children: v.array(v.object({ name: v.string(), width: v.number(), height: v.number() }))
  })
})

export async function createScriptGroup(page: Page) {
  const value = await page.evaluate(async () => {
    const request = window.openPencil?.test?.automation
    if (!request) throw new Error('Automation request handler unavailable')
    return request('eval', {
      code: `const first = figma.createRectangle();
first.name = 'First'; first.resize(120, 80); first.x = 40; first.y = 80;
const second = figma.createRectangle();
second.name = 'Second'; second.resize(120, 80); second.x = 200; second.y = 80;
const group = figma.group([first, second], figma.currentPage);
group.name = 'API group';
return { id: group.id, name: group.name, children: group.children.map(node => ({
  name: node.name, width: node.width, height: node.height
})) };`
    })
  })
  return v.parse(groupResultSchema, value).result
}

export async function saveAndReopenScriptGroup(canvas: CanvasHelper) {
  const page = canvas.page
  await page.evaluate(() => {
    window.showSaveFilePicker = undefined
    window.showOpenFilePicker = undefined
  })
  page.once('dialog', (dialog) => dialog.accept('api-group.pen'))
  const downloading = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const saved = await downloading
  expect(saved.suggestedFilename()).toBe('api-group.pen')
  const bytes = await readFile(await saved.path())
  await page.getByTestId('tabbar-close').click()
  await expect(page.getByRole('tab', { name: /api-group/ })).toHaveCount(0)
  const choosing = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await choosing
  ).setFiles({
    name: saved.suggestedFilename(),
    mimeType: 'application/json',
    buffer: bytes
  })
  await expect(page.getByRole('tab', { name: /api-group/ })).toBeVisible()
  await canvas.waitForInit()
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
}
