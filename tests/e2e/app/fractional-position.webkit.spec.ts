import { readFile } from 'node:fs/promises'

import { expect, test, type Page } from '@playwright/test'

import { parsePenDocument, type PenNode } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import { getPageChildren, getSelectedIds, getSelectedNode } from '#tests/helpers/store'

const nodes: PenNode[] = [
  {
    id: 'position-main',
    name: 'Fractional position',
    type: 'rectangle',
    x: 12.5,
    y: 16.25,
    width: 120.5,
    height: 80.75,
    cornerRadius: 3.5,
    fill: '#7799BB'
  },
  {
    id: 'position-a',
    name: 'Close fraction A',
    type: 'rectangle',
    x: 12.341,
    y: 16.25,
    width: 20,
    height: 20,
    fill: '#7799BB'
  },
  {
    id: 'position-b',
    name: 'Close fraction B',
    type: 'rectangle',
    x: 12.342,
    y: 60.75,
    width: 20,
    height: 20,
    fill: '#7799BB'
  },
  {
    id: 'position-precise',
    name: 'Untouched precision',
    type: 'rectangle',
    x: 12.345678901234567,
    y: 200,
    width: 123.45678901234567,
    height: 50.125,
    fill: '#7799BB'
  }
]

async function openFixture(page: Page) {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'fractional-position.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: '2.21', children: nodes }))
  })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  const inspector = page.getByTestId('properties-panel')
  const row = (name: string) => page.getByTestId('layers-item').filter({ hasText: name })
  const fields = {
    x: inspector.getByRole('spinbutton', { name: 'X Axis', exact: true }),
    y: inspector.getByRole('spinbutton', { name: 'Y Axis', exact: true }),
    angle: inspector.getByRole('spinbutton', { name: 'Rotation', exact: true })
  }
  return { canvas, row, fields }
}

async function save(page: Page) {
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  return readFile(await (await download).path())
}

async function reopen(page: Page, bytes: Buffer) {
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'fractional-position-reopened.pen',
    mimeType: 'application/json',
    buffer: bytes
  })
  await new CanvasHelper(page).waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
}

test('opening formatted fields and accepting them retains untouched authored precision', async ({
  page
}) => {
  const { canvas, row, fields } = await openFixture(page)
  await row('Untouched precision').click()
  const width = page
    .getByTestId('properties-panel')
    .getByRole('spinbutton', { name: 'Width', exact: true })
  for (const [field, shown] of [
    [fields.x, '12.35'],
    [width, '123.46']
  ] as const) {
    await expect(field.locator('[data-slot="value"]')).toHaveText(shown)
    await field.dblclick()
    await expect(field).toHaveValue(shown)
    await field.press('Enter')
    expect(await getSelectedNode(page)).toMatchObject({
      x: 12.345678901234567,
      width: 123.45678901234567
    })
    await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  }
  canvas.assertNoErrors()
})

test('position fields retain authored fractions while showing the reference precision through history and reopen', async ({
  page
}) => {
  const { canvas, row, fields } = await openFixture(page)
  await row('Fractional position').click()
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('12.5')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('16.25')
  for (const [typed, shown] of [
    ['0.015', '0.02'],
    ['-0.015', '-0.01']
  ]) {
    await fields.x.dblclick()
    await fields.x.fill(typed)
    await fields.x.press('Enter')
    await expect(fields.x.locator('[data-slot="value"]')).toHaveText(shown)
    expect((await getSelectedNode(page))?.x).toBe(Number(typed))
    await canvas.undo()
    await expect(fields.x.locator('[data-slot="value"]')).toHaveText('12.5')
  }
  await fields.x.dblclick()
  await fields.x.fill('20.125')
  await fields.x.press('Enter')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('20.13')
  expect((await getSelectedNode(page))?.x).toBe(20.125)
  await canvas.undo()
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('12.5')
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await canvas.redo()
  await fields.y.dblclick()
  await fields.y.fill('30.375')
  await fields.y.press('Escape')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('16.25')
  await fields.y.dblclick()
  await fields.y.fill('30.375')
  await fields.y.press('Enter')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('30.38')
  await canvas.undo()
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('16.25')
  await canvas.redo()
  const bytes = await save(page)
  expect(
    parsePenDocument(bytes.toString()).children.find((node) => node.id === 'position-main')
  ).toMatchObject({ x: 20.125, y: 30.375, width: 120.5, height: 80.75 })
  await reopen(page, bytes)
  await row('Fractional position').click()
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('20.13')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('30.38')
  expect(await getSelectedNode(page)).toMatchObject({ x: 20.125, y: 30.375 })
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('20.13')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('30.38')
  canvas.assertNoErrors()
})

test('fractional rotation matches the measured reference bounds and serializes an equivalent corner placement', async ({
  page
}) => {
  const { canvas, row, fields } = await openFixture(page)
  await row('Fractional position').click()
  for (const [typed, shown] of [
    ['720.5', '0.5'],
    ['-720.5', '-0.5']
  ]) {
    await fields.angle.dblclick()
    await fields.angle.fill(typed)
    await fields.angle.press('Enter')
    await expect(fields.angle).toHaveAttribute('aria-valuenow', shown)
    await canvas.undo()
    await expect(fields.angle).toHaveAttribute('aria-valuenow', '0')
  }
  await fields.angle.dblclick()
  await fields.angle.fill('15.5')
  await fields.angle.press('Enter')
  await expect(fields.angle).toHaveAttribute('aria-valuenow', '15.5')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('3.9')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('1.62')
  await canvas.undo()
  await expect(fields.angle).toHaveAttribute('aria-valuenow', '0')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('12.5')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('16.25')
  await canvas.redo()
  const bytes = await save(page)
  const saved = parsePenDocument(bytes.toString()).children.find(
    (node) => node.id === 'position-main'
  )
  if (!saved) throw new Error('Missing saved rotated rectangle')
  expect(saved.x).toBeCloseTo(3.9015157600208568, 9)
  expect(saved.y).toBeCloseTo(33.81953261041678, 9)
  expect(saved.rotation).toBeCloseTo(15.5, 9)
  await reopen(page, bytes)
  await row('Fractional position').click()
  await expect(fields.angle).toHaveAttribute('aria-valuenow', '15.5')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('3.9')
  await expect(fields.y.locator('[data-slot="value"]')).toHaveText('1.62')
  canvas.assertNoErrors()
})

test('distinct close fractions remain mixed before formatting and retain each prior position through Undo', async ({
  page
}) => {
  const { canvas, row, fields } = await openFixture(page)
  await row('Close fraction A').click()
  await row('Close fraction B').click({ modifiers: ['Shift'] })
  expect(await getSelectedIds(page)).toBe(2)
  await expect(fields.x).toHaveAttribute('data-mixed')
  await expect(fields.y).toHaveAttribute('data-mixed')
  await fields.x.dblclick()
  await fields.x.fill('-4.125')
  await fields.x.press('Enter')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('-4.12')
  expect(
    (await getPageChildren(page))
      .filter((node) => ['position-a', 'position-b'].includes(node.id))
      .map((node) => node.x)
  ).toEqual([-4.125, -4.125])
  await canvas.undo()
  await expect(fields.x).toHaveAttribute('data-mixed')
  await fields.x.dblclick()
  await fields.x.fill('444.125')
  await fields.x.press('Enter')
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('444.13')
  const selectedNodes = async () =>
    (await getPageChildren(page)).filter((node) => ['position-a', 'position-b'].includes(node.id))
  expect((await selectedNodes()).map((node) => node.x)).toEqual([444.125, 444.125])
  await expect(fields.y).toHaveAttribute('data-mixed')
  await canvas.undo()
  await expect(fields.x).toHaveAttribute('data-mixed')
  expect((await selectedNodes()).map((node) => node.x)).toEqual([12.341, 12.342])
  await canvas.redo()
  await expect(fields.x.locator('[data-slot="value"]')).toHaveText('444.13')
  expect((await selectedNodes()).map((node) => node.x)).toEqual([444.125, 444.125])
  canvas.assertNoErrors()
})
