import { expect, test, type Page } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import {
  pickOwnedFile,
  readOwnedFile,
  saveOriginal,
  savePicker
} from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

const node = {
  id: 'versioned-rectangle',
  type: 'rectangle',
  name: 'Literal // name /* retained */',
  width: 64,
  height: 64,
  fill: '#2563eb'
}

async function writeFixture(page: Page, name: string, content: string): Promise<void> {
  await page.evaluate(
    async ({ name, content }) => {
      const directory = await navigator.storage.getDirectory()
      const file = await directory.getFileHandle(name, { create: true })
      const stream = await file.createWritable()
      await stream.write(content)
      await stream.close()
    },
    { name, content }
  )
}

async function openVersion(page: Page, version: string) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const name = `schema-${version}.pen`
  const content = `// Owned schema fixture\r\n${JSON.stringify({ version, children: [node] }).replace('"children"', '/* shape comment */ "children"')} // end`
  await writeFixture(page, name, content)
  const canvas = await pickOwnedFile(page, name)
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await expect(page.getByTestId('layers-item')).toContainText(node.name)
  return { name, canvas, original: new TextEncoder().encode(content) }
}

async function cancelSaveAs(page: Page): Promise<void> {
  const picker = await savePicker(page, null)
  try {
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  } finally {
    await picker.evaluate((restore) => restore())
    await picker.dispose()
  }
}

for (const version of ['2.7', '2.22']) {
  test(`commented schema ${version} saves the current format and reopens its editable layers`, async ({
    page
  }, info) => {
    const { name, canvas, original } = await openVersion(page, version)
    await page.getByTestId('layers-item').first().click()
    await canvas.duplicate()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    await canvas.undo()
    await expect(page.getByTestId('layers-item')).toHaveCount(1)
    await canvas.redo()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    await cancelSaveAs(page)
    expect(await readOwnedFile(page, name)).toEqual(original)
    await saveOriginal(page)
    const bytes = await readOwnedFile(page, name)
    await info.attach('saved-versioned-pen', {
      body: Buffer.from(bytes),
      contentType: 'application/json'
    })
    const saved = parsePenDocument(new TextDecoder().decode(bytes))
    expect(saved.version).toBe('2.22')
    expect(saved.children).toHaveLength(2)
    for (const child of saved.children)
      expect(child).toMatchObject({ type: 'rectangle', width: 64, height: 64 })
    expect(saved.children.some((child) => child.name === node.name)).toBe(true)
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Close tab/ }).click()
    await pickOwnedFile(page, name)
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
  })
}

test('a refused future schema preserves the active file, edits, recovery and save target', async ({
  page
}, info) => {
  const { name, canvas, original } = await openVersion(page, '2.22')
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await expect.poll(async () => (await recoveryBytes(page)).length).toBe(1)
  const backup = await recoveryBytes(page)
  const content = JSON.stringify({ version: '2.23', children: [node] })
  await writeFixture(page, 'future.pen', content)
  await pickOwnedFile(page, 'future.pen')
  await expect(page.locator('[data-slot="toast"]')).toContainText('2.23')
  expect(await recoveryBytes(page)).toEqual(backup)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  expect(await readOwnedFile(page, name)).toEqual(original)
  expect(new TextDecoder().decode(await readOwnedFile(page, 'future.pen'))).toBe(content)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await canvas.redo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await cancelSaveAs(page)
  expect(await readOwnedFile(page, name)).toEqual(original)
  await saveOriginal(page)
  const saved = parsePenDocument(new TextDecoder().decode(await readOwnedFile(page, name)))
  expect(saved.children).toHaveLength(2)
  expect(new TextDecoder().decode(await readOwnedFile(page, 'future.pen'))).toBe(content)
  await info.attach('version-refusal-boundaries', {
    body: JSON.stringify({ original: Array.from(original), saved, future: content }),
    contentType: 'application/json'
  })
})
