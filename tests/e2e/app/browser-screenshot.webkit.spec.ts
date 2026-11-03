import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import type { Rect } from '@open-pencil/scene-graph/primitives'

import { repoPath } from '#tests/helpers/paths'

import { expect, test } from '../fixtures'

const captureScript = await readFile(repoPath('desktop/src/network/browser/screenshot.js'), 'utf8')
const pickerScript = await readFile(repoPath('desktop/src/network/browser/picker.js'), 'utf8')
const fixture = `<!doctype html><title>Screenshot fixture</title><style>
html{scroll-behavior:smooth;scroll-snap-type:y proximity}body{margin:0;width:900px;height:2400px}
header{position:fixed;top:0;left:0;width:100%;height:30px;background:red;visibility:visible!important}
#target{position:absolute;left:40px;top:1800px;width:200px;height:100px;background:green}
</style><header>Fixed header</header><div id="target">Offscreen selection</div><input type="password" value="not-extracted">`

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 600 })
  await page.route('**/capture-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: fixture })
  )
  await page.goto('/capture-fixture')
  await page.addScriptTag({ content: captureScript })
  await page.addScriptTag({ content: pickerScript })
})

interface CaptureState {
  requestId: string
  box: Rect
  x: number
  y: number
  restored?: boolean
}
function command(
  page: Page,
  requestId: string,
  action: string,
  extra: Record<string, unknown> = {}
) {
  return page.evaluate<CaptureState>(
    `controlScreenshot(${JSON.stringify({ requestId, action, ...extra })})`
  )
}

test('full capture traverses the real scroll range and restores exact scroll and inline styles', async ({
  page
}) => {
  await page.evaluate(() => scrollTo({ left: 80, top: 150, behavior: 'instant' }))
  const initial = await page.evaluate(() => [scrollX, scrollY])
  const id = randomUUID()
  try {
    const state = await command(page, id, 'prepare', { scope: 'full' })
    expect(state.box).toEqual({ x: 0, y: 0, width: 900, height: 2400 })
    const end = await command(page, id, 'scroll', { x: 900, y: 2400, hideFixed: true })
    expect([end.x, end.y]).toEqual([500, 1800])
    await expect(page.locator('header')).toBeHidden()
    expect(JSON.stringify(end)).not.toContain('not-extracted')
    await expect(command(page, randomUUID(), 'restore')).rejects.toThrow('expired')
  } finally {
    await command(page, id, 'restore')
  }
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(initial)
  await expect(page.locator('header')).toBeVisible()
  expect(
    await page
      .locator('header')
      .evaluate((node) => [
        node.style.getPropertyValue('visibility'),
        node.style.getPropertyPriority('visibility')
      ])
  ).toEqual(['', ''])
  expect(await page.locator('html').evaluate((node) => node.getAttribute('style'))).toBe('')
})

test('visible capture retains its current scroll origin and restores only animations it paused', async ({
  page
}) => {
  const animations = await page.evaluateHandle(() => {
    const playing = document.body.animate([{ opacity: 1 }, { opacity: 0.9 }], {
      duration: 100000,
      iterations: Infinity
    })
    const paused = document.body.animate([{ opacity: 1 }, { opacity: 0.8 }], {
      duration: 100000,
      iterations: Infinity
    })
    paused.pause()
    scrollTo({ left: 60, top: 200, behavior: 'instant' })
    return { playing, paused }
  })
  const id = randomUUID()
  try {
    const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }))
    const state = await command(page, id, 'prepare', { scope: 'visible' })
    expect(state.box).toEqual({ ...before, width: 400, height: 600 })
    expect(
      await animations.evaluate(({ playing, paused }) => [playing.playState, paused.playState])
    ).toEqual(['paused', 'paused'])
    await expect(command(page, randomUUID(), 'prepare', { scope: 'full' })).rejects.toThrow(
      'already'
    )
  } finally {
    await command(page, id, 'restore')
    expect(
      await animations.evaluate(({ playing, paused }) => [playing.playState, paused.playState])
    ).toEqual(['running', 'paused'])
    await animations.evaluate(({ playing, paused }) => {
      playing.cancel()
      paused.cancel()
    })
    await animations.dispose()
  }
})

test('selected capture finds offscreen page bounds and refuses a removed target before restoration', async ({
  page
}) => {
  const id = randomUUID()
  await page.evaluate(`controlPicker(${JSON.stringify({ requestId: id, action: 'start' })})`)
  await page.getByText('Offscreen selection', { exact: true }).click()
  await page.evaluate(() => scrollTo({ left: 0, top: 0, behavior: 'instant' }))
  try {
    const state = await command(page, id, 'prepare', { scope: 'selected' })
    expect(state.box).toEqual({ x: 40, y: 1800, width: 200, height: 100 })
    const scrolled = await command(page, id, 'scroll', { x: 40, y: 1800 })
    expect(scrolled.y).toBe(1800)
    await page.locator('#target').evaluate((node) => node.remove())
    await expect(command(page, id, 'read')).rejects.toThrow('removed')
  } finally {
    await command(page, id, 'restore')
  }
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0])
})

test('clipped root falls back to the viewport and changed viewport still allows restoration', async ({
  page
}) => {
  await page.addStyleTag({ content: 'html{overflow:visible}body{overflow:hidden}' })
  const id = randomUUID()
  try {
    const state = await command(page, id, 'prepare', { scope: 'full' })
    expect(state.box.width).toBe(400)
    expect(state.box.height).toBe(600)
    await page.setViewportSize({ width: 500, height: 600 })
    await expect(command(page, id, 'read')).rejects.toThrow('size changed')
  } finally {
    expect((await command(page, id, 'restore')).restored).toBe(true)
  }
  await expect(command(page, id, 'read')).rejects.toThrow('expired')
})

test('fractional selected edges cover whole CSS pixels without a subpixel final slice', async ({
  page
}) => {
  await page.addStyleTag({
    content:
      'body{height:4000px}#target{left:40.25px;top:1800.25px;width:200.25px;height:1200.25px}'
  })
  const id = randomUUID()
  await page.evaluate(`controlPicker(${JSON.stringify({ requestId: id, action: 'start' })})`)
  await page.getByText('Offscreen selection', { exact: true }).click()
  try {
    const state = await command(page, id, 'prepare', { scope: 'selected' })
    expect(state.box).toEqual({ x: 40, y: 1800, width: 201, height: 1201 })
    await command(page, id, 'scroll', { x: 40, y: 2400 })
    await expect(command(page, id, 'read')).resolves.toMatchObject({ box: state.box })
  } finally {
    await command(page, id, 'restore')
  }
})

test('full-page preparation retains complete bounds for an explicit native size refusal', async ({
  page
}) => {
  await page.addStyleTag({ content: 'body{width:20000px;height:100px}' })
  const id = randomUUID()
  try {
    const state = await command(page, id, 'prepare', { scope: 'full' })
    expect(state.box.width).toBe(20000)
  } finally {
    await command(page, id, 'restore')
  }
})
